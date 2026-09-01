import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import {
  SQL,
  and,
  asc,
  desc,
  eq,
  ilike,
  inArray,
  isNull,
  max,
  or,
  sql,
} from "drizzle-orm";
import { AuthUser } from "../common/types/auth-user";
import { DatabaseService } from "../database/database.service";
import {
  auditLogs,
  ingredientCategories,
  ingredients,
  menuCategories,
  menus,
  menuVariantOutletSettings,
  menuVariants,
  outlets,
  recipeCostingLines,
  recipeCostingRuns,
  recipeHeaders,
  recipeItems,
  recipes,
  stockBatches,
  supplierIngredients,
  suppliers,
  tenants,
  units,
} from "../database/schema";
import { UnitConversionResolver } from "../units/unit-conversion-resolver.service";
import { EffectivePriceService } from "../menu-products/effective-price.service";
import { InventoryValuationService } from "../inventory/inventory-valuation.service";
import { ArchiveRecipeDto, ListRecipesDto } from "./dto/recipe-actions.dto";
import { CreateRecipeDto } from "./dto/create-recipe.dto";
import { RecipeItemDto } from "./dto/recipe-item.dto";
import { UpdateRecipeDto } from "./dto/update-recipe.dto";
import {
  calculateRecipeMetrics,
  decimal,
  divide,
  formatDecimal,
  multiply,
  multiplyScaled,
  RECIPE_SCALES,
} from "./recipe-decimal";
import { redactRecipeCosts } from "./recipe-visibility";

@Injectable()
export class RecipesService {
  constructor(
    private readonly database: DatabaseService,
    private readonly valuation: InventoryValuationService,
    private readonly effectivePrice: EffectivePriceService,
    private readonly conversions: UnitConversionResolver,
  ) {}

  async list(actor: AuthUser, query: ListRecipesDto) {
    if (query.outletId) await this.assertOutlet(actor, query.outletId);
    const conditions: SQL[] = [eq(recipeHeaders.tenantId, actor.tenantId)];
    if (query.status === "archived")
      conditions.push(eq(recipeHeaders.isArchived, true));
    else if (query.status)
      conditions.push(
        eq(recipes.status, query.status as "draft" | "approved" | "archived"),
      );
    else conditions.push(eq(recipeHeaders.isArchived, false));
    if (query.search)
      conditions.push(
        or(
          ilike(recipeHeaders.code, `%${query.search}%`),
          ilike(recipeHeaders.name, `%${query.search}%`),
          ilike(menus.name, `%${query.search}%`),
        )!,
      );
    const rows = await this.database.db
      .select({
        id: recipeHeaders.id,
        code: recipeHeaders.code,
        name: recipeHeaders.name,
        isArchived: recipeHeaders.isArchived,
        menuName: menus.name,
        variantName: menuVariants.name,
        versionId: sql<
          string | null
        >`coalesce((select rd.id from recipes rd where rd.recipe_header_id = ${recipeHeaders.id} and rd.status = 'draft' order by rd.version_no desc limit 1), ${recipes.id})`,
        versionNo: sql<
          number | null
        >`coalesce((select rd.version_no from recipes rd where rd.recipe_header_id = ${recipeHeaders.id} and rd.status = 'draft' order by rd.version_no desc limit 1), ${recipes.versionNo})`,
        status: sql<
          string | null
        >`coalesce((select rd.status::text from recipes rd where rd.recipe_header_id = ${recipeHeaders.id} and rd.status = 'draft' order by rd.version_no desc limit 1), ${recipes.status}::text)`,
        costingComplete: sql<
          boolean | null
        >`coalesce((select rd.costing_complete from recipes rd where rd.recipe_header_id = ${recipeHeaders.id} and rd.status = 'draft' order by rd.version_no desc limit 1), ${recipes.costingComplete})`,
        approvedOutletId: recipes.approvedOutletId,
        approvedOutletName: outlets.name,
        calculatedAt: recipeCostingRuns.calculatedAt,
        totalRecipeCost: recipeCostingRuns.totalRecipeCost,
        costPerServing: recipeCostingRuns.costPerServing,
        foodCostPercentage: recipeCostingRuns.foodCostPercentage,
        grossProfit: recipeCostingRuns.grossProfit,
        grossMarginPercentage: recipeCostingRuns.grossMarginPercentage,
      })
      .from(recipeHeaders)
      .innerJoin(menuVariants, eq(menuVariants.id, recipeHeaders.menuVariantId))
      .innerJoin(menus, eq(menus.id, menuVariants.menuId))
      .leftJoin(recipes, eq(recipes.id, recipeHeaders.currentApprovedVersionId))
      .leftJoin(
        recipeCostingRuns,
        eq(recipeCostingRuns.id, recipes.approvedCostingRunId),
      )
      .leftJoin(outlets, eq(outlets.id, recipes.approvedOutletId))
      .where(and(...conditions))
      .orderBy(asc(recipeHeaders.name));
    return this.redact(actor, rows);
  }

  async lookups(actor: AuthUser, outletId?: string) {
    const outletCondition: SQL[] = [
      eq(outlets.tenantId, actor.tenantId),
      eq(outlets.isActive, true),
      isNull(outlets.deletedAt),
    ];
    if (actor.outletIds.length)
      outletCondition.push(inArray(outlets.id, actor.outletIds));
    if (outletId) await this.assertOutlet(actor, outletId);
    const [variantRows, ingredientRows, unitRows, outletRows] =
      await Promise.all([
        outletId
          ? this.database.db
              .select({
                id: menuVariants.id,
                code: menuVariants.code,
                name: menuVariants.name,
                outletId: menuVariantOutletSettings.outletId,
                sellingPrice: sql<string>`coalesce(${menuVariantOutletSettings.priceOverride}, ${menuVariants.sellingPrice})`,
                menuName: menus.name,
              })
              .from(menuVariantOutletSettings)
              .innerJoin(
                menuVariants,
                eq(menuVariants.id, menuVariantOutletSettings.menuVariantId),
              )
              .innerJoin(menus, eq(menus.id, menuVariants.menuId))
              .innerJoin(
                menuCategories,
                eq(menuCategories.id, menus.categoryId),
              )
              .where(
                and(
                  eq(menuVariantOutletSettings.tenantId, actor.tenantId),
                  eq(menuVariantOutletSettings.outletId, outletId),
                  eq(menuVariantOutletSettings.isActive, true),
                  eq(menuVariantOutletSettings.isAvailable, true),
                  eq(menuVariants.isActive, true),
                  isNull(menuVariants.deletedAt),
                  eq(menus.isActive, true),
                  isNull(menus.deletedAt),
                  eq(menuCategories.isActive, true),
                ),
              )
          : Promise.resolve([]),
        this.database.db
          .select({
            id: ingredients.id,
            sku: ingredients.sku,
            name: ingredients.name,
            baseUnitId: ingredients.baseUnitId,
            baseUnitCode: units.code,
            dimension: units.dimension,
          })
          .from(ingredients)
          .innerJoin(units, eq(units.id, ingredients.baseUnitId))
          .where(
            and(
              eq(ingredients.tenantId, actor.tenantId),
              eq(ingredients.isActive, true),
              isNull(ingredients.deletedAt),
            ),
          ),
        this.database.db
          .select({
            id: units.id,
            code: units.code,
            name: units.name,
            dimension: units.dimension,
          })
          .from(units)
          .where(
            and(
              eq(units.tenantId, actor.tenantId),
              eq(units.isActive, true),
              isNull(units.deletedAt),
            ),
          ),
        this.database.db
          .select({ id: outlets.id, code: outlets.code, name: outlets.name })
          .from(outlets)
          .where(and(...outletCondition)),
      ]);
    return this.redact(actor, {
      menuVariants: variantRows,
      ingredients: ingredientRows,
      units: unitRows,
      outlets: outletRows,
    });
  }

  async get(actor: AuthUser, headerId: string, outletId?: string) {
    const [header] = await this.database.db
      .select({ header: recipeHeaders, menu: menus, variant: menuVariants })
      .from(recipeHeaders)
      .innerJoin(menuVariants, eq(menuVariants.id, recipeHeaders.menuVariantId))
      .innerJoin(menus, eq(menus.id, menuVariants.menuId))
      .where(
        and(
          eq(recipeHeaders.id, headerId),
          eq(recipeHeaders.tenantId, actor.tenantId),
        ),
      )
      .limit(1);
    if (!header) throw new NotFoundException("Recipe tidak ditemukan.");
    const versions = await this.database.db
      .select()
      .from(recipes)
      .where(
        and(
          eq(recipes.recipeHeaderId, headerId),
          eq(recipes.tenantId, actor.tenantId),
        ),
      )
      .orderBy(desc(recipes.versionNo));
    const selected =
      versions.find((row) => row.status === "draft") ??
      versions.find(
        (row) => row.id === header.header.currentApprovedVersionId,
      ) ??
      versions[0];
    const items = selected
      ? await this.database.db
          .select({
            item: recipeItems,
            ingredientName: ingredients.name,
            ingredientSku: ingredients.sku,
            unitCode: units.code,
            baseUnitCode: sql<string>`base_unit.code`,
          })
          .from(recipeItems)
          .innerJoin(ingredients, eq(ingredients.id, recipeItems.ingredientId))
          .innerJoin(units, eq(units.id, recipeItems.unitId))
          .innerJoin(
            sql`${units} base_unit`,
            sql`base_unit.id = ${ingredients.baseUnitId}`,
          )
          .where(
            and(
              eq(recipeItems.recipeId, selected.id),
              eq(recipeItems.tenantId, actor.tenantId),
            ),
          )
          .orderBy(asc(recipeItems.lineNo))
      : [];
    let costing = null;
    if (selected) {
      const chosenOutlet = outletId ?? selected.approvedOutletId;
      if (chosenOutlet) {
        await this.assertOutlet(actor, chosenOutlet);
        [costing] = await this.database.db
          .select()
          .from(recipeCostingRuns)
          .where(
            and(
              eq(recipeCostingRuns.tenantId, actor.tenantId),
              eq(recipeCostingRuns.recipeId, selected.id),
              eq(recipeCostingRuns.outletId, chosenOutlet),
            ),
          )
          .orderBy(desc(recipeCostingRuns.calculatedAt))
          .limit(1);
      }
    }
    const costingDetail = costing
      ? await this.costingDetail(actor, costing.id)
      : null;
    return this.redact(actor, {
      ...header,
      versions,
      selectedVersion: selected,
      items,
      costing: costingDetail,
    });
  }

  async versions(actor: AuthUser, headerId: string) {
    await this.header(actor, headerId);
    return this.database.db
      .select()
      .from(recipes)
      .where(
        and(
          eq(recipes.recipeHeaderId, headerId),
          eq(recipes.tenantId, actor.tenantId),
        ),
      )
      .orderBy(desc(recipes.versionNo));
  }

  async costing(actor: AuthUser, headerId: string, outletId: string) {
    await this.assertOutlet(actor, outletId);
    const detail = await this.get(actor, headerId, outletId);
    return detail.costing;
  }

  async create(actor: AuthUser, dto: CreateRecipeDto) {
    const code = dto.code.trim().toUpperCase();
    const exists = await this.database.db
      .select({ id: recipeHeaders.id })
      .from(recipeHeaders)
      .where(
        and(
          eq(recipeHeaders.tenantId, actor.tenantId),
          or(
            eq(recipeHeaders.code, code),
            eq(recipeHeaders.menuVariantId, dto.menuVariantId),
          )!,
        ),
      )
      .limit(1);
    if (exists.length)
      throw new ConflictException(
        "Kode atau menu variant sudah memiliki recipe.",
      );
    const prepared = await this.prepare(actor, dto);
    const result = await this.database.db.transaction(async (tx) => {
      const [header] = await tx
        .insert(recipeHeaders)
        .values({
          tenantId: actor.tenantId,
          code,
          name: dto.name.trim(),
          menuVariantId: dto.menuVariantId,
          createdBy: actor.userId,
          updatedBy: actor.userId,
        })
        .returning();
      const [version] = await tx
        .insert(recipes)
        .values({
          tenantId: actor.tenantId,
          recipeHeaderId: header.id,
          menuVariantId: dto.menuVariantId,
          versionNo: 1,
          yieldQty: dto.yieldQuantity,
          yieldUnitId: dto.yieldUnitId,
          servingCount: dto.servingCount,
          servingSize: dto.servingSize,
          servingUnitId: dto.servingUnitId,
          notes: dto.notes,
          productionInstructions: dto.productionInstructions,
          createdBy: actor.userId,
          updatedBy: actor.userId,
        })
        .returning();
      await tx
        .insert(recipeItems)
        .values(
          prepared.map((line, index) =>
            this.itemValues(actor, version.id, index + 1, line),
          ),
        );
      await tx.insert(auditLogs).values({
        tenantId: actor.tenantId,
        actorUserId: actor.userId,
        action: "recipe.create",
        entityType: "recipe_header",
        entityId: header.id,
        afterData: { versionId: version.id, code },
      });
      return header;
    });
    return this.get(actor, result.id);
  }

  async updateDraft(actor: AuthUser, headerId: string, dto: UpdateRecipeDto) {
    const draft = await this.draft(actor, headerId);
    const merged = {
      menuVariantId: draft.menuVariantId,
      yieldQuantity: dto.yieldQuantity ?? draft.yieldQty,
      servingCount: dto.servingCount ?? draft.servingCount,
      servingSize: dto.servingSize ?? draft.servingSize,
      items: dto.items ?? (await this.itemsAsDto(actor.tenantId, draft.id)),
    };
    const prepared = await this.prepare(actor, merged);
    await this.database.db.transaction(async (tx) => {
      await tx
        .update(recipeHeaders)
        .set({
          name: dto.name?.trim(),
          updatedBy: actor.userId,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(recipeHeaders.id, headerId),
            eq(recipeHeaders.tenantId, actor.tenantId),
          ),
        );
      const changes: Partial<typeof recipes.$inferInsert> = {
        costingComplete: false,
        costingCalculatedAt: null,
        lockVersion: draft.lockVersion + 1,
        updatedBy: actor.userId,
        updatedAt: new Date(),
      };
      if (dto.yieldQuantity !== undefined) changes.yieldQty = dto.yieldQuantity;
      if (dto.yieldUnitId !== undefined) changes.yieldUnitId = dto.yieldUnitId;
      if (dto.servingCount !== undefined)
        changes.servingCount = dto.servingCount;
      if (dto.servingSize !== undefined) changes.servingSize = dto.servingSize;
      if (dto.servingUnitId !== undefined)
        changes.servingUnitId = dto.servingUnitId;
      if (dto.notes !== undefined) changes.notes = dto.notes;
      if (dto.productionInstructions !== undefined)
        changes.productionInstructions = dto.productionInstructions;
      await tx
        .update(recipes)
        .set(changes)
        .where(and(eq(recipes.id, draft.id), eq(recipes.status, "draft")));
      if (dto.items) {
        await tx.delete(recipeItems).where(eq(recipeItems.recipeId, draft.id));
        await tx
          .insert(recipeItems)
          .values(
            prepared.map((line, index) =>
              this.itemValues(actor, draft.id, index + 1, line),
            ),
          );
      }
      await tx.insert(auditLogs).values({
        tenantId: actor.tenantId,
        actorUserId: actor.userId,
        action: "recipe.update_draft",
        entityType: "recipe",
        entityId: draft.id,
        afterData: dto,
      });
    });
    return this.get(actor, headerId);
  }

  async recalculate(actor: AuthUser, headerId: string, outletId: string) {
    await this.assertOutlet(actor, outletId);
    const draft = await this.draft(actor, headerId);
    const runId = await this.database.db.transaction(async (tx) =>
      this.calculate(tx, actor, draft.id, outletId, "estimate"),
    );
    return this.costingDetail(actor, runId);
  }

  async approve(actor: AuthUser, headerId: string, outletId: string) {
    await this.assertOutlet(actor, outletId);
    const runId = await this.database.db.transaction(async (tx) => {
      await tx.execute(
        sql`select id from recipe_headers where id = ${headerId} and tenant_id = ${actor.tenantId} for update`,
      );
      const [draft] = await tx
        .select()
        .from(recipes)
        .where(
          and(
            eq(recipes.recipeHeaderId, headerId),
            eq(recipes.tenantId, actor.tenantId),
            eq(recipes.status, "draft"),
          ),
        )
        .limit(1);
      if (!draft)
        throw new ConflictException(
          "Draft recipe tidak ditemukan atau sudah diproses.",
        );
      const [variant] = await tx
        .select()
        .from(menuVariants)
        .where(
          and(
            eq(menuVariants.id, draft.menuVariantId),
            eq(menuVariants.tenantId, actor.tenantId),
          ),
        )
        .limit(1);
      if (!variant || !variant.isActive || variant.deletedAt)
        throw new BadRequestException("Menu variant tidak aktif.");
      const costingRunId = await this.calculate(
        tx,
        actor,
        draft.id,
        outletId,
        "approval_snapshot",
      );
      const [run] = await tx
        .select()
        .from(recipeCostingRuns)
        .where(eq(recipeCostingRuns.id, costingRunId));
      if (run.status !== "complete")
        throw new UnprocessableEntityException({
          code: "RECIPE_COST_INCOMPLETE",
          message:
            "Recipe belum dapat disetujui karena terdapat cost yang belum lengkap.",
          details: run.warningCodes,
        });
      await tx
        .update(recipes)
        .set({
          status: "archived",
          effectiveUntil: new Date(),
          updatedAt: new Date(),
          updatedBy: actor.userId,
        })
        .where(
          and(
            eq(recipes.recipeHeaderId, headerId),
            eq(recipes.status, "approved"),
          ),
        );
      const approved = await tx
        .update(recipes)
        .set({
          status: "approved",
          approvedAt: new Date(),
          approvedBy: actor.userId,
          approvedOutletId: outletId,
          approvedCostingRunId: costingRunId,
          costingComplete: true,
          costingCalculatedAt: run.calculatedAt,
          updatedAt: new Date(),
          updatedBy: actor.userId,
        })
        .where(
          and(
            eq(recipes.id, draft.id),
            eq(recipes.status, "draft"),
            eq(recipes.lockVersion, draft.lockVersion),
          ),
        )
        .returning({ id: recipes.id });
      if (approved.length !== 1)
        throw new ConflictException(
          "Recipe berubah saat approval. Muat ulang lalu coba lagi.",
        );
      await tx
        .update(recipeHeaders)
        .set({
          currentApprovedVersionId: draft.id,
          updatedAt: new Date(),
          updatedBy: actor.userId,
        })
        .where(eq(recipeHeaders.id, headerId));
      await tx.insert(auditLogs).values({
        tenantId: actor.tenantId,
        outletId,
        actorUserId: actor.userId,
        action: "recipe.approve",
        entityType: "recipe",
        entityId: draft.id,
        afterData: { costingRunId, outletId },
      });
      return costingRunId;
    });
    return this.costingDetail(actor, runId);
  }

  async revise(actor: AuthUser, headerId: string, reason: string) {
    const [header] = await this.database.db
      .select()
      .from(recipeHeaders)
      .where(
        and(
          eq(recipeHeaders.id, headerId),
          eq(recipeHeaders.tenantId, actor.tenantId),
          eq(recipeHeaders.isArchived, false),
        ),
      )
      .limit(1);
    if (!header?.currentApprovedVersionId)
      throw new BadRequestException("Approved version tidak tersedia.");
    const [source] = await this.database.db
      .select()
      .from(recipes)
      .where(eq(recipes.id, header.currentApprovedVersionId));
    const existingDraft = await this.database.db
      .select({ id: recipes.id })
      .from(recipes)
      .where(
        and(eq(recipes.recipeHeaderId, headerId), eq(recipes.status, "draft")),
      )
      .limit(1);
    if (existingDraft.length)
      throw new ConflictException("Recipe sudah memiliki draft revision.");
    const newId = await this.database.db.transaction(async (tx) => {
      await tx.execute(
        sql`select id from recipe_headers where id = ${headerId} for update`,
      );
      const [latest] = await tx
        .select({ value: max(recipes.versionNo) })
        .from(recipes)
        .where(eq(recipes.recipeHeaderId, headerId));
      const [created] = await tx
        .insert(recipes)
        .values({
          ...this.cloneVersion(source),
          id: undefined,
          versionNo: Number(latest.value ?? 0) + 1,
          status: "draft",
          revisionOfId: source.id,
          revisionReason: reason,
          approvedAt: null,
          approvedBy: null,
          approvedOutletId: null,
          approvedCostingRunId: null,
          costingComplete: false,
          costingCalculatedAt: null,
          isLegacy: false,
          createdAt: new Date(),
          createdBy: actor.userId,
          updatedAt: new Date(),
          updatedBy: actor.userId,
        })
        .returning();
      const sourceItems = await tx
        .select()
        .from(recipeItems)
        .where(eq(recipeItems.recipeId, source.id));
      await tx.insert(recipeItems).values(
        sourceItems.map(
          ({
            id: _id,
            recipeId: _recipeId,
            createdAt: _createdAt,
            updatedAt: _updatedAt,
            ...line
          }) => ({
            ...line,
            recipeId: created.id,
            createdAt: new Date(),
            createdBy: actor.userId,
            updatedAt: new Date(),
            updatedBy: actor.userId,
          }),
        ),
      );
      await tx.insert(auditLogs).values({
        tenantId: actor.tenantId,
        actorUserId: actor.userId,
        action: "recipe.revise",
        entityType: "recipe",
        entityId: created.id,
        reason,
        afterData: { revisionOfId: source.id },
      });
      return created.id;
    });
    return this.get(actor, headerId);
  }

  async archive(actor: AuthUser, headerId: string, dto: ArchiveRecipeDto) {
    const updated = await this.database.db
      .update(recipeHeaders)
      .set({
        isArchived: true,
        archivedAt: new Date(),
        archivedBy: actor.userId,
        archiveReason: dto.reason,
        updatedAt: new Date(),
        updatedBy: actor.userId,
      })
      .where(
        and(
          eq(recipeHeaders.id, headerId),
          eq(recipeHeaders.tenantId, actor.tenantId),
          eq(recipeHeaders.isArchived, false),
        ),
      )
      .returning();
    if (!updated.length)
      throw new NotFoundException("Recipe aktif tidak ditemukan.");
    await this.database.db.insert(auditLogs).values({
      tenantId: actor.tenantId,
      actorUserId: actor.userId,
      action: "recipe.archive",
      entityType: "recipe_header",
      entityId: headerId,
      reason: dto.reason,
    });
    return { archived: true };
  }

  async activate(actor: AuthUser, headerId: string) {
    const [header] = await this.database.db
      .select()
      .from(recipeHeaders)
      .where(
        and(
          eq(recipeHeaders.id, headerId),
          eq(recipeHeaders.tenantId, actor.tenantId),
          eq(recipeHeaders.isArchived, true),
        ),
      )
      .limit(1);
    if (!header?.currentApprovedVersionId)
      throw new BadRequestException(
        "Recipe tidak memiliki approved version yang valid.",
      );
    await this.database.db
      .update(recipeHeaders)
      .set({
        isArchived: false,
        archivedAt: null,
        archivedBy: null,
        archiveReason: null,
        updatedAt: new Date(),
        updatedBy: actor.userId,
      })
      .where(eq(recipeHeaders.id, headerId));
    await this.database.db.insert(auditLogs).values({
      tenantId: actor.tenantId,
      actorUserId: actor.userId,
      action: "recipe.activate",
      entityType: "recipe_header",
      entityId: headerId,
    });
    return { active: true };
  }

  async audit(actor: AuthUser, headerId: string) {
    await this.header(actor, headerId);
    return this.database.db
      .select()
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.tenantId, actor.tenantId),
          or(
            and(
              eq(auditLogs.entityType, "recipe_header"),
              eq(auditLogs.entityId, headerId),
            ),
            eq(auditLogs.entityType, "recipe"),
          )!,
        ),
      )
      .orderBy(desc(auditLogs.occurredAt))
      .limit(100);
  }

  private async calculate(
    tx: any,
    actor: AuthUser,
    recipeId: string,
    outletId: string,
    runType: "estimate" | "approval_snapshot",
  ) {
    const [context] = await tx
      .select({ recipe: recipes, variant: menuVariants, tenant: tenants })
      .from(recipes)
      .innerJoin(menuVariants, eq(menuVariants.id, recipes.menuVariantId))
      .innerJoin(tenants, eq(tenants.id, recipes.tenantId))
      .where(
        and(eq(recipes.id, recipeId), eq(recipes.tenantId, actor.tenantId)),
      )
      .limit(1);
    if (!context)
      throw new NotFoundException("Recipe version tidak ditemukan.");
    const lines = await tx
      .select({
        item: recipeItems,
        ingredient: ingredients,
        unit: units,
        baseUnitCode: sql<string>`bu.code`,
      })
      .from(recipeItems)
      .innerJoin(ingredients, eq(ingredients.id, recipeItems.ingredientId))
      .innerJoin(units, eq(units.id, recipeItems.unitId))
      .innerJoin(sql`${units} bu`, sql`bu.id = ${ingredients.baseUnitId}`)
      .where(
        and(
          eq(recipeItems.recipeId, recipeId),
          eq(recipeItems.tenantId, actor.tenantId),
        ),
      )
      .orderBy(asc(recipeItems.lineNo));
    if (!lines.length)
      throw new UnprocessableEntityException(
        "Recipe harus memiliki ingredient.",
      );
    const now = new Date();
    const warningCodes: string[] = [];
    const costingLines: any[] = [];
    const internalCosts: bigint[] = [];
    for (const row of lines) {
      const item = row.item;
      if (!item.baseQuantity || !item.conversionToBase) {
        warningCodes.push(`UNIT_CONVERSION_MISSING:${item.id}`);
        costingLines.push(
          this.missingLine(
            actor,
            row,
            context.tenant.currencyCode,
            "UNIT_CONVERSION_MISSING",
          ),
        );
        continue;
      }
      const inventory = await this.valuation.ingredientCost(
        actor.tenantId,
        outletId,
        item.ingredientId,
        tx,
      );
      let source = "inventory_weighted_average",
        cost = inventory?.costPerBaseUnit ?? null,
        supplierCatalog = null,
        supplierAt = null,
        warning = null;
      if (!cost) {
        [supplierCatalog] = await tx
          .select()
          .from(supplierIngredients)
          .innerJoin(
            suppliers,
            eq(suppliers.id, supplierIngredients.supplierId),
          )
          .where(
            and(
              eq(supplierIngredients.tenantId, actor.tenantId),
              eq(supplierIngredients.ingredientId, item.ingredientId),
              eq(supplierIngredients.isPreferred, true),
              eq(supplierIngredients.isActive, true),
              isNull(supplierIngredients.deletedAt),
              eq(suppliers.isActive, true),
              isNull(suppliers.deletedAt),
            ),
          )
          .orderBy(desc(supplierIngredients.updatedAt))
          .limit(1);
        const catalog = supplierCatalog?.supplier_ingredients;
        if (
          catalog?.lastPrice &&
          catalog.currencyCode === context.tenant.currencyCode
        ) {
          source = "preferred_supplier";
          cost = formatDecimal(
            divide(
              decimal(catalog.lastPrice, 6),
              decimal(catalog.conversionToBase, 6),
              6,
              6,
            ),
            6,
          );
          supplierAt = catalog.updatedAt;
          supplierCatalog = catalog;
        } else {
          source = "missing";
          warning =
            catalog && catalog.currencyCode !== context.tenant.currencyCode
              ? "SUPPLIER_CURRENCY_MISMATCH"
              : "INGREDIENT_COST_MISSING";
          warningCodes.push(`${warning}:${item.id}`);
        }
      }
      let totalCost: string | null = null;
      if (cost) {
        const raw = multiply(
          decimal(item.baseQuantity, 6),
          decimal(cost, 6),
          6,
          12,
        );
        internalCosts.push(raw);
        totalCost = formatDecimal(
          multiply(decimal(item.baseQuantity, 6), decimal(cost, 6), 6, 2),
          2,
        );
      }
      costingLines.push({
        tenantId: actor.tenantId,
        recipeItemId: item.id,
        ingredientId: item.ingredientId,
        lineNo: item.lineNo,
        ingredientSkuSnapshot: row.ingredient.sku,
        ingredientNameSnapshot: row.ingredient.name,
        unitCodeSnapshot: row.unit.code,
        baseUnitCodeSnapshot: row.baseUnitCode,
        netQuantity: item.netQuantity,
        wastePercentage: item.wastePercentage,
        grossQuantity: item.grossQuantity,
        conversionToBase: item.conversionToBase,
        baseQuantity: item.baseQuantity,
        costSource: source,
        costPerBaseUnit: cost,
        totalCost,
        currencyCode: context.tenant.currencyCode,
        inventorySourceAt: inventory?.sourceAt,
        inventoryBatchIds: inventory?.batchIds,
        supplierCatalogId: supplierCatalog?.id,
        supplierSourceAt: supplierAt,
        warningCode: warning,
      });
    }
    const resolvedPrice = await this.effectivePrice.resolve(
      actor.tenantId,
      context.variant.id,
      outletId,
      tx,
    );
    const price = resolvedPrice.sellingPrice;
    if (price === null || decimal(price, 2) === 0n)
      warningCodes.push(
        price === null ? "SELLING_PRICE_MISSING" : "SELLING_PRICE_ZERO",
      );
    const complete = costingLines.every(
      (line) => line.costSource !== "missing",
    );
    const metrics = complete
      ? calculateRecipeMetrics({
          lineCostsInternal: internalCosts,
          internalScale: 12,
          yieldQuantity: context.recipe.yieldQty,
          servingCount: context.recipe.servingCount,
          sellingPrice: price,
        })
      : {
          totalRecipeCost: null,
          costPerYield: null,
          costPerServing: null,
          foodCostPercentage: null,
          grossProfit: null,
          grossMarginPercentage: null,
        };
    const sourceDates = [
      resolvedPrice.sourceVersionAt,
      ...costingLines
        .flatMap((line) => [line.inventorySourceAt, line.supplierSourceAt])
        .filter(Boolean),
    ] as Date[];
    const sourceVersionAt = sourceDates.reduce(
      (latest, value) => (value > latest ? value : latest),
      resolvedPrice.sourceVersionAt,
    );
    const [run] = await tx
      .insert(recipeCostingRuns)
      .values({
        tenantId: actor.tenantId,
        recipeId,
        outletId,
        runType,
        status: complete ? "complete" : "incomplete",
        currencyCode: context.tenant.currencyCode,
        sellingPriceSnapshot: price,
        ...metrics,
        warningCodes,
        calculatedAt: now,
        sourceVersionAt,
        createdBy: actor.userId,
      })
      .returning();
    await tx
      .insert(recipeCostingLines)
      .values(costingLines.map((line) => ({ ...line, costingRunId: run.id })));
    if (runType === "estimate")
      await tx
        .update(recipes)
        .set({
          costingComplete: complete,
          costingCalculatedAt: now,
          updatedAt: now,
          updatedBy: actor.userId,
        })
        .where(and(eq(recipes.id, recipeId), eq(recipes.status, "draft")));
    await tx.insert(auditLogs).values({
      tenantId: actor.tenantId,
      outletId,
      actorUserId: actor.userId,
      action:
        runType === "estimate"
          ? "recipe.recalculate"
          : "recipe.approval_costing",
      entityType: "recipe",
      entityId: recipeId,
      afterData: { costingRunId: run.id, complete, warningCodes },
    });
    return run.id;
  }

  private async costingDetail(actor: AuthUser, runId: string) {
    const [run] = await this.database.db
      .select()
      .from(recipeCostingRuns)
      .where(
        and(
          eq(recipeCostingRuns.id, runId),
          eq(recipeCostingRuns.tenantId, actor.tenantId),
        ),
      )
      .limit(1);
    if (!run) return null;
    const lines = await this.database.db
      .select()
      .from(recipeCostingLines)
      .where(
        and(
          eq(recipeCostingLines.costingRunId, runId),
          eq(recipeCostingLines.tenantId, actor.tenantId),
        ),
      )
      .orderBy(asc(recipeCostingLines.lineNo));
    const [freshness] = await this.database.db
      .select({
        inventoryAt: max(stockBatches.updatedAt),
        supplierAt: max(supplierIngredients.updatedAt),
        sellingPriceAt: max(menuVariants.updatedAt),
      })
      .from(recipes)
      .innerJoin(menuVariants, eq(menuVariants.id, recipes.menuVariantId))
      .leftJoin(recipeItems, eq(recipeItems.recipeId, recipes.id))
      .leftJoin(
        stockBatches,
        and(
          eq(stockBatches.ingredientId, recipeItems.ingredientId),
          eq(stockBatches.outletId, run.outletId),
          eq(stockBatches.tenantId, actor.tenantId),
        ),
      )
      .leftJoin(
        supplierIngredients,
        and(
          eq(supplierIngredients.ingredientId, recipeItems.ingredientId),
          eq(supplierIngredients.tenantId, actor.tenantId),
          eq(supplierIngredients.isPreferred, true),
        ),
      )
      .where(eq(recipes.id, run.recipeId));
    const staleSources = Object.entries(freshness ?? {})
      .filter(
        ([, value]) => value && new Date(value as Date) > run.sourceVersionAt,
      )
      .map(([key]) => key);
    return this.redact(actor, {
      ...run,
      lines,
      isStale: staleSources.length > 0,
      staleSources,
    });
  }

  private async prepare(
    actor: AuthUser,
    dto: Pick<
      CreateRecipeDto,
      | "menuVariantId"
      | "yieldQuantity"
      | "servingCount"
      | "servingSize"
      | "items"
    >,
  ) {
    this.positive(dto.yieldQuantity, "Yield");
    this.positive(dto.servingCount, "Serving count");
    this.positive(dto.servingSize, "Serving size");
    const [variant] = await this.database.db
      .select()
      .from(menuVariants)
      .where(
        and(
          eq(menuVariants.id, dto.menuVariantId),
          eq(menuVariants.tenantId, actor.tenantId),
          eq(menuVariants.isActive, true),
          isNull(menuVariants.deletedAt),
        ),
      )
      .limit(1);
    if (!variant)
      throw new BadRequestException("Menu variant aktif tidak ditemukan.");
    const result = [];
    for (const line of dto.items) {
      this.positive(line.netQuantity, "Net quantity");
      const waste = decimal(line.wastePercentage, 2);
      if (waste < 0n || waste >= 10000n)
        throw new BadRequestException(
          "Waste harus 0 sampai kurang dari 100 persen.",
        );
      const [master] = await this.database.db
        .select({
          ingredient: ingredients,
          unit: units,
          baseUnit: sql<{
            id: string;
            code: string;
            name: string;
            dimension: string;
          }>`row_to_json(bu)`,
        })
        .from(ingredients)
        .innerJoin(units, eq(units.id, line.unitId))
        .innerJoin(sql`${units} bu`, sql`bu.id = ${ingredients.baseUnitId}`)
        .where(
          and(
            eq(ingredients.id, line.ingredientId),
            eq(ingredients.tenantId, actor.tenantId),
            eq(ingredients.isActive, true),
            isNull(ingredients.deletedAt),
            eq(units.tenantId, actor.tenantId),
            eq(units.isActive, true),
            isNull(units.deletedAt),
          ),
        )
        .limit(1);
      if (!master)
        throw new BadRequestException("Ingredient atau unit tidak aktif.");
      if (master.unit.dimension !== master.baseUnit.dimension)
        throw new BadRequestException(
          "Dimensi unit tidak kompatibel dengan base unit ingredient.",
        );
      const conversion = await this.conversions.resolve(actor.tenantId, line.unitId, master.ingredient.baseUnitId);
      const net = decimal(line.netQuantity, 6);
      const denominator = 10000n - waste;
      const gross = divide(net, denominator, 6, 4);
      const base = multiplyScaled(gross, 6, decimal(conversion, 9), 9, 6);
      result.push({
        dto: line,
        master,
        conversion,
        gross: formatDecimal(gross, 6),
        base: formatDecimal(base, 6),
      });
    }
    return result;
  }

  private itemValues(
    actor: AuthUser,
    recipeId: string,
    lineNo: number,
    line: any,
  ) {
    return {
      tenantId: actor.tenantId,
      recipeId,
      lineNo,
      ingredientId: line.dto.ingredientId,
      quantity: line.dto.netQuantity,
      unitId: line.dto.unitId,
      wastePercentage: line.dto.wastePercentage,
      netQuantity: line.dto.netQuantity,
      grossQuantity: line.gross,
      conversionToBase: line.conversion,
      baseQuantity: line.base,
      isOptional: line.dto.isOptional ?? false,
      ingredientSkuSnapshot: line.master.ingredient.sku,
      ingredientNameSnapshot: line.master.ingredient.name,
      unitCodeSnapshot: line.master.unit.code,
      unitNameSnapshot: line.master.unit.name,
      unitDimensionSnapshot: line.master.unit.dimension,
      baseUnitCodeSnapshot: line.master.baseUnit.code,
      baseUnitNameSnapshot: line.master.baseUnit.name,
      createdBy: actor.userId,
      updatedBy: actor.userId,
    };
  }
  private missingLine(
    actor: AuthUser,
    row: any,
    currency: string,
    warning: string,
  ) {
    const item = row.item;
    return {
      tenantId: actor.tenantId,
      recipeItemId: item.id,
      ingredientId: item.ingredientId,
      lineNo: item.lineNo,
      ingredientSkuSnapshot: row.ingredient.sku,
      ingredientNameSnapshot: row.ingredient.name,
      unitCodeSnapshot: row.unit.code,
      baseUnitCodeSnapshot: row.baseUnitCode,
      netQuantity: item.netQuantity,
      wastePercentage: item.wastePercentage,
      grossQuantity: item.grossQuantity,
      conversionToBase: item.conversionToBase ?? "1",
      baseQuantity: item.baseQuantity ?? item.grossQuantity,
      costSource: "missing",
      costPerBaseUnit: null,
      totalCost: null,
      currencyCode: currency,
      warningCode: warning,
    };
  }
  private positive(value: string, label: string) {
    if (decimal(value, 6) <= 0n)
      throw new BadRequestException(`${label} harus lebih besar dari nol.`);
  }
  private async draft(actor: AuthUser, headerId: string) {
    const [row] = await this.database.db
      .select()
      .from(recipes)
      .where(
        and(
          eq(recipes.recipeHeaderId, headerId),
          eq(recipes.tenantId, actor.tenantId),
          eq(recipes.status, "draft"),
        ),
      )
      .limit(1);
    if (!row) throw new ConflictException("Draft recipe tidak ditemukan.");
    return row;
  }
  private async header(actor: AuthUser, id: string) {
    const [row] = await this.database.db
      .select()
      .from(recipeHeaders)
      .where(
        and(
          eq(recipeHeaders.id, id),
          eq(recipeHeaders.tenantId, actor.tenantId),
        ),
      )
      .limit(1);
    if (!row) throw new NotFoundException("Recipe tidak ditemukan.");
    return row;
  }
  private async itemsAsDto(
    tenantId: string,
    recipeId: string,
  ): Promise<RecipeItemDto[]> {
    const rows = await this.database.db
      .select()
      .from(recipeItems)
      .where(
        and(
          eq(recipeItems.tenantId, tenantId),
          eq(recipeItems.recipeId, recipeId),
        ),
      )
      .orderBy(asc(recipeItems.lineNo));
    return rows.map((row) => ({
      ingredientId: row.ingredientId,
      unitId: row.unitId,
      netQuantity: row.netQuantity,
      wastePercentage: row.wastePercentage,
      isOptional: row.isOptional,
    }));
  }
  private cloneVersion(row: typeof recipes.$inferSelect) {
    const {
      id: _id,
      versionNo: _versionNo,
      status: _status,
      revisionOfId: _revisionOfId,
      revisionReason: _revisionReason,
      approvedAt: _approvedAt,
      approvedBy: _approvedBy,
      approvedOutletId: _approvedOutletId,
      approvedCostingRunId: _approvedCostingRunId,
      costingComplete: _costingComplete,
      costingCalculatedAt: _costingCalculatedAt,
      isLegacy: _isLegacy,
      lockVersion: _lockVersion,
      createdAt: _createdAt,
      createdBy: _createdBy,
      updatedAt: _updatedAt,
      updatedBy: _updatedBy,
      ...rest
    } = row;
    return rest;
  }
  private redact(actor: AuthUser, payload: any): any {
    return redactRecipeCosts(
      payload,
      actor.permissions.includes("recipes.cost.read"),
    );
  }
  private async assertOutlet(actor: AuthUser, outletId: string) {
    if (actor.outletIds.length && !actor.outletIds.includes(outletId))
      throw new ForbiddenException("Anda tidak memiliki akses ke outlet ini.");
    const [row] = await this.database.db
      .select({ id: outlets.id })
      .from(outlets)
      .where(
        and(
          eq(outlets.id, outletId),
          eq(outlets.tenantId, actor.tenantId),
          eq(outlets.isActive, true),
          isNull(outlets.deletedAt),
        ),
      )
      .limit(1);
    if (!row) throw new NotFoundException("Outlet tidak ditemukan.");
  }
}
