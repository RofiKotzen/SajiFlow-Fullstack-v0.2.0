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
import { AuditService } from "../audit/audit.service";
import { AuthUser } from "../common/types/auth-user";
import { DatabaseService } from "../database/database.service";
import {
  auditLogs,
  documentSequences,
  ingredientCategories,
  ingredients,
  outlets,
  purchaseOrderItems,
  purchaseOrders,
  supplierIngredients,
  suppliers,
  units,
  users,
} from "../database/schema";
import { CreatePurchaseOrderDto } from "./dto/create-purchase-order.dto";
import { ListPurchaseOrdersQueryDto } from "./dto/list-purchase-orders-query.dto";
import { PurchaseOrderItemDto } from "./dto/purchase-order-item.dto";
import { UpdatePurchaseOrderDto } from "./dto/update-purchase-order.dto";

type PurchaseOrderStatus =
  | "draft"
  | "approved"
  | "sent"
  | "partially_received"
  | "received"
  | "closed"
  | "cancelled";

@Injectable()
export class PurchaseOrdersService {
  constructor(
    private readonly database: DatabaseService,
    private readonly audit: AuditService,
  ) {}

  async list(actor: AuthUser, query: ListPurchaseOrdersQueryDto) {
    this.validateDateRange(query.dateFrom, query.dateTo);
    const conditions: SQL[] = [eq(purchaseOrders.tenantId, actor.tenantId)];
    if (query.outletId) {
      await this.assertOutletAccess(actor, query.outletId);
      conditions.push(eq(purchaseOrders.outletId, query.outletId));
    } else if (actor.outletIds.length) {
      conditions.push(inArray(purchaseOrders.outletId, actor.outletIds));
    }
    if (query.supplierId)
      conditions.push(eq(purchaseOrders.supplierId, query.supplierId));
    if (query.status) conditions.push(eq(purchaseOrders.status, query.status));
    if (query.dateFrom)
      conditions.push(gte(purchaseOrders.orderDate, query.dateFrom));
    if (query.dateTo)
      conditions.push(lte(purchaseOrders.orderDate, query.dateTo));
    if (query.search) {
      const search = `%${query.search.trim()}%`;
      conditions.push(
        or(ilike(purchaseOrders.poNo, search), ilike(suppliers.name, search))!,
      );
    }

    return this.database.db
      .select({
        id: purchaseOrders.id,
        outletId: purchaseOrders.outletId,
        outletName: outlets.name,
        poNo: purchaseOrders.poNo,
        supplierId: purchaseOrders.supplierId,
        supplierName: suppliers.name,
        orderDate: purchaseOrders.orderDate,
        expectedDate: purchaseOrders.expectedDate,
        status: purchaseOrders.status,
        subtotal: purchaseOrders.subtotal,
        discountAmount: purchaseOrders.discountAmount,
        taxAmount: purchaseOrders.taxAmount,
        shippingAmount: purchaseOrders.shippingAmount,
        grandTotal: purchaseOrders.grandTotal,
        currencyCode: purchaseOrders.currencyCode,
        itemCount: sql<number>`(
          select count(*)::int from purchase_order_items poi
          where poi.purchase_order_id = ${purchaseOrders.id}
        )`,
        updatedAt: purchaseOrders.updatedAt,
      })
      .from(purchaseOrders)
      .innerJoin(outlets, eq(outlets.id, purchaseOrders.outletId))
      .innerJoin(suppliers, eq(suppliers.id, purchaseOrders.supplierId))
      .where(and(...conditions))
      .orderBy(desc(purchaseOrders.orderDate), desc(purchaseOrders.createdAt));
  }

  async lookups(actor: AuthUser) {
    const supplierRows = await this.database.db
      .select({
        id: suppliers.id,
        code: suppliers.code,
        name: suppliers.name,
        contactName: suppliers.contactName,
        phone: suppliers.phone,
        paymentTermDays: suppliers.paymentTermDays,
        leadTimeDays: suppliers.leadTimeDays,
      })
      .from(suppliers)
      .where(
        and(
          eq(suppliers.tenantId, actor.tenantId),
          eq(suppliers.isActive, true),
          isNull(suppliers.deletedAt),
        ),
      )
      .orderBy(asc(suppliers.name));

    const catalog = await this.database.db
      .select({
        id: supplierIngredients.id,
        supplierId: supplierIngredients.supplierId,
        ingredientId: supplierIngredients.ingredientId,
        ingredientSku: ingredients.sku,
        ingredientName: ingredients.name,
        categoryName: ingredientCategories.name,
        purchaseUnitId: supplierIngredients.purchaseUnitId,
        purchaseUnitCode: units.code,
        purchaseUnitName: units.name,
        conversionToBase: supplierIngredients.conversionToBase,
        lastPrice: supplierIngredients.lastPrice,
        minimumOrderQty: supplierIngredients.minimumOrderQty,
        isPreferred: supplierIngredients.isPreferred,
      })
      .from(supplierIngredients)
      .innerJoin(
        ingredients,
        eq(ingredients.id, supplierIngredients.ingredientId),
      )
      .innerJoin(units, eq(units.id, supplierIngredients.purchaseUnitId))
      .leftJoin(
        ingredientCategories,
        eq(ingredientCategories.id, ingredients.categoryId),
      )
      .where(
        and(
          eq(supplierIngredients.tenantId, actor.tenantId),
          eq(ingredients.isActive, true),
          isNull(ingredients.deletedAt),
          eq(units.isActive, true),
          isNull(units.deletedAt),
        ),
      )
      .orderBy(asc(ingredients.name), asc(units.name));

    return { suppliers: supplierRows, catalog };
  }

  async get(actor: AuthUser, id: string) {
    const base = await this.getBase(actor, id);
    const history = await this.database.db
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        reason: auditLogs.reason,
        actorUserId: auditLogs.actorUserId,
        actorName: users.fullName,
        occurredAt: auditLogs.occurredAt,
      })
      .from(auditLogs)
      .leftJoin(users, eq(users.id, auditLogs.actorUserId))
      .where(
        and(
          eq(auditLogs.tenantId, actor.tenantId),
          eq(auditLogs.entityType, "purchase_order"),
          eq(auditLogs.entityId, id),
        ),
      )
      .orderBy(desc(auditLogs.occurredAt));
    return { ...base, history };
  }

  async create(actor: AuthUser, dto: CreatePurchaseOrderDto) {
    await this.assertOutletAccess(actor, dto.outletId);
    await this.assertSupplier(actor.tenantId, dto.supplierId);
    this.validateExpectedDate(dto.orderDate, dto.expectedDate);
    const normalized = await this.normalizeItems(
      actor.tenantId,
      dto.supplierId,
      dto.items,
    );
    const totals = this.totals(normalized, dto.shippingAmount ?? 0);

    const created = await this.database.db.transaction(async (tx) => {
      const [sequence] = await tx
        .insert(documentSequences)
        .values({
          tenantId: actor.tenantId,
          outletId: dto.outletId,
          documentType: "purchase_order",
          businessDate: dto.orderDate,
          lastNumber: 1,
          prefixPattern: "PO-{YYMMDD}-{####}",
          createdBy: actor.userId,
          updatedBy: actor.userId,
        })
        .onConflictDoUpdate({
          target: [
            documentSequences.tenantId,
            documentSequences.outletId,
            documentSequences.documentType,
            documentSequences.businessDate,
          ],
          set: {
            lastNumber: sql`${documentSequences.lastNumber} + 1`,
            updatedAt: new Date(),
            updatedBy: actor.userId,
          },
        })
        .returning({ lastNumber: documentSequences.lastNumber });
      const poNo = `PO-${dto.orderDate.replaceAll("-", "").slice(2)}-${String(sequence.lastNumber).padStart(4, "0")}`;
      const [header] = await tx
        .insert(purchaseOrders)
        .values({
          tenantId: actor.tenantId,
          outletId: dto.outletId,
          poNo,
          supplierId: dto.supplierId,
          purchaseRequestId: dto.purchaseRequestId,
          orderDate: dto.orderDate,
          expectedDate: dto.expectedDate,
          ...totals,
          notes: dto.notes?.trim(),
          createdBy: actor.userId,
          updatedBy: actor.userId,
        })
        .returning();
      await tx.insert(purchaseOrderItems).values(
        normalized.map((item) => ({
          ...item,
          tenantId: actor.tenantId,
          purchaseOrderId: header.id,
          createdBy: actor.userId,
          updatedBy: actor.userId,
        })),
      );
      return header;
    });

    const after = await this.getBase(actor, created.id);
    await this.audit.record({
      tenantId: actor.tenantId,
      outletId: created.outletId,
      actorUserId: actor.userId,
      action: "purchase_order.create",
      entityType: "purchase_order",
      entityId: created.id,
      afterData: after,
    });
    return this.get(actor, created.id);
  }

  async update(actor: AuthUser, id: string, dto: UpdatePurchaseOrderDto) {
    const before = await this.get(actor, id);
    if (before.status !== "draft") {
      throw new ConflictException(
        "Hanya purchase order draft yang dapat diubah",
      );
    }
    const outletId = dto.outletId ?? before.outletId;
    const supplierId = dto.supplierId ?? before.supplierId;
    const orderDate = dto.orderDate ?? before.orderDate;
    const expectedDate = dto.expectedDate ?? before.expectedDate ?? undefined;
    const items: PurchaseOrderItemDto[] =
      dto.items ??
      before.items.map((item) => ({
        ingredientId: item.ingredientId,
        purchaseUnitId: item.purchaseUnitId,
        quantityOrdered: item.quantityOrdered,
        unitPrice: item.unitPrice,
        discountAmount: item.discountAmount,
        taxAmount: item.taxAmount,
      }));
    await this.assertOutletAccess(actor, outletId);
    await this.assertSupplier(actor.tenantId, supplierId);
    this.validateExpectedDate(orderDate, expectedDate);
    const normalized = await this.normalizeItems(
      actor.tenantId,
      supplierId,
      items,
    );
    const totals = this.totals(
      normalized,
      dto.shippingAmount ?? before.shippingAmount,
    );

    await this.database.db.transaction(async (tx) => {
      await tx
        .update(purchaseOrders)
        .set({
          outletId,
          supplierId,
          purchaseRequestId: dto.purchaseRequestId ?? before.purchaseRequestId,
          orderDate,
          expectedDate,
          ...totals,
          notes: dto.notes?.trim() ?? before.notes,
          updatedAt: new Date(),
          updatedBy: actor.userId,
        })
        .where(
          and(
            eq(purchaseOrders.id, id),
            eq(purchaseOrders.tenantId, actor.tenantId),
          ),
        );
      await tx
        .delete(purchaseOrderItems)
        .where(
          and(
            eq(purchaseOrderItems.purchaseOrderId, id),
            eq(purchaseOrderItems.tenantId, actor.tenantId),
          ),
        );
      await tx.insert(purchaseOrderItems).values(
        normalized.map((item) => ({
          ...item,
          tenantId: actor.tenantId,
          purchaseOrderId: id,
          createdBy: actor.userId,
          updatedBy: actor.userId,
        })),
      );
    });

    const after = await this.getBase(actor, id);
    await this.audit.record({
      tenantId: actor.tenantId,
      outletId,
      actorUserId: actor.userId,
      action: "purchase_order.update",
      entityType: "purchase_order",
      entityId: id,
      beforeData: this.withoutHistory(before),
      afterData: after,
    });
    return this.get(actor, id);
  }

  approve(actor: AuthUser, id: string, reason?: string) {
    return this.transition(actor, id, "draft", "approved", "approve", reason);
  }

  send(actor: AuthUser, id: string, reason?: string) {
    return this.transition(actor, id, "approved", "sent", "send", reason);
  }

  async cancel(actor: AuthUser, id: string, reason: string) {
    const before = await this.get(actor, id);
    if (!["draft", "approved", "sent"].includes(before.status)) {
      throw new ConflictException("PO pada status ini tidak dapat dibatalkan");
    }
    if (before.items.some((item) => item.quantityReceived > 0)) {
      throw new ConflictException(
        "PO yang sudah memiliki penerimaan tidak dapat dibatalkan",
      );
    }
    return this.transitionFromDetail(
      actor,
      before,
      "cancelled",
      "cancel",
      reason,
    );
  }

  close(actor: AuthUser, id: string, reason?: string) {
    return this.transition(actor, id, "received", "closed", "close", reason);
  }

  private async transition(
    actor: AuthUser,
    id: string,
    fromStatus: PurchaseOrderStatus,
    toStatus: PurchaseOrderStatus,
    action: string,
    reason?: string,
  ) {
    const before = await this.get(actor, id);
    if (before.status !== fromStatus) {
      throw new ConflictException(
        `Hanya purchase order ${fromStatus} yang dapat diproses dengan aksi ini`,
      );
    }
    if (action === "approve") {
      if (!before.items.length || before.grandTotal <= 0) {
        throw new BadRequestException(
          "Purchase order harus memiliki item dan total lebih dari nol",
        );
      }
      await this.assertSupplier(actor.tenantId, before.supplierId);
    }
    return this.transitionFromDetail(actor, before, toStatus, action, reason);
  }

  private async transitionFromDetail(
    actor: AuthUser,
    before: Awaited<ReturnType<PurchaseOrdersService["get"]>>,
    toStatus: PurchaseOrderStatus,
    action: string,
    reason?: string,
  ) {
    const changedAt = new Date();
    const [updated] = await this.database.db
      .update(purchaseOrders)
      .set({ status: toStatus, updatedAt: changedAt, updatedBy: actor.userId })
      .where(
        and(
          eq(purchaseOrders.id, before.id),
          eq(purchaseOrders.tenantId, actor.tenantId),
          eq(purchaseOrders.status, before.status),
        ),
      )
      .returning({ id: purchaseOrders.id });
    if (!updated)
      throw new ConflictException("Status PO telah berubah. Muat ulang data.");
    const after = await this.getBase(actor, before.id);
    await this.audit.record({
      tenantId: actor.tenantId,
      outletId: before.outletId,
      actorUserId: actor.userId,
      action: `purchase_order.${action}`,
      entityType: "purchase_order",
      entityId: before.id,
      beforeData: this.withoutHistory(before),
      afterData: after,
      reason: reason?.trim(),
    });
    return this.get(actor, before.id);
  }

  private async getBase(actor: AuthUser, id: string) {
    const [header] = await this.database.db
      .select({
        id: purchaseOrders.id,
        tenantId: purchaseOrders.tenantId,
        outletId: purchaseOrders.outletId,
        outletName: outlets.name,
        poNo: purchaseOrders.poNo,
        supplierId: purchaseOrders.supplierId,
        supplierCode: suppliers.code,
        supplierName: suppliers.name,
        supplierContactName: suppliers.contactName,
        supplierPhone: suppliers.phone,
        purchaseRequestId: purchaseOrders.purchaseRequestId,
        orderDate: purchaseOrders.orderDate,
        expectedDate: purchaseOrders.expectedDate,
        status: purchaseOrders.status,
        subtotal: purchaseOrders.subtotal,
        discountAmount: purchaseOrders.discountAmount,
        taxAmount: purchaseOrders.taxAmount,
        shippingAmount: purchaseOrders.shippingAmount,
        grandTotal: purchaseOrders.grandTotal,
        currencyCode: purchaseOrders.currencyCode,
        notes: purchaseOrders.notes,
        createdAt: purchaseOrders.createdAt,
        createdBy: purchaseOrders.createdBy,
        createdByName: users.fullName,
        updatedAt: purchaseOrders.updatedAt,
        updatedBy: purchaseOrders.updatedBy,
      })
      .from(purchaseOrders)
      .innerJoin(outlets, eq(outlets.id, purchaseOrders.outletId))
      .innerJoin(suppliers, eq(suppliers.id, purchaseOrders.supplierId))
      .leftJoin(users, eq(users.id, purchaseOrders.createdBy))
      .where(
        and(
          eq(purchaseOrders.id, id),
          eq(purchaseOrders.tenantId, actor.tenantId),
        ),
      )
      .limit(1);
    if (!header) throw new NotFoundException("Purchase order tidak ditemukan");
    await this.assertOutletAccess(actor, header.outletId);

    const items = await this.database.db
      .select({
        id: purchaseOrderItems.id,
        ingredientId: purchaseOrderItems.ingredientId,
        ingredientSku: ingredients.sku,
        ingredientName: ingredients.name,
        purchaseUnitId: purchaseOrderItems.purchaseUnitId,
        purchaseUnitCode: units.code,
        purchaseUnitName: units.name,
        quantityOrdered: purchaseOrderItems.quantityOrdered,
        conversionToBase: purchaseOrderItems.conversionToBase,
        unitPrice: purchaseOrderItems.unitPrice,
        discountAmount: purchaseOrderItems.discountAmount,
        taxAmount: purchaseOrderItems.taxAmount,
        lineTotal: purchaseOrderItems.lineTotal,
        quantityReceived: purchaseOrderItems.quantityReceived,
      })
      .from(purchaseOrderItems)
      .innerJoin(
        ingredients,
        eq(ingredients.id, purchaseOrderItems.ingredientId),
      )
      .innerJoin(units, eq(units.id, purchaseOrderItems.purchaseUnitId))
      .where(
        and(
          eq(purchaseOrderItems.tenantId, actor.tenantId),
          eq(purchaseOrderItems.purchaseOrderId, id),
        ),
      )
      .orderBy(asc(ingredients.name));
    return { ...header, items };
  }

  private async normalizeItems(
    tenantId: string,
    supplierId: string,
    input: PurchaseOrderItemDto[],
  ) {
    const duplicateKeys = new Set<string>();
    for (const item of input) {
      const key = `${item.ingredientId}:${item.purchaseUnitId}`;
      if (duplicateKeys.has(key)) {
        throw new BadRequestException(
          "Bahan dan satuan yang sama tidak boleh diduplikasi",
        );
      }
      duplicateKeys.add(key);
    }
    const ingredientIds = [...new Set(input.map((item) => item.ingredientId))];
    const unitIds = [...new Set(input.map((item) => item.purchaseUnitId))];
    const [ingredientRows, unitRows, catalogRows] = await Promise.all([
      this.database.db
        .select({
          id: ingredients.id,
          baseUnitId: ingredients.baseUnitId,
          name: ingredients.name,
        })
        .from(ingredients)
        .where(
          and(
            eq(ingredients.tenantId, tenantId),
            inArray(ingredients.id, ingredientIds),
            eq(ingredients.isActive, true),
            isNull(ingredients.deletedAt),
          ),
        ),
      this.database.db
        .select({ id: units.id })
        .from(units)
        .where(
          and(
            eq(units.tenantId, tenantId),
            inArray(units.id, unitIds),
            eq(units.isActive, true),
            isNull(units.deletedAt),
          ),
        ),
      this.database.db
        .select({
          ingredientId: supplierIngredients.ingredientId,
          purchaseUnitId: supplierIngredients.purchaseUnitId,
          conversionToBase: supplierIngredients.conversionToBase,
          minimumOrderQty: supplierIngredients.minimumOrderQty,
        })
        .from(supplierIngredients)
        .where(
          and(
            eq(supplierIngredients.tenantId, tenantId),
            eq(supplierIngredients.supplierId, supplierId),
            inArray(supplierIngredients.ingredientId, ingredientIds),
          ),
        ),
    ]);
    if (ingredientRows.length !== ingredientIds.length) {
      throw new BadRequestException(
        "Terdapat bahan yang tidak aktif atau bukan milik tenant",
      );
    }
    if (unitRows.length !== unitIds.length) {
      throw new BadRequestException(
        "Terdapat satuan yang tidak aktif atau bukan milik tenant",
      );
    }
    const ingredientMap = new Map(ingredientRows.map((row) => [row.id, row]));
    const catalogMap = new Map(
      catalogRows.map((row) => [
        `${row.ingredientId}:${row.purchaseUnitId}`,
        row,
      ]),
    );

    return input.map((item) => {
      const catalog = catalogMap.get(
        `${item.ingredientId}:${item.purchaseUnitId}`,
      );
      const ingredient = ingredientMap.get(item.ingredientId)!;
      if (!catalog && ingredient.baseUnitId !== item.purchaseUnitId) {
        throw new BadRequestException(
          `${ingredient.name} belum terdaftar pada katalog satuan pemasok ini`,
        );
      }
      if (catalog && item.quantityOrdered < catalog.minimumOrderQty) {
        throw new BadRequestException(
          `Jumlah ${ingredient.name} minimal ${catalog.minimumOrderQty} sesuai MOQ pemasok`,
        );
      }
      const gross = this.money(item.quantityOrdered * item.unitPrice);
      const discountAmount = this.money(item.discountAmount ?? 0);
      const taxAmount = this.money(item.taxAmount ?? 0);
      if (discountAmount > gross) {
        throw new BadRequestException(
          `Diskon ${ingredient.name} tidak boleh melebihi nilai item`,
        );
      }
      return {
        ingredientId: item.ingredientId,
        purchaseUnitId: item.purchaseUnitId,
        quantityOrdered: this.quantity(item.quantityOrdered),
        conversionToBase: catalog?.conversionToBase ?? 1,
        unitPrice: this.money(item.unitPrice),
        discountAmount,
        taxAmount,
        lineTotal: this.money(gross - discountAmount + taxAmount),
        quantityReceived: 0,
      };
    });
  }

  private totals(
    items: Awaited<ReturnType<PurchaseOrdersService["normalizeItems"]>>,
    shipping: number,
  ) {
    const subtotal = this.money(
      items.reduce(
        (sum, item) => sum + item.quantityOrdered * item.unitPrice,
        0,
      ),
    );
    const discountAmount = this.money(
      items.reduce((sum, item) => sum + item.discountAmount, 0),
    );
    const taxAmount = this.money(
      items.reduce((sum, item) => sum + item.taxAmount, 0),
    );
    const shippingAmount = this.money(shipping);
    return {
      subtotal,
      discountAmount,
      taxAmount,
      shippingAmount,
      grandTotal: this.money(
        subtotal - discountAmount + taxAmount + shippingAmount,
      ),
    };
  }

  private async assertSupplier(tenantId: string, supplierId: string) {
    const [supplier] = await this.database.db
      .select({ id: suppliers.id })
      .from(suppliers)
      .where(
        and(
          eq(suppliers.id, supplierId),
          eq(suppliers.tenantId, tenantId),
          eq(suppliers.isActive, true),
          isNull(suppliers.deletedAt),
        ),
      )
      .limit(1);
    if (!supplier)
      throw new NotFoundException("Supplier aktif tidak ditemukan");
  }

  private async assertOutletAccess(actor: AuthUser, outletId: string) {
    if (actor.outletIds.length && !actor.outletIds.includes(outletId)) {
      throw new ForbiddenException("User tidak memiliki akses ke outlet ini");
    }
    const [outlet] = await this.database.db
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
    if (!outlet) throw new NotFoundException("Outlet aktif tidak ditemukan");
  }

  private validateDateRange(dateFrom?: string, dateTo?: string) {
    if (dateFrom && dateTo && dateTo < dateFrom) {
      throw new BadRequestException(
        "Tanggal akhir filter tidak boleh sebelum tanggal awal",
      );
    }
  }

  private validateExpectedDate(orderDate: string, expectedDate?: string) {
    if (expectedDate && expectedDate < orderDate) {
      throw new BadRequestException(
        "Tanggal estimasi tiba tidak boleh sebelum tanggal PO",
      );
    }
  }

  private withoutHistory<T extends { history: unknown }>(value: T) {
    const { history: _history, ...snapshot } = value;
    return snapshot;
  }

  private money(value: number) {
    return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
  }

  private quantity(value: number) {
    return Math.round((Number(value) + Number.EPSILON) * 1000) / 1000;
  }
}
