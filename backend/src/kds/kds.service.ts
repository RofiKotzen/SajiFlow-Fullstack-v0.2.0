import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { createHash } from "node:crypto";
import {
  SQL,
  and,
  asc,
  eq,
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
  auditLogs,
  outlets,
  posOperationRequests,
  salesOrderItemStatusHistory,
  salesOrderItems,
  salesOrders,
} from "../database/schema";
import {
  aggregateOrderStatus,
  canTransitionItem,
  type ItemStatus,
  type OrderStatus,
} from "../pos/pos-domain";
import {
  KDS_ACTIVE_STATUSES,
  KdsQueueQueryDto,
  KdsTransitionDto,
} from "./dto/kds.dto";

type DbExecutor = any;
type KdsAction = "start" | "ready";

@Injectable()
export class KdsService {
  constructor(private readonly database: DatabaseService) {}

  async queue(actor: AuthUser, query: KdsQueueQueryDto) {
    const outlet = await this.assertOutletAccess(actor, query.outletId);
    const conditions: SQL[] = [
      eq(salesOrderItems.tenantId, actor.tenantId),
      eq(salesOrders.outletId, query.outletId),
      eq(salesOrderItems.requiresKitchen, true),
      inArray(salesOrderItems.status, [...KDS_ACTIVE_STATUSES]),
      inArray(salesOrders.status, ["submitted", "preparing", "ready"]),
    ];
    if (query.status) conditions.push(eq(salesOrderItems.status, query.status));
    if (query.search) {
      const term = `%${query.search.trim()}%`;
      conditions.push(
        or(
          ilike(salesOrders.orderNo, term),
          ilike(salesOrders.tableNumber, term),
          ilike(salesOrders.customerName, term),
          ilike(salesOrderItems.menuNameSnapshot, term),
          ilike(salesOrderItems.variantNameSnapshot, term),
        )!,
      );
    }
    const where = and(...conditions);
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const [rows, countRows] = await Promise.all([
      this.database.db
        .select(this.queueSelection())
        .from(salesOrderItems)
        .innerJoin(
          salesOrders,
          and(
            eq(salesOrders.tenantId, salesOrderItems.tenantId),
            eq(salesOrders.id, salesOrderItems.salesOrderId),
          ),
        )
        .where(where)
        .orderBy(
          sql`case ${salesOrderItems.status} when 'queued' then 1 when 'preparing' then 2 else 3 end`,
          asc(salesOrderItems.queuedAt),
          asc(salesOrders.orderNo),
          asc(salesOrderItems.lineNo),
        )
        .limit(limit)
        .offset((page - 1) * limit),
      this.database.db
        .select({ count: sql<number>`count(*)::int` })
        .from(salesOrderItems)
        .innerJoin(
          salesOrders,
          and(
            eq(salesOrders.tenantId, salesOrderItems.tenantId),
            eq(salesOrders.id, salesOrderItems.salesOrderId),
          ),
        )
        .where(where),
    ]);
    return {
      serverTime: new Date().toISOString(),
      syncMode: "full_active_queue" as const,
      outlet,
      data: rows,
      pagination: { page, limit, total: countRows[0]?.count ?? 0 },
    };
  }

  async detail(actor: AuthUser, orderId: string) {
    const [header] = await this.database.db
      .select({
        id: salesOrders.id,
        outletId: salesOrders.outletId,
        orderNo: salesOrders.orderNo,
        businessDate: salesOrders.businessDate,
        orderType: salesOrders.orderType,
        tableNumber: salesOrders.tableNumber,
        customerName: salesOrders.customerName,
        notes: salesOrders.notes,
        status: salesOrders.status,
        paymentStatus: salesOrders.paymentStatus,
        submittedAt: salesOrders.submittedAt,
        createdAt: salesOrders.createdAt,
        lockVersion: salesOrders.lockVersion,
      })
      .from(salesOrders)
      .where(
        and(
          eq(salesOrders.tenantId, actor.tenantId),
          eq(salesOrders.id, orderId),
        ),
      )
      .limit(1);
    if (!header) throw new NotFoundException("KDS_ORDER_NOT_FOUND");
    await this.assertOutletAccess(actor, header.outletId);
    const items = await this.database.db
      .select({
        id: salesOrderItems.id,
        lineNo: salesOrderItems.lineNo,
        menuCode: salesOrderItems.menuCodeSnapshot,
        menuName: salesOrderItems.menuNameSnapshot,
        variantCode: salesOrderItems.variantCodeSnapshot,
        variantName: salesOrderItems.variantNameSnapshot,
        quantity: salesOrderItems.quantity,
        notes: salesOrderItems.notes,
        status: salesOrderItems.status,
        queuedAt: salesOrderItems.queuedAt,
        preparingAt: salesOrderItems.preparingAt,
        readyAt: salesOrderItems.readyAt,
        completedAt: salesOrderItems.completedAt,
        cancelledAt: salesOrderItems.cancelledAt,
        lockVersion: salesOrderItems.lockVersion,
        requiresKitchen: salesOrderItems.requiresKitchen,
      })
      .from(salesOrderItems)
      .where(
        and(
          eq(salesOrderItems.tenantId, actor.tenantId),
          eq(salesOrderItems.salesOrderId, orderId),
          eq(salesOrderItems.requiresKitchen, true),
        ),
      )
      .orderBy(asc(salesOrderItems.lineNo));
    if (!items.length) throw new NotFoundException("KDS_ORDER_NOT_FOUND");
    const history = await this.database.db
      .select({
        id: salesOrderItemStatusHistory.id,
        salesOrderItemId: salesOrderItemStatusHistory.salesOrderItemId,
        fromStatus: salesOrderItemStatusHistory.fromStatus,
        toStatus: salesOrderItemStatusHistory.toStatus,
        changedBy: salesOrderItemStatusHistory.changedBy,
        reason: salesOrderItemStatusHistory.reason,
        changedAt: salesOrderItemStatusHistory.changedAt,
      })
      .from(salesOrderItemStatusHistory)
      .where(
        and(
          eq(salesOrderItemStatusHistory.tenantId, actor.tenantId),
          eq(salesOrderItemStatusHistory.outletId, header.outletId),
          eq(salesOrderItemStatusHistory.salesOrderId, orderId),
        ),
      )
      .orderBy(asc(salesOrderItemStatusHistory.changedAt));
    return {
      serverTime: new Date().toISOString(),
      order: header,
      aggregateStatus: header.status,
      items,
      history,
    };
  }

  async transition(
    actor: AuthUser,
    itemId: string,
    action: KdsAction,
    dto: KdsTransitionDto,
  ) {
    const visible = await this.getItem(actor.tenantId, itemId, this.database.db);
    if (!visible) throw new NotFoundException("KDS_ITEM_NOT_FOUND");
    await this.assertOutletAccess(actor, visible.outletId);
    const operationName = action === "start" ? "kds_item_start" : "kds_item_ready";
    const requestHash = this.requestHash({ operation: operationName, itemId, ...dto });
    const result = await this.database.db.transaction(async (tx) => {
      await tx.execute(
        sql`select id from sales_orders where id = ${visible.salesOrderId} and tenant_id = ${actor.tenantId} and outlet_id = ${visible.outletId} for update`,
      );
      await tx.execute(
        sql`select id from sales_order_items where id = ${itemId} and tenant_id = ${actor.tenantId} and sales_order_id = ${visible.salesOrderId} for update`,
      );
      const current = await this.getItem(actor.tenantId, itemId, tx);
      if (!current) throw new NotFoundException("KDS_ITEM_NOT_FOUND");
      const operation = await this.acquireOperation(
        tx,
        actor,
        current.outletId,
        dto.idempotencyKey,
        operationName,
        requestHash,
      );
      if (operation.replay) return { orderId: current.salesOrderId };
      if (!current.requiresKitchen)
        throw new ConflictException("KDS_ITEM_NOT_ACTIVE");
      if (["cancelled", "completed"].includes(current.orderStatus))
        throw new ConflictException("ORDER_NO_LONGER_ACTIVE");
      const expectedStatus = action === "start" ? "queued" : "preparing";
      const nextStatus = action === "start" ? "preparing" : "ready";
      if (current.status !== expectedStatus)
        throw new ConflictException(
          action === "start" ? "KDS_ITEM_NOT_QUEUED" : "KDS_ITEM_NOT_PREPARING",
        );
      if (current.lockVersion !== dto.lockVersion)
        throw new ConflictException("STALE_KDS_ITEM_VERSION");
      if (
        !canTransitionItem(
          current.status as ItemStatus,
          nextStatus,
          current.requiresKitchen,
        )
      )
        throw new ConflictException("KDS_ITEM_NOT_ACTIVE");

      const now = new Date();
      const [updatedItem] = await tx
        .update(salesOrderItems)
        .set({
          status: nextStatus,
          preparingAt: action === "start" ? now : current.preparingAt,
          readyAt: action === "ready" ? now : null,
          lockVersion: sql`${salesOrderItems.lockVersion} + 1`,
          updatedAt: now,
          updatedBy: actor.userId,
        })
        .where(
          and(
            eq(salesOrderItems.tenantId, actor.tenantId),
            eq(salesOrderItems.salesOrderId, current.salesOrderId),
            eq(salesOrderItems.id, itemId),
            eq(salesOrderItems.status, expectedStatus),
            eq(salesOrderItems.lockVersion, dto.lockVersion),
          ),
        )
        .returning();
      if (!updatedItem) throw new ConflictException("STALE_KDS_ITEM_VERSION");
      await tx.insert(salesOrderItemStatusHistory).values({
        tenantId: actor.tenantId,
        outletId: current.outletId,
        salesOrderId: current.salesOrderId,
        salesOrderItemId: itemId,
        fromStatus: expectedStatus,
        toStatus: nextStatus,
        changedBy: actor.userId,
      });

      const allItems = await tx
        .select({
          status: salesOrderItems.status,
          requiresKitchen: salesOrderItems.requiresKitchen,
        })
        .from(salesOrderItems)
        .where(
          and(
            eq(salesOrderItems.tenantId, actor.tenantId),
            eq(salesOrderItems.salesOrderId, current.salesOrderId),
          ),
        );
      const aggregateStatus = aggregateOrderStatus(
        current.orderStatus as OrderStatus,
        allItems as Array<{ status: ItemStatus; requiresKitchen: boolean }>,
      );
      const [updatedOrder] = await tx
        .update(salesOrders)
        .set({
          status: aggregateStatus,
          lockVersion: sql`${salesOrders.lockVersion} + 1`,
          updatedAt: now,
          updatedBy: actor.userId,
        })
        .where(
          and(
            eq(salesOrders.tenantId, actor.tenantId),
            eq(salesOrders.outletId, current.outletId),
            eq(salesOrders.id, current.salesOrderId),
            eq(salesOrders.status, current.orderStatus),
            eq(salesOrders.lockVersion, current.orderLockVersion),
          ),
        )
        .returning();
      if (!updatedOrder) throw new ConflictException("ORDER_NO_LONGER_ACTIVE");
      await tx.insert(auditLogs).values({
        tenantId: actor.tenantId,
        outletId: current.outletId,
        actorUserId: actor.userId,
        action: action === "start" ? "kds.item_start" : "kds.item_ready",
        entityType: "sales_order_item",
        entityId: itemId,
        beforeData: {
          itemStatus: expectedStatus,
          itemLockVersion: current.lockVersion,
          orderStatus: current.orderStatus,
          orderLockVersion: current.orderLockVersion,
        },
        afterData: {
          itemStatus: nextStatus,
          itemLockVersion: updatedItem.lockVersion,
          orderStatus: aggregateStatus,
          orderLockVersion: updatedOrder.lockVersion,
          changedAt: now.toISOString(),
          idempotencyKey: dto.idempotencyKey,
        },
      });
      await this.completeOperation(
        tx,
        operation.id,
        current.salesOrderId,
        itemId,
      );
      return { orderId: current.salesOrderId };
    });
    return this.detail(actor, result.orderId);
  }

  private queueSelection() {
    return {
      orderId: salesOrders.id,
      orderNo: salesOrders.orderNo,
      businessDate: salesOrders.businessDate,
      orderType: salesOrders.orderType,
      tableNumber: salesOrders.tableNumber,
      customerName: salesOrders.customerName,
      orderNotes: salesOrders.notes,
      orderStatus: salesOrders.status,
      paymentStatus: salesOrders.paymentStatus,
      orderCreatedAt: salesOrders.createdAt,
      submittedAt: salesOrders.submittedAt,
      orderLockVersion: salesOrders.lockVersion,
      itemId: salesOrderItems.id,
      lineNo: salesOrderItems.lineNo,
      menuCode: salesOrderItems.menuCodeSnapshot,
      menuName: salesOrderItems.menuNameSnapshot,
      variantCode: salesOrderItems.variantCodeSnapshot,
      variantName: salesOrderItems.variantNameSnapshot,
      quantity: salesOrderItems.quantity,
      itemNotes: salesOrderItems.notes,
      itemStatus: salesOrderItems.status,
      queuedAt: salesOrderItems.queuedAt,
      preparingAt: salesOrderItems.preparingAt,
      readyAt: salesOrderItems.readyAt,
      elapsedFrom: sql<Date>`coalesce(${salesOrderItems.preparingAt}, ${salesOrderItems.queuedAt})`,
      itemLockVersion: salesOrderItems.lockVersion,
      requiresKitchen: salesOrderItems.requiresKitchen,
    };
  }

  private async getItem(tenantId: string, itemId: string, tx: DbExecutor) {
    const [row] = await tx
      .select({
        id: salesOrderItems.id,
        tenantId: salesOrderItems.tenantId,
        outletId: salesOrders.outletId,
        salesOrderId: salesOrderItems.salesOrderId,
        requiresKitchen: salesOrderItems.requiresKitchen,
        status: salesOrderItems.status,
        preparingAt: salesOrderItems.preparingAt,
        lockVersion: salesOrderItems.lockVersion,
        orderStatus: salesOrders.status,
        orderLockVersion: salesOrders.lockVersion,
      })
      .from(salesOrderItems)
      .innerJoin(
        salesOrders,
        and(
          eq(salesOrders.tenantId, salesOrderItems.tenantId),
          eq(salesOrders.id, salesOrderItems.salesOrderId),
        ),
      )
      .where(
        and(
          eq(salesOrderItems.tenantId, tenantId),
          eq(salesOrderItems.id, itemId),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  private async assertOutletAccess(actor: AuthUser, outletId: string) {
    if (actor.outletIds.length && !actor.outletIds.includes(outletId))
      throw new ForbiddenException("OUTLET_ACCESS_DENIED");
    const [outlet] = await this.database.db
      .select({ id: outlets.id, code: outlets.code, name: outlets.name })
      .from(outlets)
      .where(
        and(
          eq(outlets.tenantId, actor.tenantId),
          eq(outlets.id, outletId),
          eq(outlets.isActive, true),
          isNull(outlets.deletedAt),
        ),
      )
      .limit(1);
    if (!outlet) throw new NotFoundException("KDS_OUTLET_NOT_FOUND");
    return outlet;
  }

  private async acquireOperation(
    tx: DbExecutor,
    actor: AuthUser,
    outletId: string,
    idempotencyKey: string,
    operation: string,
    requestHash: string,
  ) {
    const [created] = await tx
      .insert(posOperationRequests)
      .values({
        tenantId: actor.tenantId,
        outletId,
        idempotencyKey,
        operation,
        requestHash,
      })
      .onConflictDoNothing()
      .returning({ id: posOperationRequests.id });
    if (created) return { id: created.id, replay: false };
    const [existing] = await tx
      .select()
      .from(posOperationRequests)
      .where(
        and(
          eq(posOperationRequests.tenantId, actor.tenantId),
          eq(posOperationRequests.idempotencyKey, idempotencyKey),
        ),
      )
      .limit(1);
    if (
      !existing ||
      existing.operation !== operation ||
      existing.requestHash !== requestHash
    )
      throw new ConflictException(
        "IDEMPOTENCY_CONFLICT: Key digunakan untuk payload berbeda.",
      );
    if (existing.status === "completed" && existing.salesOrderId)
      return { id: existing.id, replay: true };
    if (existing.leaseExpiresAt > new Date())
      throw new ConflictException("IDEMPOTENCY_IN_PROGRESS");
    const [claimed] = await tx
      .update(posOperationRequests)
      .set({
        status: "processing",
        leaseExpiresAt: sql`now() + interval '5 minutes'`,
        completedAt: null,
        errorCode: null,
      })
      .where(
        and(
          eq(posOperationRequests.id, existing.id),
          lte(posOperationRequests.leaseExpiresAt, new Date()),
        ),
      )
      .returning({ id: posOperationRequests.id });
    if (!claimed) throw new ConflictException("IDEMPOTENCY_IN_PROGRESS");
    return { id: claimed.id, replay: false };
  }

  private async completeOperation(
    tx: DbExecutor,
    operationId: string,
    orderId: string,
    itemId: string,
  ) {
    await tx
      .update(posOperationRequests)
      .set({
        status: "completed",
        salesOrderId: orderId,
        responseStatus: 200,
        responseBody: { orderId, itemId },
        completedAt: new Date(),
      })
      .where(eq(posOperationRequests.id, operationId));
  }

  private requestHash(value: unknown) {
    return createHash("sha256")
      .update(JSON.stringify(this.canonical(value)))
      .digest("hex");
  }

  private canonical(value: any): any {
    if (Array.isArray(value)) return value.map((item) => this.canonical(item));
    if (value && typeof value === "object")
      return Object.fromEntries(
        Object.keys(value)
          .sort()
          .map((key) => [key, this.canonical(value[key])]),
      );
    return value;
  }
}
