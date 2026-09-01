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
  count,
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
  auditLogs,
  ingredients,
  menuCategories,
  menus,
  menuVariantOutletSettings,
  menuVariants,
  outlets,
  recipeHeaders,
  tenants,
  units,
} from "../database/schema";
import {
  ActivateMenuProductDto,
  ArchiveMenuProductDto,
  CreateMenuCategoryDto,
  CreateMenuDto,
  CreateMenuVariantDto,
  ListMenuProductsDto,
  normalizeCode,
  normalizeName,
  UpdateMenuCategoryDto,
  UpdateMenuDto,
  UpdateMenuVariantDto,
  UpdateOutletAvailabilityDto,
  UpdateOutletPriceDto,
} from "./dto/menu-product.dto";
import { EffectivePriceService } from "./effective-price.service";
import { recipeEligibility, resolveEffectivePrice } from "./menu-product-rules";
import { redactMenuPrices } from "./menu-product-visibility";

@Injectable()
export class MenuProductsService {
  constructor(
    private readonly database: DatabaseService,
    private readonly audit: AuditService,
    private readonly effectivePrice: EffectivePriceService,
  ) {}

  async summary(actor: AuthUser) {
    const [row] = await this.database.db.execute(sql`
      select
        count(distinct m.id)::int as menus,
        count(distinct c.id)::int as categories,
        count(distinct v.id)::int as variants,
        count(distinct m.id) filter (where m.is_active)::int as active,
        count(distinct m.id) filter (where not m.is_active)::int as archived
      from menu_categories c
      left join menus m on m.category_id = c.id and m.tenant_id = c.tenant_id
      left join menu_variants v on v.menu_id = m.id and v.tenant_id = m.tenant_id
      where c.tenant_id = ${actor.tenantId}`);
    return (
      row ?? { menus: 0, categories: 0, variants: 0, active: 0, archived: 0 }
    );
  }

  async lookups(actor: AuthUser) {
    const outletConditions: SQL[] = [
      eq(outlets.tenantId, actor.tenantId),
      eq(outlets.isActive, true),
      isNull(outlets.deletedAt),
    ];
    if (actor.outletIds.length)
      outletConditions.push(inArray(outlets.id, actor.outletIds));
    const [categories, outletRows] = await Promise.all([
      this.database.db
        .select({
          id: menuCategories.id,
          code: menuCategories.code,
          name: menuCategories.name,
        })
        .from(menuCategories)
        .where(
          and(
            eq(menuCategories.tenantId, actor.tenantId),
            eq(menuCategories.isActive, true),
          ),
        )
        .orderBy(asc(menuCategories.displayOrder), asc(menuCategories.name)),
      this.database.db
        .select({ id: outlets.id, code: outlets.code, name: outlets.name })
        .from(outlets)
        .where(and(...outletConditions))
        .orderBy(asc(outlets.name)),
    ]);
    const [tenant] = await this.database.db
      .select({ currencyCode: tenants.currencyCode })
      .from(tenants)
      .where(eq(tenants.id, actor.tenantId))
      .limit(1);
    return {
      categories,
      outlets: outletRows,
      currencyCode: tenant?.currencyCode ?? "IDR",
    };
  }

  async listCategories(actor: AuthUser, query: ListMenuProductsDto) {
    const conditions: SQL[] = [eq(menuCategories.tenantId, actor.tenantId)];
    if (query.isActive !== undefined)
      conditions.push(eq(menuCategories.isActive, query.isActive));
    if (query.search) {
      const term = `%${query.search.trim()}%`;
      conditions.push(
        or(ilike(menuCategories.code, term), ilike(menuCategories.name, term))!,
      );
    }
    return this.database.db
      .select({
        id: menuCategories.id,
        code: menuCategories.code,
        name: menuCategories.name,
        displayOrder: menuCategories.displayOrder,
        isActive: menuCategories.isActive,
        archivedAt: menuCategories.archivedAt,
        archiveReason: menuCategories.archiveReason,
        lockVersion: menuCategories.lockVersion,
        activeMenuCount: sql<number>`(select count(*)::int from menus m where m.category_id = ${menuCategories.id} and m.tenant_id = ${actor.tenantId} and m.is_active = true)`,
      })
      .from(menuCategories)
      .where(and(...conditions))
      .orderBy(asc(menuCategories.displayOrder), asc(menuCategories.name));
  }

  async createCategory(actor: AuthUser, dto: CreateMenuCategoryDto) {
    const values = {
      code: normalizeCode(dto.code),
      name: normalizeName(dto.name),
    };
    await this.assertCategoryUnique(actor.tenantId, values.code, values.name);
    const [created] = await this.database.db
      .insert(menuCategories)
      .values({
        tenantId: actor.tenantId,
        ...values,
        displayOrder: dto.displayOrder ?? 0,
        createdBy: actor.userId,
        updatedBy: actor.userId,
      })
      .returning();
    await this.record(
      actor,
      "menu_category.create",
      "menu_category",
      created.id,
      null,
      created,
    );
    return created;
  }

  async updateCategory(
    actor: AuthUser,
    id: string,
    dto: UpdateMenuCategoryDto,
  ) {
    const before = await this.category(actor, id);
    const code = dto.code ? normalizeCode(dto.code) : before.code;
    const name = dto.name ? normalizeName(dto.name) : before.name;
    await this.assertCategoryUnique(actor.tenantId, code, name, id);
    const [updated] = await this.database.db
      .update(menuCategories)
      .set({
        ...(dto.code ? { code } : {}),
        ...(dto.name ? { name } : {}),
        ...(dto.displayOrder !== undefined
          ? { displayOrder: dto.displayOrder }
          : {}),
        lockVersion: sql`${menuCategories.lockVersion} + 1`,
        updatedAt: new Date(),
        updatedBy: actor.userId,
      })
      .where(
        and(
          eq(menuCategories.id, id),
          eq(menuCategories.tenantId, actor.tenantId),
          eq(menuCategories.lockVersion, dto.lockVersion),
        ),
      )
      .returning();
    this.assertUpdated(updated);
    await this.record(
      actor,
      "menu_category.update",
      "menu_category",
      id,
      before,
      updated,
    );
    return updated;
  }

  async archiveCategory(
    actor: AuthUser,
    id: string,
    dto: ArchiveMenuProductDto,
  ) {
    const before = await this.category(actor, id);
    const [usage] = await this.database.db
      .select({ value: count() })
      .from(menus)
      .where(
        and(
          eq(menus.tenantId, actor.tenantId),
          eq(menus.categoryId, id),
          eq(menus.isActive, true),
        ),
      );
    if (Number(usage.value) > 0)
      throw new ConflictException({
        code: "CATEGORY_HAS_ACTIVE_MENUS",
        message:
          "Kategori tidak dapat diarsipkan karena masih memiliki menu aktif.",
      });
    const [updated] = await this.database.db
      .update(menuCategories)
      .set({
        isActive: false,
        archivedAt: new Date(),
        archivedBy: actor.userId,
        archiveReason: dto.reason.trim(),
        lockVersion: sql`${menuCategories.lockVersion} + 1`,
        updatedAt: new Date(),
        updatedBy: actor.userId,
      })
      .where(
        and(
          eq(menuCategories.id, id),
          eq(menuCategories.tenantId, actor.tenantId),
          eq(menuCategories.lockVersion, dto.lockVersion),
        ),
      )
      .returning();
    this.assertUpdated(updated);
    await this.record(
      actor,
      "menu_category.archive",
      "menu_category",
      id,
      before,
      updated,
    );
    return updated;
  }

  async activateCategory(
    actor: AuthUser,
    id: string,
    dto: ActivateMenuProductDto,
  ) {
    const before = await this.category(actor, id);
    const [updated] = await this.database.db
      .update(menuCategories)
      .set({
        isActive: true,
        archivedAt: null,
        archivedBy: null,
        archiveReason: null,
        lockVersion: sql`${menuCategories.lockVersion} + 1`,
        updatedAt: new Date(),
        updatedBy: actor.userId,
      })
      .where(
        and(
          eq(menuCategories.id, id),
          eq(menuCategories.tenantId, actor.tenantId),
          eq(menuCategories.lockVersion, dto.lockVersion),
        ),
      )
      .returning();
    this.assertUpdated(updated);
    await this.record(
      actor,
      "menu_category.activate",
      "menu_category",
      id,
      before,
      updated,
    );
    return updated;
  }

  async listMenus(actor: AuthUser, query: ListMenuProductsDto) {
    const conditions: SQL[] = [eq(menus.tenantId, actor.tenantId)];
    if (query.categoryId)
      conditions.push(eq(menus.categoryId, query.categoryId));
    if (query.isActive !== undefined)
      conditions.push(eq(menus.isActive, query.isActive));
    if (query.search) {
      const term = `%${query.search.trim()}%`;
      conditions.push(or(ilike(menus.sku, term), ilike(menus.name, term))!);
    }
    const offset = (query.page - 1) * query.pageSize;
    const rows = await this.database.db
      .select({
        id: menus.id,
        code: menus.sku,
        name: menus.name,
        description: menus.description,
        categoryId: menus.categoryId,
        categoryName: menuCategories.name,
        taxProfileId: menus.taxProfileId,
        serviceChargeProfileId: menus.serviceChargeProfileId,
        isActive: menus.isActive,
        archivedAt: menus.archivedAt,
        archiveReason: menus.archiveReason,
        lockVersion: menus.lockVersion,
        updatedAt: menus.updatedAt,
        variantCount: sql<number>`(select count(*)::int from menu_variants v where v.menu_id = ${menus.id})`,
      })
      .from(menus)
      .innerJoin(menuCategories, eq(menuCategories.id, menus.categoryId))
      .where(and(...conditions))
      .orderBy(asc(menus.name))
      .limit(query.pageSize)
      .offset(offset);
    const [total] = await this.database.db
      .select({ value: count() })
      .from(menus)
      .where(and(...conditions));
    return {
      data: redactMenuPrices(rows, this.canReadPrices(actor)),
      page: query.page,
      pageSize: query.pageSize,
      total: Number(total.value),
    };
  }

  async getMenu(actor: AuthUser, id: string) {
    const [menu] = await this.database.db
      .select({ row: menus, categoryName: menuCategories.name })
      .from(menus)
      .innerJoin(menuCategories, eq(menuCategories.id, menus.categoryId))
      .where(and(eq(menus.id, id), eq(menus.tenantId, actor.tenantId)))
      .limit(1);
    if (!menu) throw new NotFoundException("Menu tidak ditemukan.");
    const variants = await this.listVariantsInternal(actor, id);
    return redactMenuPrices(
      {
        ...menu.row,
        code: menu.row.sku,
        categoryName: menu.categoryName,
        variants,
      },
      this.canReadPrices(actor),
    );
  }

  async createMenu(actor: AuthUser, dto: CreateMenuDto) {
    await this.assertActiveCategory(actor, dto.categoryId);
    const code = normalizeCode(dto.code);
    await this.assertMenuCodeUnique(actor.tenantId, code);
    await this.assertProfiles(
      actor.tenantId,
      dto.taxProfileId,
      dto.serviceChargeProfileId,
    );
    const [created] = await this.database.db
      .insert(menus)
      .values({
        tenantId: actor.tenantId,
        sku: code,
        name: normalizeName(dto.name),
        categoryId: dto.categoryId,
        description: dto.description?.trim() || null,
        taxProfileId: dto.taxProfileId ?? null,
        serviceChargeProfileId: dto.serviceChargeProfileId ?? null,
        createdBy: actor.userId,
        updatedBy: actor.userId,
      })
      .returning();
    await this.record(actor, "menu.create", "menu", created.id, null, created);
    return this.getMenu(actor, created.id);
  }

  async updateMenu(actor: AuthUser, id: string, dto: UpdateMenuDto) {
    const before = await this.menuRow(actor, id);
    if (dto.categoryId) await this.assertActiveCategory(actor, dto.categoryId);
    const code = dto.code ? normalizeCode(dto.code) : before.sku;
    if (code !== before.sku)
      await this.assertMenuCodeUnique(actor.tenantId, code, id);
    await this.assertProfiles(
      actor.tenantId,
      dto.taxProfileId,
      dto.serviceChargeProfileId,
    );
    const [updated] = await this.database.db
      .update(menus)
      .set({
        ...(dto.code ? { sku: code } : {}),
        ...(dto.name ? { name: normalizeName(dto.name) } : {}),
        ...(dto.categoryId ? { categoryId: dto.categoryId } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description?.trim() || null }
          : {}),
        ...(dto.taxProfileId !== undefined
          ? { taxProfileId: dto.taxProfileId }
          : {}),
        ...(dto.serviceChargeProfileId !== undefined
          ? { serviceChargeProfileId: dto.serviceChargeProfileId }
          : {}),
        lockVersion: sql`${menus.lockVersion} + 1`,
        updatedAt: new Date(),
        updatedBy: actor.userId,
      })
      .where(
        and(
          eq(menus.id, id),
          eq(menus.tenantId, actor.tenantId),
          eq(menus.lockVersion, dto.lockVersion),
        ),
      )
      .returning();
    this.assertUpdated(updated);
    await this.record(actor, "menu.update", "menu", id, before, updated);
    return this.getMenu(actor, id);
  }

  async archiveMenu(actor: AuthUser, id: string, dto: ArchiveMenuProductDto) {
    const before = await this.menuRow(actor, id);
    const [updated] = await this.database.db
      .update(menus)
      .set({
        isActive: false,
        archivedAt: new Date(),
        archivedBy: actor.userId,
        archiveReason: dto.reason.trim(),
        lockVersion: sql`${menus.lockVersion} + 1`,
        updatedAt: new Date(),
        updatedBy: actor.userId,
      })
      .where(
        and(
          eq(menus.id, id),
          eq(menus.tenantId, actor.tenantId),
          eq(menus.lockVersion, dto.lockVersion),
        ),
      )
      .returning();
    this.assertUpdated(updated);
    await this.record(actor, "menu.archive", "menu", id, before, updated);
    return this.getMenu(actor, id);
  }

  async activateMenu(actor: AuthUser, id: string, dto: ActivateMenuProductDto) {
    const before = await this.menuRow(actor, id);
    await this.assertActiveCategory(actor, before.categoryId);
    const [updated] = await this.database.db
      .update(menus)
      .set({
        isActive: true,
        archivedAt: null,
        archivedBy: null,
        archiveReason: null,
        lockVersion: sql`${menus.lockVersion} + 1`,
        updatedAt: new Date(),
        updatedBy: actor.userId,
      })
      .where(
        and(
          eq(menus.id, id),
          eq(menus.tenantId, actor.tenantId),
          eq(menus.lockVersion, dto.lockVersion),
        ),
      )
      .returning();
    this.assertUpdated(updated);
    await this.record(actor, "menu.activate", "menu", id, before, updated);
    return this.getMenu(actor, id);
  }

  async listVariants(actor: AuthUser, menuId: string) {
    await this.menuRow(actor, menuId);
    return redactMenuPrices(
      await this.listVariantsInternal(actor, menuId),
      this.canReadPrices(actor),
    );
  }

  async createVariant(
    actor: AuthUser,
    menuId: string,
    dto: CreateMenuVariantDto,
  ) {
    const menu = await this.menuRow(actor, menuId);
    if (!menu.isActive)
      throw new BadRequestException("Parent menu harus aktif.");
    await this.assertCurrency(actor.tenantId, dto.currencyCode);
    this.assertPrice(dto.sellingPrice);
    const sku = normalizeCode(dto.sku);
    await this.assertVariantSkuUnique(actor.tenantId, sku);
    if (dto.isDefault)
      await this.clearDefault(actor.tenantId, menuId, actor.userId);
    const [created] = await this.database.db
      .insert(menuVariants)
      .values({
        tenantId: actor.tenantId,
        menuId,
        outletId: null,
        code: sku,
        name: normalizeName(dto.name),
        sellingPrice: dto.sellingPrice,
        currencyCode: dto.currencyCode,
        barcode: dto.barcode?.trim() || null,
        isDefault: dto.isDefault ?? false,
        displayOrder: dto.displayOrder ?? 0,
        requiresRecipe: dto.requiresRecipe ?? menu.itemType === "recipe",
        requiresKitchen: dto.requiresKitchen ?? true,
        createdBy: actor.userId,
        updatedBy: actor.userId,
      })
      .returning();
    await this.record(
      actor,
      "menu_variant.create",
      "menu_variant",
      created.id,
      null,
      created,
    );
    return redactMenuPrices(created, this.canReadPrices(actor));
  }

  async updateVariant(actor: AuthUser, id: string, dto: UpdateMenuVariantDto) {
    const before = await this.variant(actor, id);
    if (dto.currencyCode)
      await this.assertCurrency(actor.tenantId, dto.currencyCode);
    if (dto.sellingPrice !== undefined) this.assertPrice(dto.sellingPrice);
    const sku = dto.sku ? normalizeCode(dto.sku) : before.code;
    if (sku !== before.code)
      await this.assertVariantSkuUnique(actor.tenantId, sku, id);
    if (dto.isDefault)
      await this.clearDefault(actor.tenantId, before.menuId, actor.userId, id);
    const [updated] = await this.database.db
      .update(menuVariants)
      .set({
        ...(dto.sku ? { code: sku } : {}),
        ...(dto.name ? { name: normalizeName(dto.name) } : {}),
        ...(dto.sellingPrice !== undefined
          ? { sellingPrice: dto.sellingPrice }
          : {}),
        ...(dto.currencyCode ? { currencyCode: dto.currencyCode } : {}),
        ...(dto.barcode !== undefined
          ? { barcode: dto.barcode?.trim() || null }
          : {}),
        ...(dto.isDefault !== undefined ? { isDefault: dto.isDefault } : {}),
        ...(dto.displayOrder !== undefined
          ? { displayOrder: dto.displayOrder }
          : {}),
        ...(dto.requiresRecipe !== undefined
          ? { requiresRecipe: dto.requiresRecipe }
          : {}),
        ...(dto.requiresKitchen !== undefined
          ? { requiresKitchen: dto.requiresKitchen }
          : {}),
        lockVersion: sql`${menuVariants.lockVersion} + 1`,
        updatedAt: new Date(),
        updatedBy: actor.userId,
      })
      .where(
        and(
          eq(menuVariants.id, id),
          eq(menuVariants.tenantId, actor.tenantId),
          eq(menuVariants.lockVersion, dto.lockVersion),
        ),
      )
      .returning();
    this.assertUpdated(updated);
    await this.record(
      actor,
      "menu_variant.update",
      "menu_variant",
      id,
      before,
      updated,
    );
    return redactMenuPrices(updated, this.canReadPrices(actor));
  }

  async archiveVariant(
    actor: AuthUser,
    id: string,
    dto: ArchiveMenuProductDto,
  ) {
    const before = await this.variant(actor, id);
    const [updated] = await this.database.db
      .update(menuVariants)
      .set({
        isActive: false,
        archivedAt: new Date(),
        archivedBy: actor.userId,
        archiveReason: dto.reason.trim(),
        lockVersion: sql`${menuVariants.lockVersion} + 1`,
        updatedAt: new Date(),
        updatedBy: actor.userId,
      })
      .where(
        and(
          eq(menuVariants.id, id),
          eq(menuVariants.tenantId, actor.tenantId),
          eq(menuVariants.lockVersion, dto.lockVersion),
        ),
      )
      .returning();
    this.assertUpdated(updated);
    await this.record(
      actor,
      "menu_variant.archive",
      "menu_variant",
      id,
      before,
      updated,
    );
    return redactMenuPrices(updated, this.canReadPrices(actor));
  }

  async activateVariant(
    actor: AuthUser,
    id: string,
    dto: ActivateMenuProductDto,
  ) {
    const before = await this.variant(actor, id);
    const menu = await this.menuRow(actor, before.menuId);
    if (!menu.isActive)
      throw new BadRequestException(
        "Variant tidak dapat diaktifkan karena parent menu tidak aktif.",
      );
    await this.assertCurrency(actor.tenantId, before.currencyCode);
    if (before.sellingPrice === null)
      throw new BadRequestException(
        "Base selling price wajib diisi sebelum variant diaktifkan.",
      );
    const settings = await this.database.db
      .select({ id: menuVariantOutletSettings.id })
      .from(menuVariantOutletSettings)
      .where(
        and(
          eq(menuVariantOutletSettings.tenantId, actor.tenantId),
          eq(menuVariantOutletSettings.menuVariantId, id),
          eq(menuVariantOutletSettings.isActive, true),
        ),
      )
      .limit(1);
    if (!settings.length)
      throw new BadRequestException(
        "Variant memerlukan minimal satu konfigurasi outlet aktif.",
      );
    const [updated] = await this.database.db
      .update(menuVariants)
      .set({
        isActive: true,
        archivedAt: null,
        archivedBy: null,
        archiveReason: null,
        lockVersion: sql`${menuVariants.lockVersion} + 1`,
        updatedAt: new Date(),
        updatedBy: actor.userId,
      })
      .where(
        and(
          eq(menuVariants.id, id),
          eq(menuVariants.tenantId, actor.tenantId),
          eq(menuVariants.lockVersion, dto.lockVersion),
        ),
      )
      .returning();
    this.assertUpdated(updated);
    await this.record(
      actor,
      "menu_variant.activate",
      "menu_variant",
      id,
      before,
      updated,
    );
    return redactMenuPrices(updated, this.canReadPrices(actor));
  }

  async outletSettings(actor: AuthUser, variantId: string) {
    await this.variant(actor, variantId);
    const conditions: SQL[] = [
      eq(menuVariantOutletSettings.tenantId, actor.tenantId),
      eq(menuVariantOutletSettings.menuVariantId, variantId),
    ];
    if (actor.outletIds.length)
      conditions.push(
        inArray(menuVariantOutletSettings.outletId, actor.outletIds),
      );
    const rows = await this.database.db
      .select({
        id: menuVariantOutletSettings.id,
        outletId: outlets.id,
        outletCode: outlets.code,
        outletName: outlets.name,
        isAvailable: menuVariantOutletSettings.isAvailable,
        isActive: menuVariantOutletSettings.isActive,
        priceOverride: menuVariantOutletSettings.priceOverride,
        lockVersion: menuVariantOutletSettings.lockVersion,
        updatedAt: menuVariantOutletSettings.updatedAt,
      })
      .from(menuVariantOutletSettings)
      .innerJoin(outlets, eq(outlets.id, menuVariantOutletSettings.outletId))
      .where(and(...conditions))
      .orderBy(asc(outlets.name));
    return redactMenuPrices(rows, this.canReadPrices(actor));
  }

  async setAvailability(
    actor: AuthUser,
    variantId: string,
    outletId: string,
    dto: UpdateOutletAvailabilityDto,
  ) {
    await this.variant(actor, variantId);
    await this.assertOutlet(actor, outletId);
    const existing = await this.setting(actor.tenantId, variantId, outletId);
    if (existing && dto.lockVersion !== existing.lockVersion)
      throw new ConflictException(
        "Konfigurasi outlet berubah. Muat ulang lalu coba lagi.",
      );
    const values = {
      isAvailable: dto.isAvailable,
      isActive: dto.isActive ?? true,
      updatedAt: new Date(),
      updatedBy: actor.userId,
    };
    const [saved] = existing
      ? await this.database.db
          .update(menuVariantOutletSettings)
          .set({
            ...values,
            lockVersion: sql`${menuVariantOutletSettings.lockVersion} + 1`,
          })
          .where(
            and(
              eq(menuVariantOutletSettings.id, existing.id),
              eq(menuVariantOutletSettings.lockVersion, existing.lockVersion),
            ),
          )
          .returning()
      : await this.database.db
          .insert(menuVariantOutletSettings)
          .values({
            tenantId: actor.tenantId,
            outletId,
            menuVariantId: variantId,
            ...values,
            createdBy: actor.userId,
          })
          .returning();
    await this.record(
      actor,
      "menu_variant.outlet_availability",
      "menu_variant",
      variantId,
      existing,
      saved,
      outletId,
    );
    return redactMenuPrices(saved, this.canReadPrices(actor));
  }

  async setPrice(
    actor: AuthUser,
    variantId: string,
    outletId: string,
    dto: UpdateOutletPriceDto,
  ) {
    await this.variant(actor, variantId);
    await this.assertOutlet(actor, outletId);
    if (dto.priceOverride !== null && dto.priceOverride !== undefined)
      this.assertPrice(dto.priceOverride);
    const existing = await this.setting(actor.tenantId, variantId, outletId);
    if (!existing)
      throw new BadRequestException(
        "Buat konfigurasi availability outlet terlebih dahulu.",
      );
    const [saved] = await this.database.db
      .update(menuVariantOutletSettings)
      .set({
        priceOverride: dto.priceOverride ?? null,
        lockVersion: sql`${menuVariantOutletSettings.lockVersion} + 1`,
        updatedAt: new Date(),
        updatedBy: actor.userId,
      })
      .where(
        and(
          eq(menuVariantOutletSettings.id, existing.id),
          eq(menuVariantOutletSettings.lockVersion, dto.lockVersion),
        ),
      )
      .returning();
    this.assertUpdated(saved);
    await this.record(
      actor,
      "menu_variant.outlet_price",
      "menu_variant",
      variantId,
      existing,
      saved,
      outletId,
    );
    return redactMenuPrices(saved, this.canReadPrices(actor));
  }

  async recipeLookup(actor: AuthUser, outletId: string) {
    await this.assertOutlet(actor, outletId);
    const rows = await this.database.db
      .select({
        categoryId: menuCategories.id,
        categoryCode: menuCategories.code,
        categoryName: menuCategories.name,
        categoryActive: menuCategories.isActive,
        menuId: menus.id,
        menuCode: menus.sku,
        menuName: menus.name,
        menuActive: menus.isActive,
        variantId: menuVariants.id,
        variantSku: menuVariants.code,
        variantName: menuVariants.name,
        variantActive: menuVariants.isActive,
        requiresRecipe: menuVariants.requiresRecipe,
        requiresKitchen: menuVariants.requiresKitchen,
        baseSellingPrice: menuVariants.sellingPrice,
        currencyCode: menuVariants.currencyCode,
        outletSettingId: menuVariantOutletSettings.id,
        settingActive: menuVariantOutletSettings.isActive,
        isAvailable: menuVariantOutletSettings.isAvailable,
        priceOverride: menuVariantOutletSettings.priceOverride,
        recipeHeaderId: recipeHeaders.id,
        recipeVersionId: recipeHeaders.currentApprovedVersionId,
      })
      .from(menus)
      .innerJoin(menuCategories, eq(menuCategories.id, menus.categoryId))
      .leftJoin(
        menuVariants,
        and(
          eq(menuVariants.menuId, menus.id),
          eq(menuVariants.tenantId, actor.tenantId),
          isNull(menuVariants.deletedAt),
        ),
      )
      .leftJoin(
        menuVariantOutletSettings,
        and(
          eq(menuVariantOutletSettings.menuVariantId, menuVariants.id),
          eq(menuVariantOutletSettings.tenantId, actor.tenantId),
          eq(menuVariantOutletSettings.outletId, outletId),
        ),
      )
      .leftJoin(
        recipeHeaders,
        and(
          eq(recipeHeaders.menuVariantId, menuVariants.id),
          eq(recipeHeaders.tenantId, actor.tenantId),
        ),
      )
      .where(and(eq(menus.tenantId, actor.tenantId), isNull(menus.deletedAt)))
      .orderBy(
        asc(menuCategories.displayOrder),
        asc(menus.name),
        asc(menuVariants.displayOrder),
      );
    const candidates = rows.map((row) => {
      const eligibility = recipeEligibility({
        categoryActive: row.categoryActive,
        menuActive: row.menuActive,
        hasVariant: row.variantId !== null,
        variantActive: row.variantActive,
        hasOutletSetting: row.outletSettingId !== null,
        settingActive: row.settingActive,
        isAvailable: row.isAvailable,
        hasRecipe: row.recipeHeaderId !== null,
      });
      return {
        ...row,
        ...eligibility,
        effectiveSellingPrice: resolveEffectivePrice(
          row.baseSellingPrice,
          row.settingActive ? row.priceOverride : null,
        ),
      };
    });
    return redactMenuPrices(candidates, this.canReadPrices(actor));
  }

  async recipeContext(actor: AuthUser) {
    const outletConditions: SQL[] = [
      eq(outlets.tenantId, actor.tenantId),
      eq(outlets.isActive, true),
      isNull(outlets.deletedAt),
    ];
    if (actor.outletIds.length)
      outletConditions.push(inArray(outlets.id, actor.outletIds));
    const [ingredientRows, unitRows, outletRows] = await Promise.all([
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
        )
        .orderBy(asc(ingredients.name)),
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
    ]);
    return {
      menuVariants: [],
      ingredients: ingredientRows,
      units: unitRows,
      outlets: outletRows,
    };
  }
  async posLookup(actor: AuthUser, outletId: string) {
    await this.assertOutlet(actor, outletId);
    return redactMenuPrices(
      await this.transactionLookup(actor, outletId, true),
      this.canReadPrices(actor),
    );
  }

  async auditHistory(actor: AuthUser, menuId: string) {
    await this.menuRow(actor, menuId);
    const rows = await this.database.db
      .select()
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.tenantId, actor.tenantId),
          or(
            and(
              eq(auditLogs.entityType, "menu"),
              eq(auditLogs.entityId, menuId),
            ),
            sql`${auditLogs.entityType} = 'menu_variant' and ${auditLogs.entityId} in (select id from menu_variants where menu_id = ${menuId})`,
          )!,
        ),
      )
      .orderBy(sql`${auditLogs.occurredAt} desc`)
      .limit(100);
    return redactMenuPrices(rows, this.canReadPrices(actor));
  }

  private async transactionLookup(
    actor: AuthUser,
    outletId: string,
    posReady: boolean,
  ) {
    const rows = await this.database.db
      .select({
        categoryId: menuCategories.id,
        categoryCode: menuCategories.code,
        categoryName: menuCategories.name,
        menuId: menus.id,
        menuCode: menus.sku,
        menuName: menus.name,
        variantId: menuVariants.id,
        variantSku: menuVariants.code,
        variantName: menuVariants.name,
        requiresRecipe: menuVariants.requiresRecipe,
        requiresKitchen: menuVariants.requiresKitchen,
        baseSellingPrice: menuVariants.sellingPrice,
        currencyCode: menuVariants.currencyCode,
        priceOverride: menuVariantOutletSettings.priceOverride,
        recipeVersionId: recipeHeaders.currentApprovedVersionId,
      })
      .from(menuVariantOutletSettings)
      .innerJoin(
        menuVariants,
        eq(menuVariants.id, menuVariantOutletSettings.menuVariantId),
      )
      .innerJoin(menus, eq(menus.id, menuVariants.menuId))
      .innerJoin(menuCategories, eq(menuCategories.id, menus.categoryId))
      .leftJoin(
        recipeHeaders,
        and(
          eq(recipeHeaders.menuVariantId, menuVariants.id),
          eq(recipeHeaders.tenantId, actor.tenantId),
          eq(recipeHeaders.isArchived, false),
        ),
      )
      .where(
        and(
          eq(menuVariantOutletSettings.tenantId, actor.tenantId),
          eq(menuVariantOutletSettings.outletId, outletId),
          eq(menuVariantOutletSettings.isActive, true),
          eq(menuVariantOutletSettings.isAvailable, true),
          eq(menuVariants.isActive, true),
          eq(menus.isActive, true),
          eq(menuCategories.isActive, true),
          isNull(menuVariants.deletedAt),
          isNull(menus.deletedAt),
          ...(posReady
            ? [
                sql`(${menuVariants.requiresRecipe} = false or ${recipeHeaders.currentApprovedVersionId} is not null)`,
              ]
            : []),
        ),
      )
      .orderBy(
        asc(menuCategories.displayOrder),
        asc(menus.name),
        asc(menuVariants.displayOrder),
      );
    return rows.map((row) => ({
      ...row,
      effectiveSellingPrice: row.priceOverride ?? row.baseSellingPrice,
    }));
  }

  private async category(actor: AuthUser, id: string) {
    const [row] = await this.database.db
      .select()
      .from(menuCategories)
      .where(
        and(
          eq(menuCategories.id, id),
          eq(menuCategories.tenantId, actor.tenantId),
        ),
      )
      .limit(1);
    if (!row) throw new NotFoundException("Kategori menu tidak ditemukan.");
    return row;
  }
  private async menuRow(actor: AuthUser, id: string) {
    const [row] = await this.database.db
      .select()
      .from(menus)
      .where(and(eq(menus.id, id), eq(menus.tenantId, actor.tenantId)))
      .limit(1);
    if (!row) throw new NotFoundException("Menu tidak ditemukan.");
    return row;
  }
  private async variant(actor: AuthUser, id: string) {
    const [row] = await this.database.db
      .select()
      .from(menuVariants)
      .where(
        and(eq(menuVariants.id, id), eq(menuVariants.tenantId, actor.tenantId)),
      )
      .limit(1);
    if (!row) throw new NotFoundException("Menu variant tidak ditemukan.");
    return row;
  }
  private async listVariantsInternal(actor: AuthUser, menuId: string) {
    return this.database.db
      .select({
        id: menuVariants.id,
        menuId: menuVariants.menuId,
        sku: menuVariants.code,
        name: menuVariants.name,
        sellingPrice: menuVariants.sellingPrice,
        currencyCode: menuVariants.currencyCode,
        barcode: menuVariants.barcode,
        isDefault: menuVariants.isDefault,
        displayOrder: menuVariants.displayOrder,
        requiresRecipe: menuVariants.requiresRecipe,
        requiresKitchen: menuVariants.requiresKitchen,
        isActive: menuVariants.isActive,
        archivedAt: menuVariants.archivedAt,
        archiveReason: menuVariants.archiveReason,
        lockVersion: menuVariants.lockVersion,
      })
      .from(menuVariants)
      .where(
        and(
          eq(menuVariants.tenantId, actor.tenantId),
          eq(menuVariants.menuId, menuId),
        ),
      )
      .orderBy(asc(menuVariants.displayOrder), asc(menuVariants.name));
  }
  private async assertCategoryUnique(
    tenantId: string,
    code: string,
    name: string,
    excludeId?: string,
  ) {
    const rows = await this.database.db
      .select({ id: menuCategories.id })
      .from(menuCategories)
      .where(
        and(
          eq(menuCategories.tenantId, tenantId),
          or(
            sql`upper(btrim(${menuCategories.code})) = ${code}`,
            sql`lower(btrim(${menuCategories.name})) = ${name.toLowerCase()}`,
          )!,
        ),
      );
    if (rows.some((row) => row.id !== excludeId))
      throw new ConflictException(
        "Kode atau nama kategori sudah digunakan, termasuk oleh data archived.",
      );
  }
  private async assertMenuCodeUnique(
    tenantId: string,
    code: string,
    excludeId?: string,
  ) {
    const rows = await this.database.db
      .select({ id: menus.id })
      .from(menus)
      .where(
        and(
          eq(menus.tenantId, tenantId),
          sql`upper(btrim(${menus.sku})) = ${code}`,
        ),
      );
    if (rows.some((row) => row.id !== excludeId))
      throw new ConflictException(
        "Kode menu sudah digunakan, termasuk oleh data archived.",
      );
  }
  private async assertVariantSkuUnique(
    tenantId: string,
    sku: string,
    excludeId?: string,
  ) {
    const rows = await this.database.db
      .select({ id: menuVariants.id })
      .from(menuVariants)
      .where(
        and(
          eq(menuVariants.tenantId, tenantId),
          sql`upper(btrim(${menuVariants.code})) = ${sku}`,
        ),
      );
    if (rows.some((row) => row.id !== excludeId))
      throw new ConflictException(
        "SKU variant sudah digunakan, termasuk oleh data archived.",
      );
  }
  private async assertActiveCategory(actor: AuthUser, id: string) {
    const row = await this.category(actor, id);
    if (!row.isActive)
      throw new BadRequestException("Kategori menu harus aktif.");
  }
  private async assertCurrency(tenantId: string, currencyCode: string) {
    const [tenant] = await this.database.db
      .select({ currencyCode: tenants.currencyCode })
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);
    if (!tenant || tenant.currencyCode !== currencyCode.toUpperCase())
      throw new BadRequestException(
        "Currency variant harus sama dengan currency tenant.",
      );
  }
  private assertPrice(value: string) {
    if (!/^\d+(\.\d{1,2})?$/.test(value) || Number(value) < 0)
      throw new BadRequestException(
        "Harga harus angka non-negatif dengan maksimal dua desimal.",
      );
  }
  private async assertOutlet(actor: AuthUser, outletId: string) {
    if (actor.outletIds.length && !actor.outletIds.includes(outletId))
      throw new ForbiddenException("Tidak memiliki akses ke outlet tersebut.");
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
    if (!row)
      throw new BadRequestException(
        "Outlet aktif tidak ditemukan pada tenant ini.",
      );
  }
  private async setting(tenantId: string, variantId: string, outletId: string) {
    const [row] = await this.database.db
      .select()
      .from(menuVariantOutletSettings)
      .where(
        and(
          eq(menuVariantOutletSettings.tenantId, tenantId),
          eq(menuVariantOutletSettings.menuVariantId, variantId),
          eq(menuVariantOutletSettings.outletId, outletId),
        ),
      )
      .limit(1);
    return row;
  }
  private async clearDefault(
    tenantId: string,
    menuId: string,
    actorId: string,
    exceptId?: string,
  ) {
    await this.database.db
      .update(menuVariants)
      .set({ isDefault: false, updatedAt: new Date(), updatedBy: actorId })
      .where(
        and(
          eq(menuVariants.tenantId, tenantId),
          eq(menuVariants.menuId, menuId),
          eq(menuVariants.isDefault, true),
          ...(exceptId ? [sql`${menuVariants.id} <> ${exceptId}`] : []),
        ),
      );
  }
  private async assertProfiles(
    tenantId: string,
    taxId?: string | null,
    serviceId?: string | null,
  ) {
    if (taxId) {
      const rows = await this.database.db.execute(
        sql`select id from tax_profiles where id=${taxId} and tenant_id=${tenantId} and is_active=true limit 1`,
      );
      if (!rows.length)
        throw new BadRequestException(
          "Tax profile aktif tidak ditemukan pada tenant ini.",
        );
    }
    if (serviceId) {
      const rows = await this.database.db.execute(
        sql`select id from service_charge_profiles where id=${serviceId} and tenant_id=${tenantId} and is_active=true limit 1`,
      );
      if (!rows.length)
        throw new BadRequestException(
          "Service charge profile aktif tidak ditemukan pada tenant ini.",
        );
    }
  }
  private assertUpdated<T>(value: T | undefined) {
    if (!value)
      throw new ConflictException("Data berubah. Muat ulang lalu coba lagi.");
  }
  private canReadPrices(actor: AuthUser) {
    return actor.permissions.includes("menus.prices.read");
  }
  private async record(
    actor: AuthUser,
    action: string,
    entityType: string,
    entityId: string,
    beforeData: unknown,
    afterData: unknown,
    outletId?: string,
  ) {
    await this.audit.record({
      tenantId: actor.tenantId,
      outletId,
      actorUserId: actor.userId,
      action,
      entityType,
      entityId,
      beforeData,
      afterData,
    });
  }
}
