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
  goodsReceiptItems,
  goodsReceipts,
  ingredients,
  outlets,
  purchaseOrderItems,
  purchaseOrders,
  stockBatches,
  stockMovementLines,
  stockMovements,
  storageLocations,
  units,
  users,
} from "../database/schema";
import { CreateGoodsReceiptDto } from "./dto/create-goods-receipt.dto";
import { GoodsReceiptItemDto } from "./dto/goods-receipt-item.dto";
import { ListGoodsReceiptsQueryDto } from "./dto/list-goods-receipts-query.dto";
import { UpdateGoodsReceiptDto } from "./dto/update-goods-receipt.dto";

type PurchaseOrderStatus =
  | "draft"
  | "approved"
  | "sent"
  | "partially_received"
  | "received"
  | "closed"
  | "cancelled";

@Injectable()
export class GoodsReceiptsService {
  constructor(
    private readonly database: DatabaseService,
    private readonly audit: AuditService,
  ) {}

  async list(actor: AuthUser, query: ListGoodsReceiptsQueryDto) {
    this.validateDateRange(query.dateFrom, query.dateTo);
    const conditions: SQL[] = [eq(goodsReceipts.tenantId, actor.tenantId)];
    if (query.outletId) {
      await this.assertOutletAccess(actor, query.outletId);
      conditions.push(eq(goodsReceipts.outletId, query.outletId));
    } else if (actor.outletIds.length) {
      conditions.push(inArray(goodsReceipts.outletId, actor.outletIds));
    }
    if (query.status) conditions.push(eq(goodsReceipts.status, query.status));
    if (query.dateFrom) {
      conditions.push(
        gte(goodsReceipts.receivedAt, new Date(`${query.dateFrom}T00:00:00Z`)),
      );
    }
    if (query.dateTo) {
      conditions.push(
        lte(
          goodsReceipts.receivedAt,
          new Date(`${query.dateTo}T23:59:59.999Z`),
        ),
      );
    }
    if (query.search) {
      const search = `%${query.search.trim()}%`;
      conditions.push(
        or(
          ilike(goodsReceipts.receiptNo, search),
          ilike(purchaseOrders.poNo, search),
          ilike(purchaseOrders.supplierNameSnapshot, search),
          ilike(goodsReceipts.supplierDeliveryNo, search),
          ilike(goodsReceipts.supplierInvoiceNo, search),
        )!,
      );
    }

    return this.database.db
      .select({
        id: goodsReceipts.id,
        outletId: goodsReceipts.outletId,
        outletName: outlets.name,
        receiptNo: goodsReceipts.receiptNo,
        purchaseOrderId: goodsReceipts.purchaseOrderId,
        poNo: purchaseOrders.poNo,
        supplierId: purchaseOrders.supplierId,
        supplierName: purchaseOrders.supplierNameSnapshot,
        receivedAt: goodsReceipts.receivedAt,
        receivedByName: users.fullName,
        status: goodsReceipts.status,
        supplierDeliveryNo: goodsReceipts.supplierDeliveryNo,
        supplierInvoiceNo: goodsReceipts.supplierInvoiceNo,
        itemCount: sql<number>`(
          select count(*)::int from goods_receipt_items gri
          where gri.goods_receipt_id = ${goodsReceipts.id}
        )`,
        quantityReceived: sql<number>`coalesce((
          select sum(gri.quantity_received) from goods_receipt_items gri
          where gri.goods_receipt_id = ${goodsReceipts.id}
        ), 0)`,
        quantityRejected: sql<number>`coalesce((
          select sum(gri.quantity_rejected) from goods_receipt_items gri
          where gri.goods_receipt_id = ${goodsReceipts.id}
        ), 0)`,
        stockValue: sql<number>`coalesce((
          select sum(gri.base_quantity * gri.unit_cost_base)
          from goods_receipt_items gri
          where gri.goods_receipt_id = ${goodsReceipts.id}
        ), 0)`,
        updatedAt: goodsReceipts.updatedAt,
      })
      .from(goodsReceipts)
      .innerJoin(outlets, eq(outlets.id, goodsReceipts.outletId))
      .innerJoin(
        purchaseOrders,
        eq(purchaseOrders.id, goodsReceipts.purchaseOrderId),
      )
      .innerJoin(users, eq(users.id, goodsReceipts.receivedBy))
      .where(and(...conditions))
      .orderBy(desc(goodsReceipts.receivedAt), desc(goodsReceipts.createdAt));
  }

  async lookups(actor: AuthUser) {
    const locationConditions: SQL[] = [
      eq(storageLocations.tenantId, actor.tenantId),
      eq(storageLocations.isActive, true),
      isNull(storageLocations.deletedAt),
    ];
    if (actor.outletIds.length) {
      locationConditions.push(
        inArray(storageLocations.outletId, actor.outletIds),
      );
    }
    const locations = await this.database.db
      .select({
        id: storageLocations.id,
        outletId: storageLocations.outletId,
        code: storageLocations.code,
        name: storageLocations.name,
        locationType: storageLocations.locationType,
      })
      .from(storageLocations)
      .where(and(...locationConditions))
      .orderBy(asc(storageLocations.name));

    const poConditions: SQL[] = [
      eq(purchaseOrders.tenantId, actor.tenantId),
      inArray(purchaseOrders.status, ["sent", "partially_received"]),
    ];
    if (actor.outletIds.length) {
      poConditions.push(inArray(purchaseOrders.outletId, actor.outletIds));
    }
    const headers = await this.database.db
      .select({
        id: purchaseOrders.id,
        outletId: purchaseOrders.outletId,
        outletName: outlets.name,
        poNo: purchaseOrders.poNo,
        supplierId: purchaseOrders.supplierId,
        supplierName: purchaseOrders.supplierNameSnapshot,
        orderDate: purchaseOrders.orderDate,
        expectedDate: purchaseOrders.expectedDate,
        status: purchaseOrders.status,
      })
      .from(purchaseOrders)
      .innerJoin(outlets, eq(outlets.id, purchaseOrders.outletId))
      .where(and(...poConditions))
      .orderBy(asc(purchaseOrders.expectedDate), asc(purchaseOrders.poNo));

    if (!headers.length)
      return { storageLocations: locations, purchaseOrders: [] };
    const itemRows = await this.database.db
      .select({
        id: purchaseOrderItems.id,
        purchaseOrderId: purchaseOrderItems.purchaseOrderId,
        ingredientId: purchaseOrderItems.ingredientId,
        ingredientSku: purchaseOrderItems.ingredientSkuSnapshot,
        ingredientName: purchaseOrderItems.ingredientNameSnapshot,
        isPerishable: ingredients.isPerishable,
        shelfLifeDays: ingredients.shelfLifeDays,
        purchaseUnitId: purchaseOrderItems.purchaseUnitId,
        purchaseUnitCode: purchaseOrderItems.purchaseUnitCodeSnapshot,
        purchaseUnitName: purchaseOrderItems.purchaseUnitNameSnapshot,
        quantityOrdered: purchaseOrderItems.quantityOrdered,
        quantityReceived: purchaseOrderItems.quantityReceived,
        conversionToBase: purchaseOrderItems.conversionToBase,
        unitPrice: purchaseOrderItems.unitPrice,
        lineTotal: purchaseOrderItems.lineTotal,
      })
      .from(purchaseOrderItems)
      .innerJoin(
        ingredients,
        eq(ingredients.id, purchaseOrderItems.ingredientId),
      )
      .where(
        and(
          eq(purchaseOrderItems.tenantId, actor.tenantId),
          inArray(
            purchaseOrderItems.purchaseOrderId,
            headers.map((header) => header.id),
          ),
          sql`${purchaseOrderItems.quantityReceived} < ${purchaseOrderItems.quantityOrdered}`,
        ),
      )
      .orderBy(asc(purchaseOrderItems.ingredientNameSnapshot));
    return {
      storageLocations: locations,
      purchaseOrders: headers.map((header) => ({
        ...header,
        items: itemRows
          .filter((item) => item.purchaseOrderId === header.id)
          .map((item) => ({
            ...item,
            remainingQuantity: this.quantity(
              Number(item.quantityOrdered) - Number(item.quantityReceived),
            ),
            unitCostBase: this.cost(
              Number(item.lineTotal) /
                Number(item.quantityOrdered) /
                Number(item.conversionToBase),
            ),
          })),
      })),
    };
  }

  async get(actor: AuthUser, id: string) {
    const base = await this.getBase(actor, id);
    const [history, movements] = await Promise.all([
      this.database.db
        .select({
          id: auditLogs.id,
          action: auditLogs.action,
          reason: auditLogs.reason,
          actorName: users.fullName,
          occurredAt: auditLogs.occurredAt,
        })
        .from(auditLogs)
        .leftJoin(users, eq(users.id, auditLogs.actorUserId))
        .where(
          and(
            eq(auditLogs.tenantId, actor.tenantId),
            eq(auditLogs.entityType, "goods_receipt"),
            eq(auditLogs.entityId, id),
          ),
        )
        .orderBy(desc(auditLogs.occurredAt)),
      this.database.db
        .select({
          id: stockMovements.id,
          movementNo: stockMovements.movementNo,
          movementType: stockMovements.movementType,
          status: stockMovements.status,
          movementAt: stockMovements.movementAt,
          reason: stockMovements.reason,
        })
        .from(stockMovements)
        .where(
          and(
            eq(stockMovements.tenantId, actor.tenantId),
            eq(stockMovements.referenceId, id),
            inArray(stockMovements.movementType, ["receipt", "reversal"]),
          ),
        )
        .orderBy(asc(stockMovements.movementAt)),
    ]);
    return { ...base, history, movements };
  }

  async create(actor: AuthUser, dto: CreateGoodsReceiptDto) {
    const po = await this.assertReceivablePurchaseOrder(
      actor,
      dto.purchaseOrderId,
    );
    this.validateReceivedAt(dto.receivedAt);
    const items = await this.normalizeItems(actor, po, dto.items);
    const businessDate = dto.receivedAt.slice(0, 10);
    const created = await this.database.db.transaction(async (tx) => {
      const [sequence] = await tx
        .insert(documentSequences)
        .values({
          tenantId: actor.tenantId,
          outletId: po.outletId,
          documentType: "goods_receipt",
          businessDate,
          lastNumber: 1,
          prefixPattern: "GR-{YYMMDD}-{####}",
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
      const receiptNo = `GR-${businessDate.replaceAll("-", "").slice(2)}-${String(sequence.lastNumber).padStart(4, "0")}`;
      const [header] = await tx
        .insert(goodsReceipts)
        .values({
          tenantId: actor.tenantId,
          outletId: po.outletId,
          receiptNo,
          purchaseOrderId: po.id,
          receivedAt: new Date(dto.receivedAt),
          receivedBy: actor.userId,
          supplierDeliveryNo: this.clean(dto.supplierDeliveryNo),
          supplierInvoiceNo: this.clean(dto.supplierInvoiceNo),
          notes: this.clean(dto.notes),
          createdBy: actor.userId,
          updatedBy: actor.userId,
        })
        .returning();
      await tx.insert(goodsReceiptItems).values(
        items.map((item) => ({
          ...item,
          tenantId: actor.tenantId,
          goodsReceiptId: header.id,
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
      action: "goods_receipt.create",
      entityType: "goods_receipt",
      entityId: created.id,
      afterData: after,
    });
    return this.get(actor, created.id);
  }

  async update(actor: AuthUser, id: string, dto: UpdateGoodsReceiptDto) {
    const before = await this.get(actor, id);
    if (before.status !== "draft") {
      throw new ConflictException(
        "Hanya Goods Receipt draft yang dapat diubah",
      );
    }
    const purchaseOrderId = dto.purchaseOrderId ?? before.purchaseOrderId;
    const po = await this.assertReceivablePurchaseOrder(actor, purchaseOrderId);
    const receivedAt = dto.receivedAt ?? before.receivedAt.toISOString();
    this.validateReceivedAt(receivedAt);
    const inputItems: GoodsReceiptItemDto[] =
      dto.items ??
      before.items.map((item) => ({
        purchaseOrderItemId: item.purchaseOrderItemId,
        quantityReceived: item.quantityReceived,
        quantityRejected: item.quantityRejected,
        rejectionReason: item.rejectionReason ?? undefined,
        storageLocationId: item.storageLocationId,
        batchNo: item.batchNo ?? undefined,
        expiryDate: item.expiryDate ?? undefined,
      }));
    const items = await this.normalizeItems(actor, po, inputItems);
    await this.database.db.transaction(async (tx) => {
      await tx
        .update(goodsReceipts)
        .set({
          outletId: po.outletId,
          purchaseOrderId,
          receivedAt: new Date(receivedAt),
          supplierDeliveryNo:
            dto.supplierDeliveryNo === undefined
              ? before.supplierDeliveryNo
              : this.clean(dto.supplierDeliveryNo),
          supplierInvoiceNo:
            dto.supplierInvoiceNo === undefined
              ? before.supplierInvoiceNo
              : this.clean(dto.supplierInvoiceNo),
          notes: dto.notes === undefined ? before.notes : this.clean(dto.notes),
          updatedAt: new Date(),
          updatedBy: actor.userId,
        })
        .where(
          and(
            eq(goodsReceipts.id, id),
            eq(goodsReceipts.tenantId, actor.tenantId),
            eq(goodsReceipts.status, "draft"),
          ),
        );
      await tx
        .delete(goodsReceiptItems)
        .where(
          and(
            eq(goodsReceiptItems.goodsReceiptId, id),
            eq(goodsReceiptItems.tenantId, actor.tenantId),
          ),
        );
      await tx.insert(goodsReceiptItems).values(
        items.map((item) => ({
          ...item,
          tenantId: actor.tenantId,
          goodsReceiptId: id,
          createdBy: actor.userId,
          updatedBy: actor.userId,
        })),
      );
    });
    const after = await this.getBase(actor, id);
    await this.audit.record({
      tenantId: actor.tenantId,
      outletId: po.outletId,
      actorUserId: actor.userId,
      action: "goods_receipt.update",
      entityType: "goods_receipt",
      entityId: id,
      beforeData: this.withoutExtras(before),
      afterData: after,
    });
    return this.get(actor, id);
  }

  async post(actor: AuthUser, id: string) {
    const before = await this.get(actor, id);
    if (before.status !== "draft") {
      throw new ConflictException(
        "Hanya Goods Receipt draft yang dapat diposting",
      );
    }
    const businessDate = before.receivedAt.toISOString().slice(0, 10);
    await this.database.db.transaction(async (tx) => {
      await tx.execute(
        sql`select id from goods_receipts where id = ${id} and tenant_id = ${actor.tenantId} for update`,
      );
      await tx.execute(
        sql`select id from purchase_order_items where purchase_order_id = ${before.purchaseOrderId} and tenant_id = ${actor.tenantId} for update`,
      );
      await tx.execute(
        sql`select id from purchase_orders where id = ${before.purchaseOrderId} and tenant_id = ${actor.tenantId} for update`,
      );
      const [currentHeader] = await tx
        .select({ status: goodsReceipts.status })
        .from(goodsReceipts)
        .where(
          and(
            eq(goodsReceipts.id, id),
            eq(goodsReceipts.tenantId, actor.tenantId),
          ),
        )
        .limit(1);
      if (currentHeader?.status !== "draft") {
        throw new ConflictException(
          "Goods Receipt telah diproses. Muat ulang data.",
        );
      }
      const [currentPo] = await tx
        .select({ status: purchaseOrders.status })
        .from(purchaseOrders)
        .where(
          and(
            eq(purchaseOrders.id, before.purchaseOrderId),
            eq(purchaseOrders.tenantId, actor.tenantId),
          ),
        )
        .limit(1);
      if (
        !currentPo ||
        !["sent", "partially_received"].includes(currentPo.status)
      ) {
        throw new ConflictException(
          "Purchase order tidak lagi dapat menerima barang",
        );
      }
      const poItems = await tx
        .select({
          id: purchaseOrderItems.id,
          quantityOrdered: purchaseOrderItems.quantityOrdered,
          quantityReceived: purchaseOrderItems.quantityReceived,
        })
        .from(purchaseOrderItems)
        .where(
          and(
            eq(purchaseOrderItems.tenantId, actor.tenantId),
            eq(purchaseOrderItems.purchaseOrderId, before.purchaseOrderId),
          ),
        );
      const poItemMap = new Map(poItems.map((item) => [item.id, item]));
      for (const item of before.items) {
        const poItem = poItemMap.get(item.purchaseOrderItemId);
        if (
          !poItem ||
          Number(poItem.quantityReceived) + Number(item.quantityReceived) >
            Number(poItem.quantityOrdered) + 0.0005
        ) {
          throw new ConflictException(
            `Jumlah penerimaan ${item.ingredientName} melebihi sisa PO`,
          );
        }
      }

      const [sequence] = await tx
        .insert(documentSequences)
        .values({
          tenantId: actor.tenantId,
          outletId: before.outletId,
          documentType: "stock_movement",
          businessDate,
          lastNumber: 1,
          prefixPattern: "SM-{YYMMDD}-{####}",
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
      const movementNo = `SM-${businessDate.replaceAll("-", "").slice(2)}-${String(sequence.lastNumber).padStart(4, "0")}`;
      const [movement] = await tx
        .insert(stockMovements)
        .values({
          tenantId: actor.tenantId,
          outletId: before.outletId,
          movementNo,
          movementType: "receipt",
          movementAt: before.receivedAt,
          businessDate,
          referenceType: "goods_receipt",
          referenceId: before.id,
          createdBy: actor.userId,
          updatedBy: actor.userId,
        })
        .returning();

      for (const item of before.items) {
        const [batch] = await tx
          .insert(stockBatches)
          .values({
            tenantId: actor.tenantId,
            outletId: before.outletId,
            ingredientId: item.ingredientId,
            storageLocationId: item.storageLocationId,
            batchNo: item.batchNo,
            receivedDate: businessDate,
            expiryDate: item.expiryDate,
            unitCost: item.unitCostBase,
            quantityOnHand: item.baseQuantity,
            sourceReceiptItemId: item.id,
            createdBy: actor.userId,
            updatedBy: actor.userId,
          })
          .returning();
        const [balance] = await tx
          .select({
            value: sql<number>`coalesce(sum(${stockBatches.quantityOnHand}), 0)`,
          })
          .from(stockBatches)
          .where(
            and(
              eq(stockBatches.tenantId, actor.tenantId),
              eq(stockBatches.outletId, before.outletId),
              eq(stockBatches.ingredientId, item.ingredientId),
              eq(stockBatches.storageLocationId, item.storageLocationId),
            ),
          );
        await tx.insert(stockMovementLines).values({
          tenantId: actor.tenantId,
          stockMovementId: movement.id,
          ingredientId: item.ingredientId,
          storageLocationId: item.storageLocationId,
          stockBatchId: batch.id,
          quantityDelta: item.baseQuantity,
          unitCost: item.unitCostBase,
          valueDelta: this.money(item.baseQuantity * item.unitCostBase),
          balanceAfter: this.quantity(Number(balance.value)),
          createdBy: actor.userId,
          updatedBy: actor.userId,
        });
        await tx
          .update(purchaseOrderItems)
          .set({
            quantityReceived: sql`${purchaseOrderItems.quantityReceived} + ${item.quantityReceived}`,
            updatedAt: new Date(),
            updatedBy: actor.userId,
          })
          .where(
            and(
              eq(purchaseOrderItems.id, item.purchaseOrderItemId),
              eq(purchaseOrderItems.tenantId, actor.tenantId),
            ),
          );
      }
      const poStatus = await this.poReceiptStatus(
        tx,
        actor.tenantId,
        before.purchaseOrderId,
      );
      await tx
        .update(purchaseOrders)
        .set({
          status: poStatus,
          updatedAt: new Date(),
          updatedBy: actor.userId,
        })
        .where(
          and(
            eq(purchaseOrders.id, before.purchaseOrderId),
            eq(purchaseOrders.tenantId, actor.tenantId),
          ),
        );
      await tx
        .update(goodsReceipts)
        .set({
          status: "posted",
          updatedAt: new Date(),
          updatedBy: actor.userId,
        })
        .where(
          and(
            eq(goodsReceipts.id, id),
            eq(goodsReceipts.tenantId, actor.tenantId),
            eq(goodsReceipts.status, "draft"),
          ),
        );
      await tx.insert(auditLogs).values({
        tenantId: actor.tenantId,
        outletId: before.outletId,
        actorUserId: actor.userId,
        action: "goods_receipt.post",
        entityType: "goods_receipt",
        entityId: id,
        beforeData: this.withoutExtras(before),
        afterData: { status: "posted", stockMovementNo: movementNo, poStatus },
      });
    });
    return this.get(actor, id);
  }

  async void(actor: AuthUser, id: string, reason: string) {
    const before = await this.get(actor, id);
    if (before.status !== "posted") {
      throw new ConflictException(
        "Hanya Goods Receipt posted yang dapat di-void",
      );
    }
    if (["closed", "cancelled"].includes(before.poStatus)) {
      throw new ConflictException(
        "Goods Receipt dari purchase order yang sudah ditutup tidak dapat di-void",
      );
    }
    const businessDate = new Date().toISOString().slice(0, 10);
    await this.database.db.transaction(async (tx) => {
      await tx.execute(
        sql`select id from goods_receipts where id = ${id} and tenant_id = ${actor.tenantId} for update`,
      );
      await tx.execute(
        sql`select id from purchase_order_items where purchase_order_id = ${before.purchaseOrderId} and tenant_id = ${actor.tenantId} for update`,
      );
      await tx.execute(
        sql`select id from purchase_orders where id = ${before.purchaseOrderId} and tenant_id = ${actor.tenantId} for update`,
      );
      const [currentPo] = await tx
        .select({ status: purchaseOrders.status })
        .from(purchaseOrders)
        .where(
          and(
            eq(purchaseOrders.id, before.purchaseOrderId),
            eq(purchaseOrders.tenantId, actor.tenantId),
          ),
        )
        .limit(1);
      if (!currentPo || ["closed", "cancelled"].includes(currentPo.status)) {
        throw new ConflictException(
          "Purchase order sudah ditutup dan penerimaannya tidak dapat di-void",
        );
      }
      const [original] = await tx
        .select()
        .from(stockMovements)
        .where(
          and(
            eq(stockMovements.tenantId, actor.tenantId),
            eq(stockMovements.referenceType, "goods_receipt"),
            eq(stockMovements.referenceId, id),
            eq(stockMovements.movementType, "receipt"),
            eq(stockMovements.status, "posted"),
          ),
        )
        .limit(1);
      if (!original) {
        throw new ConflictException("Ledger penerimaan aktif tidak ditemukan");
      }
      const originalLines = await tx
        .select()
        .from(stockMovementLines)
        .where(
          and(
            eq(stockMovementLines.tenantId, actor.tenantId),
            eq(stockMovementLines.stockMovementId, original.id),
          ),
        );
      const batchIds = originalLines
        .map((line) => line.stockBatchId)
        .filter((value): value is string => Boolean(value));
      await tx.execute(
        sql`select id from stock_batches where id in (${sql.join(
          batchIds.map((batchId) => sql`${batchId}`),
          sql`, `,
        )}) for update`,
      );
      const batches = await tx
        .select()
        .from(stockBatches)
        .where(
          and(
            eq(stockBatches.tenantId, actor.tenantId),
            inArray(stockBatches.id, batchIds),
          ),
        );
      const batchMap = new Map(batches.map((batch) => [batch.id, batch]));
      for (const line of originalLines) {
        const batch = line.stockBatchId
          ? batchMap.get(line.stockBatchId)
          : undefined;
        if (
          !batch ||
          Number(batch.quantityOnHand) + 0.0005 < Number(line.quantityDelta)
        ) {
          throw new ConflictException(
            "Goods Receipt tidak dapat di-void karena sebagian stok batch sudah digunakan",
          );
        }
      }

      const [sequence] = await tx
        .insert(documentSequences)
        .values({
          tenantId: actor.tenantId,
          outletId: before.outletId,
          documentType: "stock_movement",
          businessDate,
          lastNumber: 1,
          prefixPattern: "SM-{YYMMDD}-{####}",
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
      const movementNo = `SM-${businessDate.replaceAll("-", "").slice(2)}-${String(sequence.lastNumber).padStart(4, "0")}`;
      const [reversal] = await tx
        .insert(stockMovements)
        .values({
          tenantId: actor.tenantId,
          outletId: before.outletId,
          movementNo,
          movementType: "reversal",
          businessDate,
          referenceType: "goods_receipt",
          referenceId: id,
          reversalOfId: original.id,
          reason: reason.trim(),
          createdBy: actor.userId,
          updatedBy: actor.userId,
        })
        .returning();
      for (const line of originalLines) {
        const batch = batchMap.get(line.stockBatchId!)!;
        const nextBalance = this.quantity(
          Number(batch.quantityOnHand) - Number(line.quantityDelta),
        );
        await tx
          .update(stockBatches)
          .set({
            quantityOnHand: nextBalance,
            updatedAt: new Date(),
            updatedBy: actor.userId,
          })
          .where(eq(stockBatches.id, batch.id));
        const [locationBalance] = await tx
          .select({
            value: sql<number>`coalesce(sum(${stockBatches.quantityOnHand}), 0)`,
          })
          .from(stockBatches)
          .where(
            and(
              eq(stockBatches.tenantId, actor.tenantId),
              eq(stockBatches.outletId, before.outletId),
              eq(stockBatches.ingredientId, line.ingredientId),
              eq(stockBatches.storageLocationId, line.storageLocationId),
            ),
          );
        await tx.insert(stockMovementLines).values({
          tenantId: actor.tenantId,
          stockMovementId: reversal.id,
          ingredientId: line.ingredientId,
          storageLocationId: line.storageLocationId,
          stockBatchId: batch.id,
          quantityDelta: -Number(line.quantityDelta),
          unitCost: line.unitCost,
          valueDelta: -Number(line.valueDelta),
          balanceAfter: this.quantity(Number(locationBalance.value)),
          createdBy: actor.userId,
          updatedBy: actor.userId,
        });
      }
      for (const item of before.items) {
        await tx
          .update(purchaseOrderItems)
          .set({
            quantityReceived: sql`greatest(0, ${purchaseOrderItems.quantityReceived} - ${item.quantityReceived})`,
            updatedAt: new Date(),
            updatedBy: actor.userId,
          })
          .where(
            and(
              eq(purchaseOrderItems.id, item.purchaseOrderItemId),
              eq(purchaseOrderItems.tenantId, actor.tenantId),
            ),
          );
      }
      const poStatus = await this.poReceiptStatus(
        tx,
        actor.tenantId,
        before.purchaseOrderId,
      );
      await tx
        .update(purchaseOrders)
        .set({
          status: poStatus,
          updatedAt: new Date(),
          updatedBy: actor.userId,
        })
        .where(
          and(
            eq(purchaseOrders.id, before.purchaseOrderId),
            eq(purchaseOrders.tenantId, actor.tenantId),
          ),
        );
      await tx
        .update(stockMovements)
        .set({
          status: "reversed",
          updatedAt: new Date(),
          updatedBy: actor.userId,
        })
        .where(eq(stockMovements.id, original.id));
      await tx
        .update(goodsReceipts)
        .set({ status: "void", updatedAt: new Date(), updatedBy: actor.userId })
        .where(
          and(
            eq(goodsReceipts.id, id),
            eq(goodsReceipts.tenantId, actor.tenantId),
            eq(goodsReceipts.status, "posted"),
          ),
        );
      await tx.insert(auditLogs).values({
        tenantId: actor.tenantId,
        outletId: before.outletId,
        actorUserId: actor.userId,
        action: "goods_receipt.void",
        entityType: "goods_receipt",
        entityId: id,
        beforeData: this.withoutExtras(before),
        afterData: { status: "void", reversalMovementNo: movementNo, poStatus },
        reason: reason.trim(),
      });
    });
    return this.get(actor, id);
  }

  private async getBase(actor: AuthUser, id: string) {
    const [header] = await this.database.db
      .select({
        id: goodsReceipts.id,
        tenantId: goodsReceipts.tenantId,
        outletId: goodsReceipts.outletId,
        outletName: outlets.name,
        receiptNo: goodsReceipts.receiptNo,
        purchaseOrderId: goodsReceipts.purchaseOrderId,
        poNo: purchaseOrders.poNo,
        poStatus: purchaseOrders.status,
        supplierId: purchaseOrders.supplierId,
        supplierCode: purchaseOrders.supplierCodeSnapshot,
        supplierName: purchaseOrders.supplierNameSnapshot,
        receivedAt: goodsReceipts.receivedAt,
        receivedBy: goodsReceipts.receivedBy,
        receivedByName: users.fullName,
        status: goodsReceipts.status,
        supplierDeliveryNo: goodsReceipts.supplierDeliveryNo,
        supplierInvoiceNo: goodsReceipts.supplierInvoiceNo,
        notes: goodsReceipts.notes,
        createdAt: goodsReceipts.createdAt,
        updatedAt: goodsReceipts.updatedAt,
      })
      .from(goodsReceipts)
      .innerJoin(outlets, eq(outlets.id, goodsReceipts.outletId))
      .innerJoin(
        purchaseOrders,
        eq(purchaseOrders.id, goodsReceipts.purchaseOrderId),
      )
      .innerJoin(users, eq(users.id, goodsReceipts.receivedBy))
      .where(
        and(
          eq(goodsReceipts.id, id),
          eq(goodsReceipts.tenantId, actor.tenantId),
        ),
      )
      .limit(1);
    if (!header) throw new NotFoundException("Goods Receipt tidak ditemukan");
    await this.assertOutletAccess(actor, header.outletId);
    const items = await this.database.db
      .select({
        id: goodsReceiptItems.id,
        purchaseOrderItemId: goodsReceiptItems.purchaseOrderItemId,
        ingredientId: goodsReceiptItems.ingredientId,
        ingredientSku: purchaseOrderItems.ingredientSkuSnapshot,
        ingredientName: purchaseOrderItems.ingredientNameSnapshot,
        isPerishable: ingredients.isPerishable,
        purchaseUnitId: goodsReceiptItems.purchaseUnitId,
        purchaseUnitCode: purchaseOrderItems.purchaseUnitCodeSnapshot,
        purchaseUnitName: purchaseOrderItems.purchaseUnitNameSnapshot,
        quantityOrdered: purchaseOrderItems.quantityOrdered,
        poQuantityReceived: purchaseOrderItems.quantityReceived,
        quantityReceived: goodsReceiptItems.quantityReceived,
        quantityRejected: goodsReceiptItems.quantityRejected,
        rejectionReason: goodsReceiptItems.rejectionReason,
        baseQuantity: goodsReceiptItems.baseQuantity,
        unitCostBase: goodsReceiptItems.unitCostBase,
        batchNo: goodsReceiptItems.batchNo,
        expiryDate: goodsReceiptItems.expiryDate,
        storageLocationId: goodsReceiptItems.storageLocationId,
        storageLocationCode: storageLocations.code,
        storageLocationName: storageLocations.name,
      })
      .from(goodsReceiptItems)
      .innerJoin(
        purchaseOrderItems,
        eq(purchaseOrderItems.id, goodsReceiptItems.purchaseOrderItemId),
      )
      .innerJoin(
        ingredients,
        eq(ingredients.id, goodsReceiptItems.ingredientId),
      )
      .innerJoin(
        storageLocations,
        eq(storageLocations.id, goodsReceiptItems.storageLocationId),
      )
      .where(
        and(
          eq(goodsReceiptItems.tenantId, actor.tenantId),
          eq(goodsReceiptItems.goodsReceiptId, id),
        ),
      )
      .orderBy(asc(purchaseOrderItems.ingredientNameSnapshot));
    return {
      ...header,
      items,
      totals: {
        acceptedPurchaseQuantity: this.quantity(
          items.reduce((sum, item) => sum + Number(item.quantityReceived), 0),
        ),
        rejectedPurchaseQuantity: this.quantity(
          items.reduce((sum, item) => sum + Number(item.quantityRejected), 0),
        ),
        baseQuantity: this.quantity(
          items.reduce((sum, item) => sum + Number(item.baseQuantity), 0),
        ),
        stockValue: this.money(
          items.reduce(
            (sum, item) =>
              sum + Number(item.baseQuantity) * Number(item.unitCostBase),
            0,
          ),
        ),
      },
    };
  }

  private async assertReceivablePurchaseOrder(actor: AuthUser, id: string) {
    const [po] = await this.database.db
      .select({
        id: purchaseOrders.id,
        outletId: purchaseOrders.outletId,
        status: purchaseOrders.status,
      })
      .from(purchaseOrders)
      .where(
        and(
          eq(purchaseOrders.id, id),
          eq(purchaseOrders.tenantId, actor.tenantId),
        ),
      )
      .limit(1);
    if (!po) throw new NotFoundException("Purchase order tidak ditemukan");
    await this.assertOutletAccess(actor, po.outletId);
    if (!["sent", "partially_received"].includes(po.status)) {
      throw new ConflictException(
        "Goods Receipt hanya dapat dibuat dari PO yang sudah dikirim dan belum diterima penuh",
      );
    }
    return po;
  }

  private async normalizeItems(
    actor: AuthUser,
    po: { id: string; outletId: string; status: PurchaseOrderStatus },
    input: GoodsReceiptItemDto[],
  ) {
    const duplicateIds = new Set<string>();
    for (const item of input) {
      if (duplicateIds.has(item.purchaseOrderItemId)) {
        throw new BadRequestException(
          "Baris PO yang sama tidak boleh diduplikasi",
        );
      }
      duplicateIds.add(item.purchaseOrderItemId);
      if (Number(item.quantityRejected) > 0 && !item.rejectionReason?.trim()) {
        throw new BadRequestException("Alasan penolakan barang wajib diisi");
      }
    }
    const ids = input.map((item) => item.purchaseOrderItemId);
    const [poRows, locationRows] = await Promise.all([
      this.database.db
        .select({
          id: purchaseOrderItems.id,
          ingredientId: purchaseOrderItems.ingredientId,
          ingredientName: ingredients.name,
          isPerishable: ingredients.isPerishable,
          purchaseUnitId: purchaseOrderItems.purchaseUnitId,
          quantityOrdered: purchaseOrderItems.quantityOrdered,
          quantityReceived: purchaseOrderItems.quantityReceived,
          conversionToBase: purchaseOrderItems.conversionToBase,
          lineTotal: purchaseOrderItems.lineTotal,
        })
        .from(purchaseOrderItems)
        .innerJoin(
          ingredients,
          eq(ingredients.id, purchaseOrderItems.ingredientId),
        )
        .where(
          and(
            eq(purchaseOrderItems.tenantId, actor.tenantId),
            eq(purchaseOrderItems.purchaseOrderId, po.id),
            inArray(purchaseOrderItems.id, ids),
          ),
        ),
      this.database.db
        .select({ id: storageLocations.id })
        .from(storageLocations)
        .where(
          and(
            eq(storageLocations.tenantId, actor.tenantId),
            eq(storageLocations.outletId, po.outletId),
            inArray(storageLocations.id, [
              ...new Set(input.map((item) => item.storageLocationId)),
            ]),
            eq(storageLocations.isActive, true),
            isNull(storageLocations.deletedAt),
          ),
        ),
    ]);
    if (poRows.length !== ids.length) {
      throw new BadRequestException(
        "Terdapat item yang bukan bagian dari purchase order ini",
      );
    }
    const locationIds = new Set(locationRows.map((row) => row.id));
    if (
      locationIds.size !==
      new Set(input.map((item) => item.storageLocationId)).size
    ) {
      throw new BadRequestException(
        "Lokasi penyimpanan tidak aktif atau bukan milik outlet PO",
      );
    }
    const poMap = new Map(poRows.map((row) => [row.id, row]));
    const today = new Date().toISOString().slice(0, 10);
    return input.map((item) => {
      const row = poMap.get(item.purchaseOrderItemId)!;
      const quantityReceived = this.quantity(item.quantityReceived);
      const quantityRejected = this.quantity(item.quantityRejected ?? 0);
      const remaining = this.quantity(
        Number(row.quantityOrdered) - Number(row.quantityReceived),
      );
      if (quantityReceived > remaining + 0.0005) {
        throw new BadRequestException(
          `Jumlah ${row.ingredientName} melebihi sisa PO ${remaining}`,
        );
      }
      if (quantityReceived + quantityRejected > remaining + 0.0005) {
        throw new BadRequestException(
          `Total diterima dan ditolak ${row.ingredientName} melebihi sisa PO ${remaining}`,
        );
      }
      if (quantityRejected > 0 && !item.rejectionReason?.trim()) {
        throw new BadRequestException(
          `Alasan penolakan ${row.ingredientName} wajib diisi`,
        );
      }
      if (row.isPerishable && !item.batchNo?.trim()) {
        throw new BadRequestException(
          `Nomor batch ${row.ingredientName} wajib diisi`,
        );
      }
      if (row.isPerishable && !item.expiryDate) {
        throw new BadRequestException(
          `Tanggal kedaluwarsa ${row.ingredientName} wajib diisi`,
        );
      }
      if (item.expiryDate && item.expiryDate < today) {
        throw new BadRequestException(
          `Tanggal kedaluwarsa ${row.ingredientName} tidak boleh lewat`,
        );
      }
      const baseQuantity = this.quantity(
        quantityReceived * Number(row.conversionToBase),
      );
      return {
        purchaseOrderItemId: row.id,
        ingredientId: row.ingredientId,
        quantityReceived,
        quantityRejected,
        rejectionReason:
          quantityRejected > 0 ? item.rejectionReason!.trim() : null,
        purchaseUnitId: row.purchaseUnitId,
        baseQuantity,
        unitCostBase: this.cost(
          Number(row.lineTotal) /
            Number(row.quantityOrdered) /
            Number(row.conversionToBase),
        ),
        batchNo: this.clean(item.batchNo),
        expiryDate: item.expiryDate,
        storageLocationId: item.storageLocationId,
      };
    });
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

  private async poReceiptStatus(
    tx: Parameters<Parameters<DatabaseService["db"]["transaction"]>[0]>[0],
    tenantId: string,
    purchaseOrderId: string,
  ): Promise<"sent" | "partially_received" | "received"> {
    const rows = await tx
      .select({
        quantityOrdered: purchaseOrderItems.quantityOrdered,
        quantityReceived: purchaseOrderItems.quantityReceived,
      })
      .from(purchaseOrderItems)
      .where(
        and(
          eq(purchaseOrderItems.tenantId, tenantId),
          eq(purchaseOrderItems.purchaseOrderId, purchaseOrderId),
        ),
      );
    const any = rows.some((row) => Number(row.quantityReceived) > 0.0005);
    const complete =
      rows.length > 0 &&
      rows.every(
        (row) =>
          Number(row.quantityReceived) + 0.0005 >= Number(row.quantityOrdered),
      );
    return complete ? "received" : any ? "partially_received" : "sent";
  }

  private validateDateRange(dateFrom?: string, dateTo?: string) {
    if (dateFrom && dateTo && dateTo < dateFrom) {
      throw new BadRequestException(
        "Tanggal akhir filter tidak boleh sebelum tanggal awal",
      );
    }
  }

  private validateReceivedAt(receivedAt: string) {
    const date = new Date(receivedAt);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException("Waktu penerimaan tidak valid");
    }
    if (date.getTime() > Date.now() + 5 * 60 * 1000) {
      throw new BadRequestException(
        "Waktu penerimaan tidak boleh berada di masa depan",
      );
    }
  }

  private withoutExtras<T extends { history: unknown; movements: unknown }>(
    value: T,
  ) {
    const { history: _history, movements: _movements, ...snapshot } = value;
    return snapshot;
  }

  private clean(value?: string | null) {
    const cleaned = value?.trim();
    return cleaned || null;
  }

  private money(value: number) {
    return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
  }

  private quantity(value: number) {
    return Math.round((Number(value) + Number.EPSILON) * 1000) / 1000;
  }

  private cost(value: number) {
    return Math.round((Number(value) + Number.EPSILON) * 1_000_000) / 1_000_000;
  }
}
