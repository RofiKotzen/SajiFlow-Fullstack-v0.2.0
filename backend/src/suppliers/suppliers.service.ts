import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { SQL, and, asc, eq, ilike, isNull, or, sql } from "drizzle-orm";
import { AuditService } from "../audit/audit.service";
import { AuthUser } from "../common/types/auth-user";
import { DatabaseService } from "../database/database.service";
import {
  ingredients,
  purchaseOrders,
  supplierIngredients,
  suppliers,
  tenants,
  units,
} from "../database/schema";
import { CreateSupplierCatalogDto } from "./dto/create-supplier-catalog.dto";
import { CreateSupplierDto } from "./dto/create-supplier.dto";
import { ListSuppliersQueryDto } from "./dto/list-suppliers-query.dto";
import { UpdateSupplierCatalogDto } from "./dto/update-supplier-catalog.dto";
import { UpdateSupplierDto } from "./dto/update-supplier.dto";
import { UnitConversionResolver } from "../units/unit-conversion-resolver.service";
import { decimal, formatDecimal } from "../recipes/recipe-decimal";

@Injectable()
export class SuppliersService {
  constructor(
    private readonly database: DatabaseService,
    private readonly audit: AuditService,
    private readonly conversions: UnitConversionResolver,
  ) {}

  async list(actor: AuthUser, query: ListSuppliersQueryDto) {
    const conditions: SQL[] = [
      eq(suppliers.tenantId, actor.tenantId),
      isNull(suppliers.deletedAt),
    ];
    if (query.isActive !== undefined)
      conditions.push(eq(suppliers.isActive, query.isActive));
    if (query.search) {
      const term = `%${query.search.trim()}%`;
      conditions.push(
        or(
          ilike(suppliers.code, term),
          ilike(suppliers.name, term),
          ilike(suppliers.contactName, term),
          ilike(suppliers.email, term),
          ilike(suppliers.phone, term),
        )!,
      );
    }
    return this.database.db
      .select({
        id: suppliers.id,
        code: suppliers.code,
        name: suppliers.name,
        taxId: suppliers.taxId,
        contactName: suppliers.contactName,
        phone: suppliers.phone,
        email: suppliers.email,
        address: suppliers.address,
        paymentTermDays: suppliers.paymentTermDays,
        leadTimeDays: suppliers.leadTimeDays,
        isActive: suppliers.isActive,
        updatedAt: suppliers.updatedAt,
        activeCatalogCount: sql<number>`(select count(*)::int from supplier_ingredients si where si.supplier_id = ${suppliers.id} and si.is_active = true and si.deleted_at is null)`,
        purchaseOrderCount: sql<number>`(select count(*)::int from purchase_orders po where po.supplier_id = ${suppliers.id})`,
      })
      .from(suppliers)
      .where(and(...conditions))
      .orderBy(asc(suppliers.name));
  }

  async get(actor: AuthUser, id: string) {
    const [supplier] = await this.database.db
      .select()
      .from(suppliers)
      .where(
        and(
          eq(suppliers.id, id),
          eq(suppliers.tenantId, actor.tenantId),
          isNull(suppliers.deletedAt),
        ),
      )
      .limit(1);
    if (!supplier) throw new NotFoundException("Supplier tidak ditemukan.");
    const catalog = await this.catalog(actor, id, false);
    const [usage] = await this.database.db
      .select({ purchaseOrderCount: sql<number>`count(*)::int` })
      .from(purchaseOrders)
      .where(
        and(
          eq(purchaseOrders.tenantId, actor.tenantId),
          eq(purchaseOrders.supplierId, id),
        ),
      );
    return {
      ...supplier,
      catalog,
      purchaseOrderCount: usage?.purchaseOrderCount ?? 0,
    };
  }

  async lookups(actor: AuthUser) {
    const [ingredientRows, unitRows] = await Promise.all([
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
            eq(units.isActive, true),
            isNull(units.deletedAt),
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
    ]);
    return { ingredients: ingredientRows, units: unitRows };
  }

  async create(actor: AuthUser, dto: CreateSupplierDto) {
    const code = dto.code.trim().toUpperCase();
    await this.assertUniqueCode(actor.tenantId, code);
    const [created] = await this.database.db
      .insert(suppliers)
      .values({
        tenantId: actor.tenantId,
        code,
        name: dto.name.trim(),
        taxId: this.clean(dto.taxId),
        contactName: this.clean(dto.contactName),
        phone: this.clean(dto.phone),
        email: this.clean(dto.email)?.toLowerCase(),
        address: this.clean(dto.address),
        paymentTermDays: dto.paymentTermDays ?? 0,
        leadTimeDays: dto.leadTimeDays ?? 0,
        createdBy: actor.userId,
        updatedBy: actor.userId,
      })
      .returning();
    await this.audit.record({
      tenantId: actor.tenantId,
      actorUserId: actor.userId,
      action: "supplier.create",
      entityType: "supplier",
      entityId: created.id,
      afterData: created,
    });
    return this.get(actor, created.id);
  }

  async update(actor: AuthUser, id: string, dto: UpdateSupplierDto) {
    const before = await this.get(actor, id);
    const code = dto.code?.trim().toUpperCase();
    if (code && code !== before.code)
      await this.assertUniqueCode(actor.tenantId, code, id);
    const [updated] = await this.database.db
      .update(suppliers)
      .set({
        ...dto,
        ...(code ? { code } : {}),
        ...(dto.name ? { name: dto.name.trim() } : {}),
        ...(dto.taxId !== undefined ? { taxId: this.clean(dto.taxId) } : {}),
        ...(dto.contactName !== undefined
          ? { contactName: this.clean(dto.contactName) }
          : {}),
        ...(dto.phone !== undefined ? { phone: this.clean(dto.phone) } : {}),
        ...(dto.email !== undefined
          ? { email: this.clean(dto.email)?.toLowerCase() }
          : {}),
        ...(dto.address !== undefined
          ? { address: this.clean(dto.address) }
          : {}),
        updatedAt: new Date(),
        updatedBy: actor.userId,
      })
      .where(
        and(
          eq(suppliers.id, id),
          eq(suppliers.tenantId, actor.tenantId),
          isNull(suppliers.deletedAt),
        ),
      )
      .returning();
    if (!updated) throw new NotFoundException("Supplier tidak ditemukan.");
    await this.audit.record({
      tenantId: actor.tenantId,
      actorUserId: actor.userId,
      action: "supplier.update",
      entityType: "supplier",
      entityId: id,
      beforeData: before,
      afterData: updated,
    });
    return this.get(actor, id);
  }

  async setActive(actor: AuthUser, id: string, isActive: boolean) {
    const before = await this.get(actor, id);
    if (before.isActive === isActive) return before;
    const changedAt = new Date();
    await this.database.db.transaction(async (tx) => {
      await tx
        .update(suppliers)
        .set({ isActive, updatedAt: changedAt, updatedBy: actor.userId })
        .where(
          and(eq(suppliers.id, id), eq(suppliers.tenantId, actor.tenantId)),
        );
      if (!isActive)
        await tx
          .update(supplierIngredients)
          .set({
            isActive: false,
            isPreferred: false,
            updatedAt: changedAt,
            updatedBy: actor.userId,
          })
          .where(
            and(
              eq(supplierIngredients.tenantId, actor.tenantId),
              eq(supplierIngredients.supplierId, id),
              eq(supplierIngredients.isActive, true),
              isNull(supplierIngredients.deletedAt),
            ),
          );
    });
    const after = await this.get(actor, id);
    await this.audit.record({
      tenantId: actor.tenantId,
      actorUserId: actor.userId,
      action: isActive ? "supplier.activate" : "supplier.archive",
      entityType: "supplier",
      entityId: id,
      beforeData: before,
      afterData: after,
    });
    return after;
  }

  async catalog(actor: AuthUser, supplierId: string, assertSupplier = true) {
    if (assertSupplier)
      await this.assertSupplierExists(actor.tenantId, supplierId);
    return this.database.db
      .select({
        id: supplierIngredients.id,
        supplierId: supplierIngredients.supplierId,
        ingredientId: supplierIngredients.ingredientId,
        ingredientSku: ingredients.sku,
        ingredientName: ingredients.name,
        baseUnitId: ingredients.baseUnitId,
        purchaseUnitId: supplierIngredients.purchaseUnitId,
        purchaseUnitCode: units.code,
        purchaseUnitName: units.name,
        supplierSku: supplierIngredients.supplierSku,
        conversionToBase: supplierIngredients.conversionToBase,
        lastPrice: supplierIngredients.lastPrice,
        unitCostBase: sql<
          number | null
        >`case when ${supplierIngredients.lastPrice} is null then null else ${supplierIngredients.lastPrice} / ${supplierIngredients.conversionToBase} end`,
        minimumOrderQty: supplierIngredients.minimumOrderQty,
        isPreferred: supplierIngredients.isPreferred,
        isActive: supplierIngredients.isActive,
        updatedAt: supplierIngredients.updatedAt,
      })
      .from(supplierIngredients)
      .innerJoin(
        ingredients,
        eq(ingredients.id, supplierIngredients.ingredientId),
      )
      .innerJoin(units, eq(units.id, supplierIngredients.purchaseUnitId))
      .where(
        and(
          eq(supplierIngredients.tenantId, actor.tenantId),
          eq(supplierIngredients.supplierId, supplierId),
          isNull(supplierIngredients.deletedAt),
        ),
      )
      .orderBy(asc(ingredients.name), asc(units.name));
  }

  async createCatalog(
    actor: AuthUser,
    supplierId: string,
    dto: CreateSupplierCatalogDto,
  ) {
    await this.assertSupplierActive(actor.tenantId, supplierId);
    const conversion = await this.validateCatalogReferences(
      actor.tenantId,
      dto.ingredientId,
      dto.purchaseUnitId,
      dto.conversionToBase,
    );
    await this.assertUniqueCatalog(
      actor.tenantId,
      supplierId,
      dto.ingredientId,
      dto.purchaseUnitId,
    );
    const [tenant] = await this.database.db
      .select({ currencyCode: tenants.currencyCode })
      .from(tenants)
      .where(eq(tenants.id, actor.tenantId))
      .limit(1);
    if (!tenant) throw new NotFoundException("Tenant tidak ditemukan.");
    const created = await this.database.db.transaction(async (tx) => {
      if (dto.isPreferred)
        await tx
          .update(supplierIngredients)
          .set({
            isPreferred: false,
            updatedAt: new Date(),
            updatedBy: actor.userId,
          })
          .where(
            and(
              eq(supplierIngredients.tenantId, actor.tenantId),
              eq(supplierIngredients.ingredientId, dto.ingredientId),
              eq(supplierIngredients.isPreferred, true),
              eq(supplierIngredients.isActive, true),
              isNull(supplierIngredients.deletedAt),
            ),
          );
      const [row] = await tx
        .insert(supplierIngredients)
        .values({
          tenantId: actor.tenantId,
          supplierId,
          ingredientId: dto.ingredientId,
          purchaseUnitId: dto.purchaseUnitId,
          supplierSku: this.clean(dto.supplierSku),
          conversionToBase: Number(conversion),
          lastPrice: dto.lastPrice,
          minimumOrderQty: dto.minimumOrderQty ?? 1,
          isPreferred: dto.isPreferred ?? false,
          currencyCode: tenant.currencyCode,
          createdBy: actor.userId,
          updatedBy: actor.userId,
        })
        .returning();
      return row;
    });
    await this.audit.record({
      tenantId: actor.tenantId,
      actorUserId: actor.userId,
      action: "supplier.catalog.create",
      entityType: "supplier_catalog",
      entityId: created.id,
      afterData: created,
    });
    return created;
  }

  async updateCatalog(
    actor: AuthUser,
    supplierId: string,
    catalogId: string,
    dto: UpdateSupplierCatalogDto,
  ) {
    const before = await this.getCatalog(actor.tenantId, supplierId, catalogId);
    const ingredientId = dto.ingredientId ?? before.ingredientId;
    const purchaseUnitId = dto.purchaseUnitId ?? before.purchaseUnitId;
    const requestedConversion = dto.conversionToBase ?? Number(before.conversionToBase);
    await this.assertSupplierActive(actor.tenantId, supplierId);
    const conversion = await this.validateCatalogReferences(
      actor.tenantId,
      ingredientId,
      purchaseUnitId,
      requestedConversion,
    );
    if (
      ingredientId !== before.ingredientId ||
      purchaseUnitId !== before.purchaseUnitId
    )
      await this.assertUniqueCatalog(
        actor.tenantId,
        supplierId,
        ingredientId,
        purchaseUnitId,
        catalogId,
      );
    const updated = await this.database.db.transaction(async (tx) => {
      if (dto.isPreferred === true)
        await tx
          .update(supplierIngredients)
          .set({
            isPreferred: false,
            updatedAt: new Date(),
            updatedBy: actor.userId,
          })
          .where(
            and(
              eq(supplierIngredients.tenantId, actor.tenantId),
              eq(supplierIngredients.ingredientId, ingredientId),
              eq(supplierIngredients.isPreferred, true),
              eq(supplierIngredients.isActive, true),
              isNull(supplierIngredients.deletedAt),
            ),
          );
      const [row] = await tx
        .update(supplierIngredients)
        .set({
          ...dto,
          ingredientId,
          purchaseUnitId,
          conversionToBase: Number(conversion),
          ...(dto.supplierSku !== undefined
            ? { supplierSku: this.clean(dto.supplierSku) }
            : {}),
          updatedAt: new Date(),
          updatedBy: actor.userId,
        })
        .where(
          and(
            eq(supplierIngredients.id, catalogId),
            eq(supplierIngredients.tenantId, actor.tenantId),
            eq(supplierIngredients.supplierId, supplierId),
            eq(supplierIngredients.isActive, true),
            isNull(supplierIngredients.deletedAt),
          ),
        )
        .returning();
      if (!row)
        throw new ConflictException("Hanya katalog aktif yang dapat diubah.");
      return row;
    });
    await this.audit.record({
      tenantId: actor.tenantId,
      actorUserId: actor.userId,
      action: "supplier.catalog.update",
      entityType: "supplier_catalog",
      entityId: catalogId,
      beforeData: before,
      afterData: updated,
    });
    return updated;
  }

  async setCatalogActive(
    actor: AuthUser,
    supplierId: string,
    catalogId: string,
    isActive: boolean,
  ) {
    const before = await this.getCatalog(actor.tenantId, supplierId, catalogId);
    if (before.isActive === isActive) return before;
    if (isActive) {
      await this.assertSupplierActive(actor.tenantId, supplierId);
      await this.validateCatalogReferences(
        actor.tenantId,
        before.ingredientId,
        before.purchaseUnitId,
        Number(before.conversionToBase),
      );
    }
    const [updated] = await this.database.db
      .update(supplierIngredients)
      .set({
        isActive,
        isPreferred: false,
        updatedAt: new Date(),
        updatedBy: actor.userId,
      })
      .where(
        and(
          eq(supplierIngredients.id, catalogId),
          eq(supplierIngredients.tenantId, actor.tenantId),
          eq(supplierIngredients.supplierId, supplierId),
          isNull(supplierIngredients.deletedAt),
        ),
      )
      .returning();
    await this.audit.record({
      tenantId: actor.tenantId,
      actorUserId: actor.userId,
      action: isActive
        ? "supplier.catalog.activate"
        : "supplier.catalog.archive",
      entityType: "supplier_catalog",
      entityId: catalogId,
      beforeData: before,
      afterData: updated,
    });
    return updated;
  }

  private async validateCatalogReferences(
    tenantId: string,
    ingredientId: string,
    purchaseUnitId: string,
    conversion: number,
  ): Promise<string> {
    const [ingredient] = await this.database.db
      .select({
        id: ingredients.id,
        baseUnitId: ingredients.baseUnitId,
        baseDimension: units.dimension,
      })
      .from(ingredients)
      .innerJoin(units, eq(units.id, ingredients.baseUnitId))
      .where(
        and(
          eq(ingredients.id, ingredientId),
          eq(ingredients.tenantId, tenantId),
          eq(ingredients.isActive, true),
          isNull(ingredients.deletedAt),
        ),
      )
      .limit(1);
    const [purchaseUnit] = await this.database.db
      .select({ id: units.id, dimension: units.dimension })
      .from(units)
      .where(
        and(
          eq(units.id, purchaseUnitId),
          eq(units.tenantId, tenantId),
          eq(units.isActive, true),
          isNull(units.deletedAt),
        ),
      )
      .limit(1);
    if (!ingredient)
      throw new BadRequestException(
        "Bahan aktif tidak ditemukan pada tenant ini.",
      );
    if (!purchaseUnit)
      throw new BadRequestException(
        "Purchase unit aktif tidak ditemukan pada tenant ini.",
      );
    if (ingredient.baseDimension !== purchaseUnit.dimension)
      throw new BadRequestException(
        "Dimensi purchase unit harus sama dengan base unit bahan.",
      );
    const resolved = await this.conversions.resolve(tenantId, purchaseUnitId, ingredient.baseUnitId);
    const requested = formatDecimal(decimal(String(conversion), 6), 6);
    const authoritative = formatDecimal(decimal(resolved, 6), 6);
    if (requested !== authoritative)
      throw new BadRequestException(
        "Conversion katalog bertentangan dengan master konversi satuan.",
      );
    return authoritative;
  }
  private async assertUniqueCode(
    tenantId: string,
    code: string,
    excludeId?: string,
  ) {
    const [row] = await this.database.db
      .select({ id: suppliers.id })
      .from(suppliers)
      .where(and(eq(suppliers.tenantId, tenantId), eq(suppliers.code, code)))
      .limit(1);
    if (row && row.id !== excludeId)
      throw new ConflictException(
        "Kode supplier sudah pernah digunakan pada tenant ini.",
      );
  }
  private async assertSupplierExists(tenantId: string, id: string) {
    const [row] = await this.database.db
      .select({ id: suppliers.id })
      .from(suppliers)
      .where(
        and(
          eq(suppliers.id, id),
          eq(suppliers.tenantId, tenantId),
          isNull(suppliers.deletedAt),
        ),
      )
      .limit(1);
    if (!row) throw new NotFoundException("Supplier tidak ditemukan.");
  }
  private async assertSupplierActive(tenantId: string, id: string) {
    const [row] = await this.database.db
      .select({ id: suppliers.id })
      .from(suppliers)
      .where(
        and(
          eq(suppliers.id, id),
          eq(suppliers.tenantId, tenantId),
          eq(suppliers.isActive, true),
          isNull(suppliers.deletedAt),
        ),
      )
      .limit(1);
    if (!row) throw new NotFoundException("Supplier aktif tidak ditemukan.");
  }
  private async getCatalog(tenantId: string, supplierId: string, id: string) {
    const [row] = await this.database.db
      .select()
      .from(supplierIngredients)
      .where(
        and(
          eq(supplierIngredients.id, id),
          eq(supplierIngredients.tenantId, tenantId),
          eq(supplierIngredients.supplierId, supplierId),
          isNull(supplierIngredients.deletedAt),
        ),
      )
      .limit(1);
    if (!row) throw new NotFoundException("Katalog supplier tidak ditemukan.");
    return row;
  }
  private async assertUniqueCatalog(
    tenantId: string,
    supplierId: string,
    ingredientId: string,
    purchaseUnitId: string,
    excludeId?: string,
  ) {
    const [row] = await this.database.db
      .select({ id: supplierIngredients.id })
      .from(supplierIngredients)
      .where(
        and(
          eq(supplierIngredients.tenantId, tenantId),
          eq(supplierIngredients.supplierId, supplierId),
          eq(supplierIngredients.ingredientId, ingredientId),
          eq(supplierIngredients.purchaseUnitId, purchaseUnitId),
        ),
      )
      .limit(1);
    if (row && row.id !== excludeId)
      throw new ConflictException(
        "Kombinasi bahan dan purchase unit sudah ada pada supplier ini.",
      );
  }
  private clean(value?: string | null) {
    const result = value?.trim();
    return result || null;
  }
}
