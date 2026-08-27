import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  SQL,
  and,
  asc,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNull,
  lte,
  or,
  sql,
} from "drizzle-orm";
import { AuthUser } from "../common/types/auth-user";
import { DatabaseService } from "../database/database.service";
import {
  goodsReceiptItems,
  goodsReceipts,
  ingredientCategories,
  ingredientOutletSettings,
  ingredients,
  outlets,
  stockBatches,
  stockMovementLines,
  stockMovements,
  storageLocations,
  units,
  users,
} from "../database/schema";
import { ListInventoryQueryDto } from "./dto/list-inventory-query.dto";
import { ListStockMovementsQueryDto } from "./dto/list-stock-movements-query.dto";
import { weightedInventoryCost } from "./inventory-valuation.service";

type InventoryStatus = "out" | "critical" | "low" | "safe";

@Injectable()
export class InventoryService {
  constructor(private readonly database: DatabaseService) {}

  async overview(actor: AuthUser, query: ListInventoryQueryDto) {
    if (query.outletId) await this.assertOutletAccess(actor, query.outletId);
    const conditions: SQL[] = [eq(stockBatches.tenantId, actor.tenantId)];
    if (query.outletId)
      conditions.push(eq(stockBatches.outletId, query.outletId));
    else if (actor.outletIds.length)
      conditions.push(inArray(stockBatches.outletId, actor.outletIds));
    if (query.locationId)
      conditions.push(eq(stockBatches.storageLocationId, query.locationId));
    if (query.categoryId)
      conditions.push(eq(ingredients.categoryId, query.categoryId));
    if (query.search?.trim()) {
      const term = `%${query.search.trim()}%`;
      conditions.push(
        or(
          ilike(ingredients.sku, term),
          ilike(ingredients.name, term),
          ilike(ingredientCategories.name, term),
          ilike(storageLocations.name, term),
        )!,
      );
    }

    const rows = await this.database.db
      .select({
        ingredientId: ingredients.id,
        sku: ingredients.sku,
        ingredientName: ingredients.name,
        categoryId: ingredients.categoryId,
        categoryName: ingredientCategories.name,
        isPerishable: ingredients.isPerishable,
        unitCode: units.code,
        unitName: units.name,
        outletId: outlets.id,
        outletName: outlets.name,
        onHand: sql<number>`coalesce(sum(${stockBatches.quantityOnHand}), 0)`,
        stockValue: sql<number>`coalesce(sum(${stockBatches.quantityOnHand} * ${stockBatches.unitCost}), 0)`,
        weightedUnitCost: sql<number>`coalesce(${weightedInventoryCost}, 0)`,
        minimumStock: ingredientOutletSettings.minimumStock,
        reorderPoint: ingredientOutletSettings.reorderPoint,
        parStock: ingredientOutletSettings.parStock,
        batchCount: sql<number>`count(*) filter (where ${stockBatches.quantityOnHand} > 0)::int`,
        locationCount: sql<number>`count(distinct ${stockBatches.storageLocationId}) filter (where ${stockBatches.quantityOnHand} <> 0)::int`,
        locationNames: sql<string>`coalesce(string_agg(distinct ${storageLocations.name}, ', ' order by ${storageLocations.name}) filter (where ${stockBatches.quantityOnHand} <> 0), '')`,
        nearestExpiry: sql<
          string | null
        >`min(${stockBatches.expiryDate}) filter (where ${stockBatches.quantityOnHand} > 0)`,
        lastUpdatedAt: sql<Date>`max(${stockBatches.updatedAt})`,
      })
      .from(stockBatches)
      .innerJoin(ingredients, eq(ingredients.id, stockBatches.ingredientId))
      .innerJoin(units, eq(units.id, ingredients.baseUnitId))
      .innerJoin(outlets, eq(outlets.id, stockBatches.outletId))
      .innerJoin(
        storageLocations,
        eq(storageLocations.id, stockBatches.storageLocationId),
      )
      .leftJoin(
        ingredientCategories,
        eq(ingredientCategories.id, ingredients.categoryId),
      )
      .leftJoin(
        ingredientOutletSettings,
        and(
          eq(ingredientOutletSettings.ingredientId, ingredients.id),
          eq(ingredientOutletSettings.outletId, stockBatches.outletId),
          eq(ingredientOutletSettings.tenantId, actor.tenantId),
        ),
      )
      .where(and(...conditions))
      .groupBy(
        ingredients.id,
        ingredients.sku,
        ingredients.name,
        ingredients.categoryId,
        ingredientCategories.name,
        ingredients.isPerishable,
        units.code,
        units.name,
        outlets.id,
        outlets.name,
        ingredientOutletSettings.minimumStock,
        ingredientOutletSettings.reorderPoint,
        ingredientOutletSettings.parStock,
      )
      .orderBy(asc(ingredients.name), asc(outlets.name));

    const today = this.dateOnly(new Date());
    let items = rows.map((row) => {
      const onHand = Number(row.onHand);
      const minimumStock = Number(row.minimumStock ?? 0);
      const reorderPoint = Number(row.reorderPoint ?? 0);
      const status = this.stockStatus(onHand, minimumStock, reorderPoint);
      const expiryDays = row.nearestExpiry
        ? this.daysBetween(today, row.nearestExpiry)
        : null;
      return {
        ...row,
        onHand,
        stockValue: Number(row.stockValue),
        weightedUnitCost: Number(row.weightedUnitCost),
        minimumStock,
        reorderPoint,
        parStock: Number(row.parStock ?? 0),
        batchCount: Number(row.batchCount),
        locationCount: Number(row.locationCount),
        status,
        expiryDays,
      };
    });
    if (query.status)
      items = items.filter((item) => item.status === query.status);
    if (query.expiryWithinDays !== undefined) {
      items = items.filter(
        (item) =>
          item.expiryDays !== null &&
          item.expiryDays <= query.expiryWithinDays!,
      );
    }

    const categoryMap = new Map<
      string,
      { categoryId: string | null; categoryName: string; stockValue: number }
    >();
    for (const item of items) {
      const key = item.categoryId ?? "uncategorized";
      const current = categoryMap.get(key) ?? {
        categoryId: item.categoryId,
        categoryName: item.categoryName ?? "Tanpa Kategori",
        stockValue: 0,
      };
      current.stockValue += item.stockValue;
      categoryMap.set(key, current);
    }

    return {
      summary: {
        skuCount: items.length,
        totalQuantity: items.reduce((sum, item) => sum + item.onHand, 0),
        stockValue: items.reduce((sum, item) => sum + item.stockValue, 0),
        attentionCount: items.filter(
          (item) =>
            item.status !== "safe" ||
            (item.expiryDays !== null && item.expiryDays <= 7),
        ).length,
        expiringBatchCount: items.filter(
          (item) =>
            item.expiryDays !== null &&
            item.expiryDays >= 0 &&
            item.expiryDays <= 7,
        ).length,
        expiredBatchCount: items.filter(
          (item) => item.expiryDays !== null && item.expiryDays < 0,
        ).length,
      },
      categories: [...categoryMap.values()].sort(
        (a, b) => b.stockValue - a.stockValue,
      ),
      items,
      generatedAt: new Date().toISOString(),
    };
  }

  async lookups(actor: AuthUser) {
    const outletConditions: SQL[] = [
      eq(outlets.tenantId, actor.tenantId),
      isNull(outlets.deletedAt),
    ];
    if (actor.outletIds.length)
      outletConditions.push(inArray(outlets.id, actor.outletIds));
    const locationConditions: SQL[] = [
      eq(storageLocations.tenantId, actor.tenantId),
      eq(storageLocations.isActive, true),
      isNull(storageLocations.deletedAt),
    ];
    if (actor.outletIds.length)
      locationConditions.push(
        inArray(storageLocations.outletId, actor.outletIds),
      );
    const [outletRows, locationRows, categoryRows] = await Promise.all([
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
          locationType: storageLocations.locationType,
        })
        .from(storageLocations)
        .where(and(...locationConditions))
        .orderBy(asc(storageLocations.name)),
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
    ]);
    return {
      outlets: outletRows,
      storageLocations: locationRows,
      categories: categoryRows,
    };
  }

  async detail(actor: AuthUser, ingredientId: string, outletId: string) {
    await this.assertOutletAccess(actor, outletId);
    const overview = await this.overview(actor, { outletId });
    const item = overview.items.find(
      (entry) => entry.ingredientId === ingredientId,
    );
    if (!item)
      throw new NotFoundException("Posisi stok bahan tidak ditemukan.");

    const batches = await this.database.db
      .select({
        id: stockBatches.id,
        batchNo: stockBatches.batchNo,
        receivedDate: stockBatches.receivedDate,
        expiryDate: stockBatches.expiryDate,
        quantityOnHand: stockBatches.quantityOnHand,
        unitCost: stockBatches.unitCost,
        storageLocationId: storageLocations.id,
        storageLocationCode: storageLocations.code,
        storageLocationName: storageLocations.name,
        sourceReceiptNo: goodsReceipts.receiptNo,
        updatedAt: stockBatches.updatedAt,
      })
      .from(stockBatches)
      .innerJoin(
        storageLocations,
        eq(storageLocations.id, stockBatches.storageLocationId),
      )
      .leftJoin(
        goodsReceiptItems,
        eq(goodsReceiptItems.id, stockBatches.sourceReceiptItemId),
      )
      .leftJoin(
        goodsReceipts,
        eq(goodsReceipts.id, goodsReceiptItems.goodsReceiptId),
      )
      .where(
        and(
          eq(stockBatches.tenantId, actor.tenantId),
          eq(stockBatches.outletId, outletId),
          eq(stockBatches.ingredientId, ingredientId),
        ),
      )
      .orderBy(
        sql`${stockBatches.expiryDate} asc nulls last`,
        desc(stockBatches.receivedDate),
      );

    const locationMap = new Map<
      string,
      {
        id: string;
        code: string;
        name: string;
        quantityOnHand: number;
        stockValue: number;
        batchCount: number;
      }
    >();
    for (const batch of batches) {
      const current = locationMap.get(batch.storageLocationId) ?? {
        id: batch.storageLocationId,
        code: batch.storageLocationCode,
        name: batch.storageLocationName,
        quantityOnHand: 0,
        stockValue: 0,
        batchCount: 0,
      };
      const quantity = Number(batch.quantityOnHand);
      current.quantityOnHand += quantity;
      current.stockValue += quantity * Number(batch.unitCost);
      if (quantity > 0) current.batchCount += 1;
      locationMap.set(batch.storageLocationId, current);
    }

    const movementRows = await this.movements(actor, {
      outletId,
      ingredientId,
    });
    return {
      ...item,
      locations: [...locationMap.values()].sort(
        (a, b) => b.quantityOnHand - a.quantityOnHand,
      ),
      batches: batches.map((batch) => ({
        ...batch,
        quantityOnHand: Number(batch.quantityOnHand),
        unitCost: Number(batch.unitCost),
        stockValue: Number(batch.quantityOnHand) * Number(batch.unitCost),
        expiryDays: batch.expiryDate
          ? this.daysBetween(this.dateOnly(new Date()), batch.expiryDate)
          : null,
      })),
      movements: movementRows.slice(0, 50),
    };
  }

  async movements(actor: AuthUser, query: ListStockMovementsQueryDto) {
    this.validateDateRange(query.dateFrom, query.dateTo);
    if (query.outletId) await this.assertOutletAccess(actor, query.outletId);
    const conditions: SQL[] = [eq(stockMovements.tenantId, actor.tenantId)];
    if (query.outletId)
      conditions.push(eq(stockMovements.outletId, query.outletId));
    else if (actor.outletIds.length)
      conditions.push(inArray(stockMovements.outletId, actor.outletIds));
    if (query.ingredientId)
      conditions.push(eq(stockMovementLines.ingredientId, query.ingredientId));
    if (query.locationId)
      conditions.push(
        eq(stockMovementLines.storageLocationId, query.locationId),
      );
    if (query.movementType)
      conditions.push(eq(stockMovements.movementType, query.movementType));
    if (query.dateFrom)
      conditions.push(
        gte(stockMovements.movementAt, new Date(`${query.dateFrom}T00:00:00Z`)),
      );
    if (query.dateTo)
      conditions.push(
        lte(
          stockMovements.movementAt,
          new Date(`${query.dateTo}T23:59:59.999Z`),
        ),
      );

    const rows = await this.database.db
      .select({
        id: stockMovementLines.id,
        movementId: stockMovements.id,
        movementNo: stockMovements.movementNo,
        movementType: stockMovements.movementType,
        movementAt: stockMovements.movementAt,
        businessDate: stockMovements.businessDate,
        status: stockMovements.status,
        referenceType: stockMovements.referenceType,
        referenceId: stockMovements.referenceId,
        referenceNo: sql<string>`coalesce(${goodsReceipts.receiptNo}, ${stockMovements.movementNo})`,
        reason: stockMovements.reason,
        ingredientId: ingredients.id,
        ingredientSku: ingredients.sku,
        ingredientName: ingredients.name,
        unitCode: units.code,
        outletId: outlets.id,
        outletName: outlets.name,
        storageLocationId: storageLocations.id,
        storageLocationCode: storageLocations.code,
        storageLocationName: storageLocations.name,
        batchId: stockBatches.id,
        batchNo: stockBatches.batchNo,
        quantityDelta: stockMovementLines.quantityDelta,
        unitCost: stockMovementLines.unitCost,
        valueDelta: stockMovementLines.valueDelta,
        balanceAfter: stockMovementLines.balanceAfter,
        actorName: users.fullName,
      })
      .from(stockMovementLines)
      .innerJoin(
        stockMovements,
        eq(stockMovements.id, stockMovementLines.stockMovementId),
      )
      .innerJoin(
        ingredients,
        eq(ingredients.id, stockMovementLines.ingredientId),
      )
      .innerJoin(units, eq(units.id, ingredients.baseUnitId))
      .innerJoin(outlets, eq(outlets.id, stockMovements.outletId))
      .innerJoin(
        storageLocations,
        eq(storageLocations.id, stockMovementLines.storageLocationId),
      )
      .leftJoin(
        stockBatches,
        eq(stockBatches.id, stockMovementLines.stockBatchId),
      )
      .leftJoin(goodsReceipts, eq(goodsReceipts.id, stockMovements.referenceId))
      .leftJoin(users, eq(users.id, stockMovements.createdBy))
      .where(and(...conditions))
      .orderBy(
        desc(stockMovements.movementAt),
        desc(stockMovementLines.createdAt),
      )
      .limit(250);

    return rows.map((row) => ({
      ...row,
      quantityDelta: Number(row.quantityDelta),
      unitCost: Number(row.unitCost),
      valueDelta: Number(row.valueDelta),
      balanceAfter: row.balanceAfter === null ? null : Number(row.balanceAfter),
    }));
  }

  private stockStatus(
    onHand: number,
    minimumStock: number,
    reorderPoint: number,
  ): InventoryStatus {
    if (onHand <= 0) return "out";
    if (minimumStock > 0 && onHand <= minimumStock) return "critical";
    if (reorderPoint > 0 && onHand <= reorderPoint) return "low";
    return "safe";
  }

  private async assertOutletAccess(actor: AuthUser, outletId: string) {
    if (actor.outletIds.length && !actor.outletIds.includes(outletId)) {
      throw new ForbiddenException("Anda tidak memiliki akses ke outlet ini.");
    }
    const [outlet] = await this.database.db
      .select({ id: outlets.id })
      .from(outlets)
      .where(
        and(
          eq(outlets.id, outletId),
          eq(outlets.tenantId, actor.tenantId),
          isNull(outlets.deletedAt),
        ),
      )
      .limit(1);
    if (!outlet) throw new NotFoundException("Outlet tidak ditemukan.");
  }

  private validateDateRange(dateFrom?: string, dateTo?: string) {
    if (dateFrom && dateTo && dateFrom > dateTo) {
      throw new BadRequestException(
        "Tanggal awal tidak boleh melewati tanggal akhir.",
      );
    }
  }

  private dateOnly(value: Date) {
    return value.toISOString().slice(0, 10);
  }

  private daysBetween(from: string, to: string) {
    return Math.ceil(
      (new Date(`${to}T00:00:00Z`).getTime() -
        new Date(`${from}T00:00:00Z`).getTime()) /
        86_400_000,
    );
  }
}
