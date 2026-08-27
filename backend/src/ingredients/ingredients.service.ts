import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  SQL,
  and,
  asc,
  eq,
  ilike,
  inArray,
  isNull,
  or,
  sql,
} from "drizzle-orm";
import { AuditService } from "../audit/audit.service";
import { AuthUser } from "../common/types/auth-user";
import { DatabaseService } from "../database/database.service";
import {
  goodsReceiptItems,
  ingredientCategories,
  ingredientOutletSettings,
  ingredients,
  outlets,
  purchaseOrderItems,
  stockBatches,
  storageLocations,
  supplierIngredients,
  units,
} from "../database/schema";
import { CreateIngredientDto } from "./dto/create-ingredient.dto";
import { IngredientOutletSettingDto } from "./dto/ingredient-outlet-setting.dto";
import { ListIngredientsQueryDto } from "./dto/list-ingredients-query.dto";
import { UpdateIngredientDto } from "./dto/update-ingredient.dto";
import {
  validatePerishableShelfLife,
  validateStockLevels,
} from "./ingredients.rules";

@Injectable()
export class IngredientsService {
  constructor(
    private readonly database: DatabaseService,
    private readonly audit: AuditService,
  ) {}

  async list(actor: AuthUser, query: ListIngredientsQueryDto) {
    const conditions: SQL[] = [
      eq(ingredients.tenantId, actor.tenantId),
      isNull(ingredients.deletedAt),
    ];
    if (query.categoryId)
      conditions.push(eq(ingredients.categoryId, query.categoryId));
    if (query.baseUnitId)
      conditions.push(eq(ingredients.baseUnitId, query.baseUnitId));
    if (query.isActive !== undefined)
      conditions.push(eq(ingredients.isActive, query.isActive));
    if (query.search) {
      const term = `%${query.search.trim()}%`;
      conditions.push(
        or(
          ilike(ingredients.sku, term),
          ilike(ingredients.name, term),
          ilike(ingredients.barcode, term),
        )!,
      );
    }
    return this.database.db
      .select({
        id: ingredients.id,
        sku: ingredients.sku,
        name: ingredients.name,
        categoryId: ingredients.categoryId,
        categoryName: ingredientCategories.name,
        baseUnitId: ingredients.baseUnitId,
        baseUnitCode: units.code,
        baseUnitName: units.name,
        valuationMethod: ingredients.valuationMethod,
        isPerishable: ingredients.isPerishable,
        shelfLifeDays: ingredients.shelfLifeDays,
        barcode: ingredients.barcode,
        isActive: ingredients.isActive,
        updatedAt: ingredients.updatedAt,
        outletCount: sql<number>`(select count(*)::int from ingredient_outlet_settings ios where ios.ingredient_id = ${ingredients.id})`,
        supplierCount: sql<number>`(select count(distinct si.supplier_id)::int from supplier_ingredients si where si.ingredient_id = ${ingredients.id})`,
      })
      .from(ingredients)
      .innerJoin(units, eq(units.id, ingredients.baseUnitId))
      .leftJoin(
        ingredientCategories,
        eq(ingredientCategories.id, ingredients.categoryId),
      )
      .where(and(...conditions))
      .orderBy(asc(ingredients.name));
  }

  async get(actor: AuthUser, id: string) {
    const rows = await this.list(actor, {});
    const ingredient = rows.find((row) => row.id === id);
    if (!ingredient) throw new NotFoundException("Bahan tidak ditemukan.");
    const settingsConditions: SQL[] = [
      eq(ingredientOutletSettings.tenantId, actor.tenantId),
      eq(ingredientOutletSettings.ingredientId, id),
    ];
    if (actor.outletIds.length)
      settingsConditions.push(
        inArray(ingredientOutletSettings.outletId, actor.outletIds),
      );
    const outletSettings = await this.database.db
      .select({
        id: ingredientOutletSettings.id,
        outletId: ingredientOutletSettings.outletId,
        outletCode: outlets.code,
        outletName: outlets.name,
        minimumStock: ingredientOutletSettings.minimumStock,
        reorderPoint: ingredientOutletSettings.reorderPoint,
        parStock: ingredientOutletSettings.parStock,
        defaultStorageLocationId:
          ingredientOutletSettings.defaultStorageLocationId,
        defaultStorageLocationName: storageLocations.name,
        isAvailable: ingredientOutletSettings.isAvailable,
      })
      .from(ingredientOutletSettings)
      .innerJoin(outlets, eq(outlets.id, ingredientOutletSettings.outletId))
      .leftJoin(
        storageLocations,
        eq(
          storageLocations.id,
          ingredientOutletSettings.defaultStorageLocationId,
        ),
      )
      .where(and(...settingsConditions))
      .orderBy(asc(outlets.name));
    return { ...ingredient, outletSettings };
  }

  async lookups(actor: AuthUser) {
    const outletConditions: SQL[] = [
      eq(outlets.tenantId, actor.tenantId),
      eq(outlets.isActive, true),
      isNull(outlets.deletedAt),
    ];
    const locationConditions: SQL[] = [
      eq(storageLocations.tenantId, actor.tenantId),
      eq(storageLocations.isActive, true),
      isNull(storageLocations.deletedAt),
    ];
    if (actor.outletIds.length) {
      outletConditions.push(inArray(outlets.id, actor.outletIds));
      locationConditions.push(
        inArray(storageLocations.outletId, actor.outletIds),
      );
    }
    const [categoryRows, unitRows, outletRows, locationRows] =
      await Promise.all([
        this.database.db
          .select({
            id: ingredientCategories.id,
            name: ingredientCategories.name,
          })
          .from(ingredientCategories)
          .where(
            and(
              eq(ingredientCategories.tenantId, actor.tenantId),
              eq(ingredientCategories.isActive, true),
              isNull(ingredientCategories.deletedAt),
            ),
          )
          .orderBy(asc(ingredientCategories.name)),
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
          )
          .orderBy(asc(units.name)),
        this.database.db
          .select({ id: outlets.id, code: outlets.code, name: outlets.name })
          .from(outlets)
          .where(and(...outletConditions))
          .orderBy(asc(outlets.name)),
        this.database.db
          .select({
            id: storageLocations.id,
            outletId: storageLocations.outletId,
            code: storageLocations.code,
            name: storageLocations.name,
          })
          .from(storageLocations)
          .where(and(...locationConditions))
          .orderBy(asc(storageLocations.name)),
      ]);
    return {
      categories: categoryRows,
      units: unitRows,
      outlets: outletRows,
      storageLocations: locationRows,
    };
  }

  async create(actor: AuthUser, dto: CreateIngredientDto) {
    validatePerishableShelfLife(dto.isPerishable ?? false, dto.shelfLifeDays);
    await this.validateReferences(actor, dto.baseUnitId, dto.categoryId);
    const sku = dto.sku.trim().toUpperCase();
    await this.assertUniqueSku(actor.tenantId, sku);
    if (dto.outletSettings)
      for (const setting of dto.outletSettings)
        await this.validateSetting(actor, setting);
    const [created] = await this.database.db
      .insert(ingredients)
      .values({
        tenantId: actor.tenantId,
        sku,
        name: dto.name.trim(),
        categoryId: dto.categoryId ?? null,
        baseUnitId: dto.baseUnitId,
        valuationMethod: dto.valuationMethod ?? "weighted_average",
        isPerishable: dto.isPerishable ?? false,
        shelfLifeDays: dto.isPerishable ? dto.shelfLifeDays : null,
        barcode: this.clean(dto.barcode),
        createdBy: actor.userId,
        updatedBy: actor.userId,
      })
      .returning();
    if (dto.outletSettings?.length)
      await this.saveSettings(actor, created.id, dto.outletSettings);
    const result = await this.get(actor, created.id);
    await this.audit.record({
      tenantId: actor.tenantId,
      actorUserId: actor.userId,
      action: "ingredient.create",
      entityType: "ingredient",
      entityId: created.id,
      afterData: result,
    });
    return result;
  }

  async update(actor: AuthUser, id: string, dto: UpdateIngredientDto) {
    const before = await this.get(actor, id);
    const perishable = dto.isPerishable ?? before.isPerishable;
    const shelfLife =
      dto.shelfLifeDays === undefined
        ? before.shelfLifeDays
        : dto.shelfLifeDays;
    validatePerishableShelfLife(perishable, shelfLife);
    if (dto.baseUnitId || dto.categoryId !== undefined)
      await this.validateReferences(
        actor,
        dto.baseUnitId ?? before.baseUnitId,
        dto.categoryId === undefined ? before.categoryId : dto.categoryId,
      );
    const sku = dto.sku?.trim().toUpperCase();
    if (sku && sku !== before.sku)
      await this.assertUniqueSku(actor.tenantId, sku, id);
    if (await this.hasTransactions(actor.tenantId, id)) {
      if (dto.baseUnitId && dto.baseUnitId !== before.baseUnitId)
        throw new BadRequestException(
          "Base unit bahan yang sudah memiliki transaksi tidak dapat diubah.",
        );
      if (dto.valuationMethod && dto.valuationMethod !== before.valuationMethod)
        throw new BadRequestException(
          "Metode valuasi bahan yang sudah memiliki transaksi tidak dapat diubah.",
        );
    }
    const { outletSettings, ...fields } = dto;
    const [updated] = await this.database.db
      .update(ingredients)
      .set({
        ...fields,
        ...(sku ? { sku } : {}),
        ...(dto.name ? { name: dto.name.trim() } : {}),
        ...(dto.barcode !== undefined
          ? { barcode: this.clean(dto.barcode) }
          : {}),
        shelfLifeDays: perishable ? shelfLife : null,
        updatedBy: actor.userId,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(ingredients.id, id),
          eq(ingredients.tenantId, actor.tenantId),
          isNull(ingredients.deletedAt),
        ),
      )
      .returning();
    if (!updated) throw new NotFoundException("Bahan tidak ditemukan.");
    if (outletSettings) {
      for (const setting of outletSettings)
        await this.validateSetting(actor, setting);
      await this.saveSettings(actor, id, outletSettings);
    }
    const result = await this.get(actor, id);
    await this.audit.record({
      tenantId: actor.tenantId,
      actorUserId: actor.userId,
      action:
        dto.isActive === false
          ? "ingredient.archive"
          : dto.isActive === true && !before.isActive
            ? "ingredient.activate"
            : "ingredient.update",
      entityType: "ingredient",
      entityId: id,
      beforeData: before,
      afterData: result,
    });
    return result;
  }

  async updateOutletSettings(
    actor: AuthUser,
    id: string,
    settings: IngredientOutletSettingDto[],
  ) {
    const before = await this.get(actor, id);
    for (const setting of settings) await this.validateSetting(actor, setting);
    await this.saveSettings(actor, id, settings);
    const result = await this.get(actor, id);
    await this.audit.record({
      tenantId: actor.tenantId,
      actorUserId: actor.userId,
      action: "ingredient.outlet_settings.update",
      entityType: "ingredient",
      entityId: id,
      beforeData: before.outletSettings,
      afterData: result.outletSettings,
    });
    return result;
  }

  private async saveSettings(
    actor: AuthUser,
    ingredientId: string,
    settings: IngredientOutletSettingDto[],
  ) {
    for (const setting of settings) {
      const values = {
        minimumStock: setting.minimumStock ?? 0,
        reorderPoint: setting.reorderPoint ?? 0,
        parStock: setting.parStock ?? 0,
        defaultStorageLocationId: setting.defaultStorageLocationId ?? null,
        isAvailable: setting.isAvailable ?? true,
        updatedBy: actor.userId,
        updatedAt: new Date(),
      };
      const [existing] = await this.database.db
        .select({ id: ingredientOutletSettings.id })
        .from(ingredientOutletSettings)
        .where(
          and(
            eq(ingredientOutletSettings.tenantId, actor.tenantId),
            eq(ingredientOutletSettings.ingredientId, ingredientId),
            eq(ingredientOutletSettings.outletId, setting.outletId),
          ),
        )
        .limit(1);
      if (existing)
        await this.database.db
          .update(ingredientOutletSettings)
          .set(values)
          .where(eq(ingredientOutletSettings.id, existing.id));
      else
        await this.database.db
          .insert(ingredientOutletSettings)
          .values({
            ...values,
            tenantId: actor.tenantId,
            ingredientId,
            outletId: setting.outletId,
            createdBy: actor.userId,
          });
    }
  }

  private async validateReferences(
    actor: AuthUser,
    baseUnitId: string,
    categoryId?: string | null,
  ) {
    const [unit] = await this.database.db
      .select({ id: units.id })
      .from(units)
      .where(
        and(
          eq(units.id, baseUnitId),
          eq(units.tenantId, actor.tenantId),
          eq(units.isActive, true),
          isNull(units.deletedAt),
        ),
      )
      .limit(1);
    if (!unit)
      throw new BadRequestException(
        "Base unit aktif tidak ditemukan pada tenant ini.",
      );
    if (categoryId) {
      const [category] = await this.database.db
        .select({ id: ingredientCategories.id })
        .from(ingredientCategories)
        .where(
          and(
            eq(ingredientCategories.id, categoryId),
            eq(ingredientCategories.tenantId, actor.tenantId),
            eq(ingredientCategories.isActive, true),
            isNull(ingredientCategories.deletedAt),
          ),
        )
        .limit(1);
      if (!category)
        throw new BadRequestException(
          "Kategori bahan aktif tidak ditemukan pada tenant ini.",
        );
    }
  }

  private async validateSetting(
    actor: AuthUser,
    setting: IngredientOutletSettingDto,
  ) {
    if (actor.outletIds.length && !actor.outletIds.includes(setting.outletId))
      throw new ForbiddenException("Tidak memiliki akses ke outlet tersebut.");
    const [outlet] = await this.database.db
      .select({ id: outlets.id })
      .from(outlets)
      .where(
        and(
          eq(outlets.id, setting.outletId),
          eq(outlets.tenantId, actor.tenantId),
          isNull(outlets.deletedAt),
        ),
      )
      .limit(1);
    if (!outlet)
      throw new BadRequestException("Outlet tidak ditemukan pada tenant ini.");
    if (setting.defaultStorageLocationId) {
      const [location] = await this.database.db
        .select({ id: storageLocations.id })
        .from(storageLocations)
        .where(
          and(
            eq(storageLocations.id, setting.defaultStorageLocationId),
            eq(storageLocations.tenantId, actor.tenantId),
            eq(storageLocations.outletId, setting.outletId),
            isNull(storageLocations.deletedAt),
          ),
        )
        .limit(1);
      if (!location)
        throw new BadRequestException(
          "Lokasi penyimpanan tidak sesuai dengan outlet.",
        );
    }
    validateStockLevels(
      setting.minimumStock,
      setting.reorderPoint,
      setting.parStock,
    );
  }

  private async assertUniqueSku(
    tenantId: string,
    sku: string,
    excludeId?: string,
  ) {
    const rows = await this.database.db
      .select({ id: ingredients.id })
      .from(ingredients)
      .where(
        and(
          eq(ingredients.tenantId, tenantId),
          eq(ingredients.sku, sku),
          isNull(ingredients.deletedAt),
        ),
      )
      .limit(1);
    if (rows[0] && rows[0].id !== excludeId)
      throw new ConflictException("SKU bahan sudah digunakan.");
  }
  private async hasTransactions(tenantId: string, id: string) {
    const checks = await Promise.all([
      this.database.db
        .select({ id: purchaseOrderItems.id })
        .from(purchaseOrderItems)
        .where(
          and(
            eq(purchaseOrderItems.tenantId, tenantId),
            eq(purchaseOrderItems.ingredientId, id),
          ),
        )
        .limit(1),
      this.database.db
        .select({ id: goodsReceiptItems.id })
        .from(goodsReceiptItems)
        .where(
          and(
            eq(goodsReceiptItems.tenantId, tenantId),
            eq(goodsReceiptItems.ingredientId, id),
          ),
        )
        .limit(1),
      this.database.db
        .select({ id: stockBatches.id })
        .from(stockBatches)
        .where(
          and(
            eq(stockBatches.tenantId, tenantId),
            eq(stockBatches.ingredientId, id),
          ),
        )
        .limit(1),
    ]);
    return checks.some((rows) => rows.length > 0);
  }
  private clean(value?: string | null) {
    const cleaned = value?.trim();
    return cleaned || null;
  }
}
