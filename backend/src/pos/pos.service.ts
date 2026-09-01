import {
  BadRequestException,
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
  auditLogs,
  documentSequences,
  ingredients,
  menuCategories,
  menus,
  menuVariantOutletSettings,
  menuVariants,
  outlets,
  payments,
  posOperationRequests,
  recipeHeaders,
  recipeItems,
  recipes,
  salesItemConsumptions,
  salesOrderItemStatusHistory,
  salesOrderItems,
  salesOrders,
  stockBatches,
  stockMovementLines,
  stockMovements,
  tenants,
  units,
  users,
} from "../database/schema";
import { ListPosOrdersQueryDto } from "./dto/list-pos-orders-query.dto";
import {
  CreatePosOrderDto,
  PosMutationDto,
  PosOrderItemDto,
  PosReasonMutationDto,
  RecordPosPaymentDto,
  UpdatePosOrderDto,
  VoidPosOrderDto,
} from "./dto/pos.dto";
import {
  assertOrderIdentity,
  calculatePayment,
  formatMinor,
  multiplyMoney,
  parseDecimalToMinor,
  type OrderType,
} from "./pos-domain";
import {
  allocateFefo,
  formatFixed,
  inventoryValueMinor,
  parseFixed,
  recipeRequirement,
  requirementToStockMilli,
} from "./pos-inventory-domain";

type DbExecutor = any;

interface OutletContext {
  id: string;
  code: string;
  name: string;
  timezone: string;
  businessDayCutoff: string;
  currencyCode: string;
}

interface ConsumptionPlan {
  salesOrderItemId: string;
  recipeVersionId: string;
  recipeItemId: string;
  ingredientId: string;
  ingredientSku: string;
  ingredientName: string;
  baseUnitCode: string;
  isOptional: boolean;
  requiredMicro: bigint;
}

@Injectable()
export class PosService {
  constructor(private readonly database: DatabaseService) {}

  async lookups(actor: AuthUser, outletId: string) {
    const outlet = await this.assertOutletAccess(actor, outletId);
    const now = new Date();
    const rows = await this.lookupRows(
      actor.tenantId,
      outletId,
      this.database.db,
    );
    const variants = rows.map((row: any) => {
      const recipe = this.recipeReadiness(row, outletId, now);
      const price = row.priceOverride ?? row.basePrice;
      const priceReady = price !== null && price !== undefined;
      const currencyReady = row.currencyCode === outlet.currencyCode;
      const isReadyForSale = recipe.ready && priceReady && currencyReady;
      return {
        categoryId: row.categoryId,
        categoryCode: row.categoryCode,
        categoryName: row.categoryName,
        categoryDisplayOrder: row.categoryDisplayOrder,
        menuId: row.menuId,
        menuCode: row.menuCode,
        menuName: row.menuName,
        menuDescription: row.menuDescription,
        variantId: row.variantId,
        variantCode: row.variantCode,
        variantName: row.variantName,
        displayOrder: row.displayOrder,
        sellingPrice: priceReady ? this.moneyString(price) : null,
        priceSource: row.priceOverride !== null ? "outlet_override" : "base",
        currencyCode: row.currencyCode,
        requiresRecipe: row.requiresRecipe,
        requiresKitchen: row.requiresKitchen,
        recipeHeaderId: recipe.ready ? row.recipeHeaderId : null,
        recipeVersionId: recipe.ready ? row.recipeVersionId : null,
        recipeVersionNo: recipe.ready ? row.recipeVersionNo : null,
        isReadyForSale,
        notReadyReason: !priceReady
          ? "PRICE_NOT_CONFIGURED"
          : !currencyReady
            ? "CURRENCY_MISMATCH"
            : recipe.reason,
      };
    });
    return {
      outlet: { id: outlet.id, code: outlet.code, name: outlet.name },
      currencyCode: outlet.currencyCode,
      categories: this.groupCategories(variants),
      variants,
    };
  }

  async list(actor: AuthUser, query: ListPosOrdersQueryDto) {
    this.validateDateRange(query.dateFrom, query.dateTo);
    const conditions: SQL[] = [eq(salesOrders.tenantId, actor.tenantId)];
    if (query.outletId) {
      await this.assertOutletAccess(actor, query.outletId);
      conditions.push(eq(salesOrders.outletId, query.outletId));
    } else if (actor.outletIds.length) {
      conditions.push(inArray(salesOrders.outletId, actor.outletIds));
    }
    if (query.dateFrom)
      conditions.push(gte(salesOrders.businessDate, query.dateFrom));
    if (query.dateTo)
      conditions.push(lte(salesOrders.businessDate, query.dateTo));
    if (query.status) conditions.push(eq(salesOrders.status, query.status));
    if (query.paymentStatus)
      conditions.push(eq(salesOrders.paymentStatus, query.paymentStatus));
    if (query.cashierId)
      conditions.push(eq(salesOrders.cashierId, query.cashierId));
    if (query.search) {
      const term = `%${query.search.trim()}%`;
      conditions.push(
        or(
          ilike(salesOrders.orderNo, term),
          ilike(salesOrders.customerName, term),
          ilike(salesOrders.tableNumber, term),
        )!,
      );
    }
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
    const where = and(...conditions);
    const [rows, countRows] = await Promise.all([
      this.database.db
        .select({
          id: salesOrders.id,
          outletId: salesOrders.outletId,
              outletName: outlets.name,
              orderNo: salesOrders.orderNo,
              receiptNo: salesOrders.receiptNo,
          businessDate: salesOrders.businessDate,
          orderType: salesOrders.orderType,
          tableNumber: salesOrders.tableNumber,
          customerName: salesOrders.customerName,
          status: salesOrders.status,
          paymentStatus: salesOrders.paymentStatus,
          currencyCode: salesOrders.currencyCode,
          subtotal: salesOrders.subtotal,
          totalAmount: salesOrders.totalAmount,
          cashierId: salesOrders.cashierId,
          cashierName: users.fullName,
          itemCount: sql<number>`(select count(*)::int from sales_order_items soi where soi.tenant_id = ${actor.tenantId} and soi.sales_order_id = ${salesOrders.id})`,
          lockVersion: salesOrders.lockVersion,
          createdAt: salesOrders.createdAt,
          updatedAt: salesOrders.updatedAt,
        })
        .from(salesOrders)
        .innerJoin(outlets, eq(outlets.id, salesOrders.outletId))
        .leftJoin(users, eq(users.id, salesOrders.cashierId))
        .where(where)
        .orderBy(desc(salesOrders.updatedAt), desc(salesOrders.createdAt))
        .limit(limit)
        .offset((page - 1) * limit),
      this.database.db
        .select({ count: sql<number>`count(*)::int` })
        .from(salesOrders)
        .where(where),
    ]);
    return {
      data: rows.map((row) => this.serializeMoney(row)),
      pagination: { page, limit, total: countRows[0]?.count ?? 0 },
    };
  }

  async get(actor: AuthUser, id: string) {
    const detail = await this.getBase(actor.tenantId, id, this.database.db);
    if (!detail) throw new NotFoundException("Order POS tidak ditemukan.");
    await this.assertOutletAccess(actor, detail.outletId);
    const [history, itemStatusHistory, paymentRows, consumptions] =
      await Promise.all([
        this.database.db
          .select({
            id: auditLogs.id,
            action: auditLogs.action,
            actorUserId: auditLogs.actorUserId,
            actorName: users.fullName,
            beforeData: auditLogs.beforeData,
            afterData: auditLogs.afterData,
            occurredAt: auditLogs.occurredAt,
          })
          .from(auditLogs)
          .leftJoin(users, eq(users.id, auditLogs.actorUserId))
          .where(
            and(
              eq(auditLogs.tenantId, actor.tenantId),
              eq(auditLogs.entityType, "sales_order"),
              eq(auditLogs.entityId, id),
            ),
          )
          .orderBy(asc(auditLogs.occurredAt)),
        this.database.db
          .select()
          .from(salesOrderItemStatusHistory)
          .where(
            and(
              eq(salesOrderItemStatusHistory.tenantId, actor.tenantId),
              eq(salesOrderItemStatusHistory.salesOrderId, id),
            ),
          )
          .orderBy(asc(salesOrderItemStatusHistory.changedAt)),
        this.database.db
          .select({
            id: payments.id,
            originalPaymentId: payments.originalPaymentId,
            entryType: payments.entryType,
            method: payments.method,
            status: payments.status,
            currencyCode: payments.currencyCode,
            amountApplied: payments.amountApplied,
            amountTendered: payments.amountTendered,
            changeAmount: payments.changeAmount,
            externalReference: payments.externalReference,
            reason: payments.reason,
            paidAt: payments.paidAt,
            voidedAt: payments.voidedAt,
            cashierId: payments.cashierId,
            createdAt: payments.createdAt,
          })
          .from(payments)
          .where(
            and(
              eq(payments.tenantId, actor.tenantId),
              eq(payments.salesOrderId, id),
            ),
          ),
        this.database.db
          .select({
            id: salesItemConsumptions.id,
            status: salesItemConsumptions.status,
          })
          .from(salesItemConsumptions)
          .where(
            and(
              eq(salesItemConsumptions.tenantId, actor.tenantId),
              eq(salesItemConsumptions.salesOrderId, id),
            ),
          ),
      ]);
    return {
      ...this.serializeDetail(detail),
      history,
      itemStatusHistory,
      payments: paymentRows.map((row) => this.serializeMoney(row)),
      consumptions,
    };
  }

  async create(actor: AuthUser, dto: CreatePosOrderDto) {
    this.validateIdentity(dto.orderType, dto.tableNumber);
    await this.assertOutletAccess(actor, dto.outletId);
    const requestHash = this.requestHash(dto);
    const result = await this.database.db.transaction(async (tx) => {
      const [lease] = await tx
        .insert(posOperationRequests)
        .values({
          tenantId: actor.tenantId,
          outletId: dto.outletId,
          idempotencyKey: dto.idempotencyKey,
          operation: "create_draft",
          requestHash,
        })
        .onConflictDoNothing()
        .returning({ id: posOperationRequests.id });
      if (!lease) {
        const [existing] = await tx
          .select()
          .from(posOperationRequests)
          .where(
            and(
              eq(posOperationRequests.tenantId, actor.tenantId),
              eq(posOperationRequests.idempotencyKey, dto.idempotencyKey),
            ),
          )
          .limit(1);
        if (!existing || existing.requestHash !== requestHash)
          throw new ConflictException(
            "Idempotency key sudah digunakan untuk payload berbeda.",
          );
        if (existing.status === "completed" && existing.salesOrderId)
          return { orderId: existing.salesOrderId, replay: true };
        if (existing.leaseExpiresAt > new Date())
          throw new ConflictException(
            "Request dengan idempotency key ini sedang diproses.",
          );
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
        if (!claimed)
          throw new ConflictException(
            "Request dengan idempotency key ini sedang diproses.",
          );
      }

      const outlet = await this.outletContext(actor.tenantId, dto.outletId, tx);
      if (!outlet) throw new NotFoundException("Outlet aktif tidak ditemukan.");
      const normalized = await this.normalizeItems(
        actor.tenantId,
        dto.outletId,
        outlet.currencyCode,
        dto.items,
        actor.userId,
        tx,
      );
      const subtotalMinor = normalized.reduce(
        (sum, item) => sum + item.lineSubtotalMinor,
        0n,
      );
      const businessDate = await this.businessDate(outlet, tx);
      const [sequence] = await tx
        .insert(documentSequences)
        .values({
          tenantId: actor.tenantId,
          outletId: dto.outletId,
          documentType: "sales_order",
          businessDate,
          lastNumber: 1,
          prefixPattern: "SO-{YYMMDD}-{####}",
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
      const orderNo = `SO-${businessDate.replaceAll("-", "").slice(2)}-${String(sequence.lastNumber).padStart(4, "0")}`;
      const money = formatMinor(subtotalMinor) as unknown as number;
      const [header] = await tx
        .insert(salesOrders)
        .values({
          tenantId: actor.tenantId,
          outletId: dto.outletId,
          orderNo,
          businessDate,
          orderType: dto.orderType,
          tableNumber:
            dto.orderType === "dine_in" ? dto.tableNumber?.trim() : null,
          customerName: this.clean(dto.customerName),
          notes: this.clean(dto.notes),
          currencyCode: outlet.currencyCode,
          status: "draft",
          paymentStatus: "unpaid",
          subtotal: money,
          totalAmount: money,
          createdBy: actor.userId,
          cashierId: actor.userId,
          updatedBy: actor.userId,
        })
        .returning();
      await this.insertItems(tx, actor, header.id, normalized);
      await tx.insert(auditLogs).values({
        tenantId: actor.tenantId,
        outletId: dto.outletId,
        actorUserId: actor.userId,
        action: "sales_order.create",
        entityType: "sales_order",
        entityId: header.id,
        afterData: this.auditSnapshot(header, normalized),
      });
      await tx
        .update(posOperationRequests)
        .set({
          status: "completed",
          salesOrderId: header.id,
          responseStatus: 201,
          responseBody: { orderId: header.id },
          completedAt: new Date(),
        })
        .where(
          and(
            eq(posOperationRequests.tenantId, actor.tenantId),
            eq(posOperationRequests.idempotencyKey, dto.idempotencyKey),
          ),
        );
      return { orderId: header.id, replay: false };
    });
    return this.get(actor, result.orderId);
  }

  async update(actor: AuthUser, id: string, dto: UpdatePosOrderDto) {
    const before = await this.getBase(actor.tenantId, id, this.database.db);
    if (!before) throw new NotFoundException("Order POS tidak ditemukan.");
    await this.assertOutletAccess(actor, before.outletId);
    if (before.status !== "draft")
      throw new ConflictException("Hanya order draft yang dapat diubah.");
    const orderType = dto.orderType ?? before.orderType;
    const tableNumber =
      orderType === "takeaway" ? null : (dto.tableNumber ?? before.tableNumber);
    this.validateIdentity(orderType, tableNumber);

    await this.database.db.transaction(async (tx) => {
      const outlet = await this.outletContext(
        actor.tenantId,
        before.outletId,
        tx,
      );
      if (!outlet) throw new NotFoundException("Outlet aktif tidak ditemukan.");
      const normalized = await this.normalizeItems(
        actor.tenantId,
        before.outletId,
        before.currencyCode,
        dto.items,
        actor.userId,
        tx,
      );
      const subtotalMinor = normalized.reduce(
        (sum, item) => sum + item.lineSubtotalMinor,
        0n,
      );
      const now = new Date();
      const money = formatMinor(subtotalMinor) as unknown as number;
      const [updated] = await tx
        .update(salesOrders)
        .set({
          orderType,
          tableNumber,
          customerName:
            dto.customerName === undefined
              ? before.customerName
              : this.clean(dto.customerName),
          notes: dto.notes === undefined ? before.notes : this.clean(dto.notes),
          subtotal: money,
          totalAmount: money,
          lockVersion: sql`${salesOrders.lockVersion} + 1`,
          updatedAt: now,
          updatedBy: actor.userId,
        })
        .where(
          and(
            eq(salesOrders.id, id),
            eq(salesOrders.tenantId, actor.tenantId),
            eq(salesOrders.outletId, before.outletId),
            eq(salesOrders.status, "draft"),
            eq(salesOrders.lockVersion, dto.lockVersion),
          ),
        )
        .returning();
      if (!updated)
        throw new ConflictException(
          "Order telah berubah atau bukan lagi draft. Muat ulang data.",
        );
      await tx
        .delete(salesOrderItems)
        .where(
          and(
            eq(salesOrderItems.tenantId, actor.tenantId),
            eq(salesOrderItems.salesOrderId, id),
            eq(salesOrderItems.status, "draft"),
          ),
        );
      await this.insertItems(tx, actor, id, normalized);
      await tx.insert(auditLogs).values({
        tenantId: actor.tenantId,
        outletId: before.outletId,
        actorUserId: actor.userId,
        action: "sales_order.draft_update",
        entityType: "sales_order",
        entityId: id,
        beforeData: this.auditSnapshot(before, before.items),
        afterData: this.auditSnapshot(updated, normalized),
      });
    });
    return this.get(actor, id);
  }

  async submit(actor: AuthUser, id: string, dto: PosMutationDto) {
    const visible = await this.getBase(actor.tenantId, id, this.database.db);
    if (!visible) throw new NotFoundException("Order POS tidak ditemukan.");
    await this.assertOutletAccess(actor, visible.outletId);
    const requestHash = this.requestHash({
      operation: "submit_order",
      orderId: id,
      ...dto,
    });

    const result = await this.database.db.transaction(async (tx) => {
      await tx.execute(
        sql`select id from sales_orders where id = ${id} and tenant_id = ${actor.tenantId} and outlet_id = ${visible.outletId} for update`,
      );
      const current = await this.getBase(actor.tenantId, id, tx);
      if (!current) throw new NotFoundException("Order POS tidak ditemukan.");
      const operation = await this.acquireOperation(
        tx,
        actor,
        current.outletId,
        dto.idempotencyKey,
        "submit_order",
        requestHash,
      );
      if (operation.replay) return { orderId: id };
      if (current.status !== "draft")
        throw new ConflictException("ORDER_NOT_DRAFT: Order sudah diproses.");
      if (current.paymentStatus !== "unpaid")
        throw new ConflictException(
          "ORDER_ALREADY_SUBMITTED: Status pembayaran order tidak valid.",
        );
      if (current.lockVersion !== dto.lockVersion)
        throw new ConflictException(
          "STALE_ORDER_VERSION: Muat ulang order sebelum submit.",
        );
      if (!current.items.length)
        throw new ConflictException("ORDER_EMPTY: Order tidak memiliki item.");
      const outlet = await this.outletContext(
        actor.tenantId,
        current.outletId,
        tx,
      );
      if (!outlet) throw new ConflictException("OUTLET_NOT_ACTIVE");

      const plans = await this.submitPlans(actor, current, tx);
      const movement = await this.createStockMovement(
        tx,
        actor,
        current,
        "sale_consumption",
      );
      const allocations = await this.consumePlans(
        tx,
        actor,
        current,
        movement.id,
        plans,
      );
      const changedAt = new Date();
      for (const item of current.items) {
        const nextStatus = item.requiresKitchen ? "queued" : "completed";
        await tx
          .update(salesOrderItems)
          .set({
            status: nextStatus,
            queuedAt: item.requiresKitchen ? changedAt : null,
            completedAt: item.requiresKitchen ? null : changedAt,
            lockVersion: sql`${salesOrderItems.lockVersion} + 1`,
            updatedAt: changedAt,
            updatedBy: actor.userId,
          })
          .where(
            and(
              eq(salesOrderItems.id, item.id),
              eq(salesOrderItems.tenantId, actor.tenantId),
              eq(salesOrderItems.salesOrderId, id),
              eq(salesOrderItems.status, "draft"),
            ),
          );
        await tx.insert(salesOrderItemStatusHistory).values({
          tenantId: actor.tenantId,
          outletId: current.outletId,
          salesOrderId: id,
          salesOrderItemId: item.id,
          fromStatus: "draft",
          toStatus: nextStatus,
          changedBy: actor.userId,
        });
      }
      const nextStatus = current.items.some((item: any) => item.requiresKitchen)
        ? "submitted"
        : "ready";
      const [updated] = await tx
        .update(salesOrders)
        .set({
          status: nextStatus,
          submittedAt: changedAt,
          submittedBy: actor.userId,
          lockVersion: sql`${salesOrders.lockVersion} + 1`,
          updatedAt: changedAt,
          updatedBy: actor.userId,
        })
        .where(
          and(
            eq(salesOrders.id, id),
            eq(salesOrders.tenantId, actor.tenantId),
            eq(salesOrders.outletId, current.outletId),
            eq(salesOrders.status, "draft"),
            eq(salesOrders.paymentStatus, "unpaid"),
            eq(salesOrders.lockVersion, dto.lockVersion),
          ),
        )
        .returning();
      if (!updated)
        throw new ConflictException(
          "STALE_ORDER_VERSION: Order berubah saat submit.",
        );
      await tx.insert(auditLogs).values({
        tenantId: actor.tenantId,
        outletId: current.outletId,
        actorUserId: actor.userId,
        action: "sales_order.submit",
        entityType: "sales_order",
        entityId: id,
        beforeData: {
          status: current.status,
          lockVersion: current.lockVersion,
        },
        afterData: {
          status: nextStatus,
          lockVersion: updated.lockVersion,
          movementId: movement.id,
          recipes: plans.map((plan) => ({
            salesOrderItemId: plan.salesOrderItemId,
            recipeVersionId: plan.recipeVersionId,
          })),
          allocations,
        },
      });
      await this.completeOperation(tx, operation.id, id);
      return { orderId: id };
    });
    return this.get(actor, result.orderId);
  }

  async pay(actor: AuthUser, id: string, dto: RecordPosPaymentDto) {
    const visible = await this.getBase(actor.tenantId, id, this.database.db);
    if (!visible) throw new NotFoundException("Order POS tidak ditemukan.");
    await this.assertOutletAccess(actor, visible.outletId);
    const externalReference = dto.externalReference?.trim() || null;
    const requestHash = this.requestHash({
      operation: "record_payment",
      orderId: id,
      ...dto,
      externalReference,
    });

    const result = await this.database.db.transaction(async (tx) => {
      await tx.execute(
        sql`select id from sales_orders where id = ${id} and tenant_id = ${actor.tenantId} and outlet_id = ${visible.outletId} for update`,
      );
      const current = await this.getBase(actor.tenantId, id, tx);
      if (!current) throw new NotFoundException("Order POS tidak ditemukan.");
      const operation = await this.acquireOperation(
        tx,
        actor,
        current.outletId,
        dto.idempotencyKey,
        "record_payment",
        requestHash,
      );
      if (operation.replay) return { orderId: id };
      if (current.lockVersion !== dto.lockVersion)
        throw new ConflictException(
          "STALE_ORDER_VERSION: Muat ulang order sebelum pembayaran.",
        );
      if (["draft", "cancelled", "completed"].includes(current.status))
        throw new ConflictException(
          "ORDER_NOT_PAYABLE: Order belum submitted atau sudah terminal.",
        );
      if (current.paymentStatus !== "unpaid")
        throw new ConflictException("ORDER_ALREADY_PAID");
      if (parseDecimalToMinor(current.totalAmount) <= 0n)
        throw new ConflictException("ORDER_TOTAL_INVALID");
      const totalMinor = parseDecimalToMinor(current.totalAmount);
      const tenderedMinor = parseDecimalToMinor(dto.amountTendered);
      if (dto.method === "cash" && tenderedMinor < totalMinor)
        throw new BadRequestException(
          "PAYMENT_AMOUNT_INSUFFICIENT: Uang tunai tidak mencukupi.",
        );
      if (dto.method !== "cash" && !externalReference)
        throw new BadRequestException(
          "PAYMENT_REFERENCE_REQUIRED: Referensi pembayaran wajib diisi.",
        );
      if (dto.method !== "cash" && tenderedMinor !== totalMinor)
        throw new BadRequestException(
          "PAYMENT_AMOUNT_MISMATCH: Nominal pembayaran non-tunai harus sama dengan total order.",
        );

      const [movement] = await tx
        .select({ id: stockMovements.id })
        .from(stockMovements)
        .where(
          and(
            eq(stockMovements.tenantId, actor.tenantId),
            eq(stockMovements.outletId, current.outletId),
            eq(stockMovements.referenceType, "sales_order"),
            eq(stockMovements.referenceId, id),
            eq(stockMovements.movementType, "sale_consumption"),
            eq(stockMovements.status, "posted"),
          ),
        )
        .limit(1);
      if (!movement)
        throw new ConflictException("CONSUMPTION_NOT_POSTED");
      if (current.items.some((item: any) => item.requiresRecipe)) {
        const [posted] = await tx
          .select({ count: sql<number>`count(*)::int` })
          .from(salesItemConsumptions)
          .where(
            and(
              eq(salesItemConsumptions.tenantId, actor.tenantId),
              eq(salesItemConsumptions.salesOrderId, id),
              eq(salesItemConsumptions.status, "posted"),
            ),
          );
        if (!posted?.count)
          throw new ConflictException("CONSUMPTION_NOT_POSTED");
      }

      let calculated: ReturnType<typeof calculatePayment>;
      try {
        calculated = calculatePayment(
          this.moneyString(current.totalAmount),
          dto.method,
          dto.amountTendered,
          externalReference ?? undefined,
        );
      } catch (error) {
        throw new BadRequestException(
          error instanceof Error ? error.message : "PAYMENT_INVALID",
        );
      }
      if (externalReference) {
        const [duplicateReference] = await tx
          .select({ id: payments.id })
          .from(payments)
          .where(
            and(
              eq(payments.tenantId, actor.tenantId),
              eq(payments.outletId, current.outletId),
              eq(payments.externalReference, externalReference),
            ),
          )
          .limit(1);
        if (duplicateReference)
          throw new ConflictException("PAYMENT_REFERENCE_ALREADY_USED");
      }

      const receiptNo = await this.nextReceiptNo(tx, actor, current);
      const now = new Date();
      const [payment] = await tx
        .insert(payments)
        .values({
          tenantId: actor.tenantId,
          outletId: current.outletId,
          salesOrderId: id,
          entryType: "payment",
          method: dto.method,
          status: "paid",
          currencyCode: current.currencyCode,
          amountApplied: calculated.amountApplied as any,
          amountTendered: calculated.amountTendered as any,
          changeAmount: calculated.changeAmount as any,
          externalReference,
          paidAt: now,
          cashierId: actor.userId,
          createdBy: actor.userId,
        })
        .returning();
      const [updated] = await tx
        .update(salesOrders)
        .set({
          receiptNo,
          paymentStatus: "paid",
          lockVersion: sql`${salesOrders.lockVersion} + 1`,
          updatedAt: now,
          updatedBy: actor.userId,
        })
        .where(
          and(
            eq(salesOrders.id, id),
            eq(salesOrders.tenantId, actor.tenantId),
            eq(salesOrders.outletId, current.outletId),
            eq(salesOrders.paymentStatus, "unpaid"),
            eq(salesOrders.lockVersion, dto.lockVersion),
          ),
        )
        .returning();
      if (!updated)
        throw new ConflictException("STALE_ORDER_VERSION");
      await tx.insert(auditLogs).values({
        tenantId: actor.tenantId,
        outletId: current.outletId,
        actorUserId: actor.userId,
        action: "sales_order.payment_recorded",
        entityType: "sales_order",
        entityId: id,
        beforeData: { paymentStatus: current.paymentStatus },
        afterData: {
          paymentStatus: "paid",
          paymentId: payment.id,
          receiptNo,
          method: dto.method,
          amountApplied: calculated.amountApplied,
          amountTendered: calculated.amountTendered,
          changeAmount: calculated.changeAmount,
          lockVersion: updated.lockVersion,
          cashierId: actor.userId,
          paidAt: now.toISOString(),
        },
      });
      await this.completeOperation(tx, operation.id, id, payment.id);
      return { orderId: id };
    });
    return this.get(actor, result.orderId);
  }

  async complete(actor: AuthUser, id: string, dto: PosMutationDto) {
    const visible = await this.getBase(actor.tenantId, id, this.database.db);
    if (!visible) throw new NotFoundException("Order POS tidak ditemukan.");
    await this.assertOutletAccess(actor, visible.outletId);
    const requestHash = this.requestHash({
      operation: "complete_order",
      orderId: id,
      ...dto,
    });
    const result = await this.database.db.transaction(async (tx) => {
      await tx.execute(
        sql`select id from sales_orders where id = ${id} and tenant_id = ${actor.tenantId} and outlet_id = ${visible.outletId} for update`,
      );
      const current = await this.getBase(actor.tenantId, id, tx);
      if (!current) throw new NotFoundException("Order POS tidak ditemukan.");
      const operation = await this.acquireOperation(
        tx,
        actor,
        current.outletId,
        dto.idempotencyKey,
        "complete_order",
        requestHash,
      );
      if (operation.replay) return { orderId: id };
      if (current.lockVersion !== dto.lockVersion)
        throw new ConflictException("STALE_ORDER_VERSION");
      if (current.paymentStatus !== "paid")
        throw new ConflictException("ORDER_NOT_PAID");
      if (["draft", "cancelled", "completed"].includes(current.status))
        throw new ConflictException("ORDER_NOT_COMPLETABLE");
      const [payment] = await tx
        .select({ id: payments.id })
        .from(payments)
        .where(
          and(
            eq(payments.tenantId, actor.tenantId),
            eq(payments.salesOrderId, id),
            eq(payments.entryType, "payment"),
            eq(payments.status, "paid"),
          ),
        )
        .limit(1);
      if (!payment) throw new ConflictException("PAID_PAYMENT_NOT_FOUND");
      if (
        current.items.some(
          (item: any) => item.requiresKitchen && item.status !== "ready",
        )
      )
        throw new ConflictException("KITCHEN_ITEMS_NOT_READY");
      if (
        current.items.some(
          (item: any) => !item.requiresKitchen && item.status !== "completed",
        )
      )
        throw new ConflictException("NON_KITCHEN_ITEMS_NOT_COMPLETED");

      const now = new Date();
      const itemTransitions = current.items
        .filter((row: any) => row.requiresKitchen)
        .map((row: any) => ({
          salesOrderItemId: row.id,
          fromStatus: "ready",
          toStatus: "completed",
        }));
      for (const item of current.items.filter(
        (row: any) => row.requiresKitchen,
      )) {
        await tx
          .update(salesOrderItems)
          .set({
            status: "completed",
            completedAt: now,
            lockVersion: sql`${salesOrderItems.lockVersion} + 1`,
            updatedAt: now,
            updatedBy: actor.userId,
          })
          .where(
            and(
              eq(salesOrderItems.tenantId, actor.tenantId),
              eq(salesOrderItems.salesOrderId, id),
              eq(salesOrderItems.id, item.id),
              eq(salesOrderItems.status, "ready"),
            ),
          );
        await tx.insert(salesOrderItemStatusHistory).values({
          tenantId: actor.tenantId,
          outletId: current.outletId,
          salesOrderId: id,
          salesOrderItemId: item.id,
          fromStatus: "ready",
          toStatus: "completed",
          changedBy: actor.userId,
        });
      }
      const [updated] = await tx
        .update(salesOrders)
        .set({
          status: "completed",
          completedAt: now,
          completedBy: actor.userId,
          lockVersion: sql`${salesOrders.lockVersion} + 1`,
          updatedAt: now,
          updatedBy: actor.userId,
        })
        .where(
          and(
            eq(salesOrders.id, id),
            eq(salesOrders.tenantId, actor.tenantId),
            eq(salesOrders.outletId, current.outletId),
            eq(salesOrders.paymentStatus, "paid"),
            eq(salesOrders.status, current.status),
            eq(salesOrders.lockVersion, dto.lockVersion),
          ),
        )
        .returning();
      if (!updated) throw new ConflictException("STALE_ORDER_VERSION");
      await tx.insert(auditLogs).values({
        tenantId: actor.tenantId,
        outletId: current.outletId,
        actorUserId: actor.userId,
        action: "sales_order.complete",
        entityType: "sales_order",
        entityId: id,
        beforeData: { status: current.status, lockVersion: current.lockVersion },
        afterData: {
          status: "completed",
          lockVersion: updated.lockVersion,
          itemTransitions,
          completedAt: now.toISOString(),
        },
      });
      await this.completeOperation(tx, operation.id, id, payment.id);
      return { orderId: id };
    });
    return this.get(actor, result.orderId);
  }

  async void(actor: AuthUser, id: string, dto: VoidPosOrderDto) {
    const reason = dto.reason.trim();
    if (reason.length < 3)
      throw new BadRequestException(
        "Alasan void minimal tiga karakter bermakna.",
      );
    const refundReference = dto.refundReference?.trim() || null;
    const visible = await this.getBase(actor.tenantId, id, this.database.db);
    if (!visible) throw new NotFoundException("Order POS tidak ditemukan.");
    await this.assertOutletAccess(actor, visible.outletId);
    const requestHash = this.requestHash({
      operation: "void_paid_order",
      orderId: id,
      ...dto,
      reason,
      refundReference,
    });
    const result = await this.database.db.transaction(async (tx) => {
      await tx.execute(
        sql`select id from sales_orders where id = ${id} and tenant_id = ${actor.tenantId} and outlet_id = ${visible.outletId} for update`,
      );
      const current = await this.getBase(actor.tenantId, id, tx);
      if (!current) throw new NotFoundException("Order POS tidak ditemukan.");
      const operation = await this.acquireOperation(
        tx,
        actor,
        current.outletId,
        dto.idempotencyKey,
        "void_paid_order",
        requestHash,
      );
      if (operation.replay) return { orderId: id };
      if (current.lockVersion !== dto.lockVersion)
        throw new ConflictException("STALE_ORDER_VERSION");
      if (current.paymentStatus !== "paid")
        throw new ConflictException("ORDER_NOT_PAID");
      if (["draft", "cancelled"].includes(current.status))
        throw new ConflictException("ORDER_NOT_VOIDABLE");
      const [original] = await tx
        .select()
        .from(payments)
        .where(
          and(
            eq(payments.tenantId, actor.tenantId),
            eq(payments.salesOrderId, id),
            eq(payments.entryType, "payment"),
            eq(payments.status, "paid"),
          ),
        )
        .limit(1);
      if (!original) throw new ConflictException("PAID_PAYMENT_NOT_FOUND");
      await tx.execute(
        sql`select id from payments where id = ${original.id} and tenant_id = ${actor.tenantId} for update`,
      );
      if (original.method !== "cash" && !refundReference)
        throw new BadRequestException(
          "Refund reference wajib untuk pembayaran non-tunai.",
        );
      if (refundReference) {
        const [duplicateReference] = await tx
          .select({ id: payments.id })
          .from(payments)
          .where(
            and(
              eq(payments.tenantId, actor.tenantId),
              eq(payments.outletId, current.outletId),
              eq(payments.externalReference, refundReference),
            ),
          )
          .limit(1);
        if (duplicateReference)
          throw new ConflictException("PAYMENT_REFERENCE_ALREADY_USED");
      }

      const reversal = await this.reverseConsumption(
        tx,
        actor,
        current,
        reason,
      );
      const now = new Date();
      const [refund] = await tx
        .insert(payments)
        .values({
          tenantId: actor.tenantId,
          outletId: current.outletId,
          salesOrderId: id,
          originalPaymentId: original.id,
          entryType: "manual_refund",
          method: original.method,
          status: "voided",
          currencyCode: original.currencyCode,
          amountApplied: original.amountApplied,
          amountTendered: original.amountApplied,
          changeAmount: 0,
          externalReference: refundReference,
          reason,
          voidedAt: now,
          cashierId: actor.userId,
          createdBy: actor.userId,
        })
        .returning();
      await tx
        .update(payments)
        .set({ status: "voided", voidedAt: now, reason })
        .where(
          and(
            eq(payments.id, original.id),
            eq(payments.tenantId, actor.tenantId),
            eq(payments.status, "paid"),
          ),
        );

      if (current.status !== "completed") {
        for (const item of current.items) {
          await tx
            .update(salesOrderItems)
            .set({
              status: "cancelled",
              cancelledAt: now,
              cancelledBy: actor.userId,
              cancellationReason: reason,
              lockVersion: sql`${salesOrderItems.lockVersion} + 1`,
              updatedAt: now,
              updatedBy: actor.userId,
            })
            .where(
              and(
                eq(salesOrderItems.tenantId, actor.tenantId),
                eq(salesOrderItems.salesOrderId, id),
                eq(salesOrderItems.id, item.id),
              ),
            );
          await tx.insert(salesOrderItemStatusHistory).values({
            tenantId: actor.tenantId,
            outletId: current.outletId,
            salesOrderId: id,
            salesOrderItemId: item.id,
            fromStatus: item.status,
            toStatus: "cancelled",
            changedBy: actor.userId,
            reason,
          });
        }
      }
      const nextStatus =
        current.status === "completed" ? "completed" : "cancelled";
      const [updated] = await tx
        .update(salesOrders)
        .set({
          status: nextStatus,
          paymentStatus: "voided",
          cancelledAt: nextStatus === "cancelled" ? now : null,
          cancelledBy: nextStatus === "cancelled" ? actor.userId : null,
          cancellationReason: nextStatus === "cancelled" ? reason : null,
          lockVersion: sql`${salesOrders.lockVersion} + 1`,
          updatedAt: now,
          updatedBy: actor.userId,
        })
        .where(
          and(
            eq(salesOrders.id, id),
            eq(salesOrders.tenantId, actor.tenantId),
            eq(salesOrders.outletId, current.outletId),
            eq(salesOrders.paymentStatus, "paid"),
            eq(salesOrders.status, current.status),
            eq(salesOrders.lockVersion, dto.lockVersion),
          ),
        )
        .returning();
      if (!updated) throw new ConflictException("STALE_ORDER_VERSION");
      await tx.insert(auditLogs).values({
        tenantId: actor.tenantId,
        outletId: current.outletId,
        actorUserId: actor.userId,
        action: "sales_order.payment_voided",
        entityType: "sales_order",
        entityId: id,
        beforeData: {
          status: current.status,
          paymentStatus: current.paymentStatus,
          paymentId: original.id,
        },
        afterData: {
          status: nextStatus,
          paymentStatus: "voided",
          refundPaymentId: refund.id,
          refundReference,
          refundAmount: this.moneyString(original.amountApplied),
          lockVersion: updated.lockVersion,
          voidedAt: now.toISOString(),
          postCompletionVoid: current.status === "completed",
          ...reversal,
        },
        reason,
      });
      await this.completeOperation(tx, operation.id, id, refund.id);
      return { orderId: id };
    });
    return this.get(actor, result.orderId);
  }

  async cancel(actor: AuthUser, id: string, dto: PosReasonMutationDto) {
    if (dto.reason.trim().length < 3)
      throw new BadRequestException(
        "Alasan pembatalan minimal tiga karakter bermakna.",
      );
    const visible = await this.getBase(actor.tenantId, id, this.database.db);
    if (!visible) throw new NotFoundException("Order POS tidak ditemukan.");
    await this.assertOutletAccess(actor, visible.outletId);
    const requestHash = this.requestHash({
      operation: "cancel_order",
      orderId: id,
      ...dto,
      reason: dto.reason.trim(),
    });

    const result = await this.database.db.transaction(async (tx) => {
      await tx.execute(
        sql`select id from sales_orders where id = ${id} and tenant_id = ${actor.tenantId} and outlet_id = ${visible.outletId} for update`,
      );
      const current = await this.getBase(actor.tenantId, id, tx);
      if (!current) throw new NotFoundException("Order POS tidak ditemukan.");
      const operation = await this.acquireOperation(
        tx,
        actor,
        current.outletId,
        dto.idempotencyKey,
        "cancel_order",
        requestHash,
      );
      if (operation.replay) return { orderId: id };
      if (current.lockVersion !== dto.lockVersion)
        throw new ConflictException(
          "STALE_ORDER_VERSION: Muat ulang order sebelum cancel.",
        );
      if (current.paymentStatus !== "unpaid")
        throw new ConflictException(
          "PAID_ORDER_REQUIRES_VOID: Order berbayar harus melalui void.",
        );
      if (current.status === "cancelled")
        throw new ConflictException("ORDER_ALREADY_CANCELLED");
      if (current.status === "completed")
        throw new ConflictException(
          "ORDER_TERMINAL: Order completed tidak dapat dibatalkan.",
        );

      let originalMovementId: string | null = null;
      let reversalMovementId: string | null = null;
      if (current.status !== "draft") {
        const reversal = await this.reverseConsumption(
          tx,
          actor,
          current,
          dto.reason.trim(),
        );
        originalMovementId = reversal.originalMovementId;
        reversalMovementId = reversal.reversalMovementId;
      }

      const changedAt = new Date();
      const itemChanges: Array<{ id: string; from: string }> = [];
      for (const item of current.items) {
        itemChanges.push({ id: item.id, from: item.status });
        await tx
          .update(salesOrderItems)
          .set({
            status: "cancelled",
            cancelledAt: changedAt,
            cancelledBy: actor.userId,
            cancellationReason: dto.reason.trim(),
            lockVersion: sql`${salesOrderItems.lockVersion} + 1`,
            updatedAt: changedAt,
            updatedBy: actor.userId,
          })
          .where(
            and(
              eq(salesOrderItems.id, item.id),
              eq(salesOrderItems.tenantId, actor.tenantId),
              eq(salesOrderItems.salesOrderId, id),
            ),
          );
        await tx.insert(salesOrderItemStatusHistory).values({
          tenantId: actor.tenantId,
          outletId: current.outletId,
          salesOrderId: id,
          salesOrderItemId: item.id,
          fromStatus: item.status,
          toStatus: "cancelled",
          changedBy: actor.userId,
          reason: dto.reason.trim(),
        });
      }
      const [updated] = await tx
        .update(salesOrders)
        .set({
          status: "cancelled",
          cancelledAt: changedAt,
          cancelledBy: actor.userId,
          cancellationReason: dto.reason.trim(),
          lockVersion: sql`${salesOrders.lockVersion} + 1`,
          updatedAt: changedAt,
          updatedBy: actor.userId,
        })
        .where(
          and(
            eq(salesOrders.id, id),
            eq(salesOrders.tenantId, actor.tenantId),
            eq(salesOrders.outletId, current.outletId),
            eq(salesOrders.paymentStatus, "unpaid"),
            eq(salesOrders.status, current.status),
            eq(salesOrders.lockVersion, dto.lockVersion),
          ),
        )
        .returning();
      if (!updated)
        throw new ConflictException(
          "STALE_ORDER_VERSION: Order berubah saat cancel.",
        );
      await tx.insert(auditLogs).values({
        tenantId: actor.tenantId,
        outletId: current.outletId,
        actorUserId: actor.userId,
        action: "sales_order.cancel",
        entityType: "sales_order",
        entityId: id,
        beforeData: {
          status: current.status,
          lockVersion: current.lockVersion,
        },
        afterData: {
          status: "cancelled",
          lockVersion: updated.lockVersion,
          originalMovementId,
          reversalMovementId,
          itemChanges,
        },
        reason: dto.reason.trim(),
      });
      await this.completeOperation(tx, operation.id, id);
      return { orderId: id };
    });
    return this.get(actor, result.orderId);
  }

  private async submitPlans(actor: AuthUser, order: any, tx: DbExecutor) {
    const variantIds = order.items.map((item: any) => item.menuVariantId);
    const currentMasters = await this.lookupRows(
      actor.tenantId,
      order.outletId,
      tx,
      variantIds,
    );
    if (currentMasters.length !== variantIds.length)
      throw new ConflictException(
        "MASTER_NOT_AVAILABLE: Menu atau variant tidak lagi tersedia.",
      );
    const masterMap = new Map(
      currentMasters.map((row: any) => [row.variantId, row]),
    );
    for (const item of order.items) {
      const master: any = masterMap.get(item.menuVariantId);
      const effectivePrice = master.priceOverride ?? master.basePrice;
      if (
        effectivePrice === null ||
        parseDecimalToMinor(effectivePrice) !==
          parseDecimalToMinor(item.unitPrice)
      )
        throw new ConflictException(
          `PRICE_CHANGED: Harga ${item.variantNameSnapshot} berubah; perbarui draft.`,
        );
      const currentPriceVersion =
        master.settingUpdatedAt &&
        master.settingUpdatedAt > master.variantUpdatedAt
          ? master.settingUpdatedAt
          : master.variantUpdatedAt;
      if (currentPriceVersion.getTime() !== item.priceSourceVersionAt.getTime())
        throw new ConflictException(
          `PRICE_CHANGED: Sumber harga ${item.variantNameSnapshot} berubah; perbarui draft.`,
        );
      if (master.currencyCode !== item.currencyCode)
        throw new ConflictException(
          `CURRENCY_MISMATCH: Currency ${item.variantNameSnapshot} berubah.`,
        );
      if (
        master.requiresRecipe !== item.requiresRecipe ||
        master.requiresKitchen !== item.requiresKitchen
      )
        throw new ConflictException(
          `MASTER_CHANGED: Konfigurasi ${item.variantNameSnapshot} berubah.`,
        );
    }

    const recipeOrderItems = order.items.filter(
      (item: any) => item.requiresRecipe,
    );
    if (!recipeOrderItems.length) return [] as ConsumptionPlan[];
    const recipeVersionIds = recipeOrderItems.map(
      (item: any) => item.recipeVersionId,
    );
    if (recipeVersionIds.some((id: string | null) => !id))
      throw new ConflictException(
        "RECIPE_NOT_READY: Snapshot Recipe tidak lengkap.",
      );
    const now = new Date();
    const recipeRows = await tx
      .select({
        id: recipes.id,
        recipeHeaderId: recipes.recipeHeaderId,
        menuVariantId: recipes.menuVariantId,
        versionNo: recipes.versionNo,
        servingCount: recipes.servingCount,
        status: recipes.status,
        effectiveFrom: recipes.effectiveFrom,
        effectiveUntil: recipes.effectiveUntil,
        approvedOutletId: recipes.approvedOutletId,
      })
      .from(recipes)
      .where(
        and(
          eq(recipes.tenantId, actor.tenantId),
          inArray(recipes.id, recipeVersionIds),
        ),
      );
    const recipeMap = new Map(recipeRows.map((row: any) => [row.id, row]));
    for (const item of recipeOrderItems) {
      const recipe: any = recipeMap.get(item.recipeVersionId);
      if (
        !recipe ||
        recipe.recipeHeaderId !== item.recipeHeaderId ||
        recipe.menuVariantId !== item.menuVariantId ||
        recipe.versionNo !== item.recipeVersionNo ||
        recipe.status !== "approved" ||
        recipe.effectiveFrom > now ||
        (recipe.effectiveUntil && recipe.effectiveUntil <= now) ||
        (recipe.approvedOutletId &&
          recipe.approvedOutletId !== order.outletId) ||
        parseFixed(recipe.servingCount, 3) <= 0n
      )
        throw new ConflictException(
          `RECIPE_NOT_READY: Snapshot Recipe ${item.variantNameSnapshot} tidak lagi sah.`,
        );
    }

    const componentRows = await tx
      .select({
        id: recipeItems.id,
        recipeVersionId: recipeItems.recipeId,
        ingredientId: recipeItems.ingredientId,
        baseQuantity: recipeItems.baseQuantity,
        isOptional: recipeItems.isOptional,
        ingredientSku: recipeItems.ingredientSkuSnapshot,
        ingredientName: recipeItems.ingredientNameSnapshot,
        baseUnitCode: recipeItems.baseUnitCodeSnapshot,
        currentIngredientSku: ingredients.sku,
        currentIngredientName: ingredients.name,
        currentBaseUnitCode: units.code,
      })
      .from(recipeItems)
      .innerJoin(
        ingredients,
        and(
          eq(ingredients.id, recipeItems.ingredientId),
          eq(ingredients.tenantId, actor.tenantId),
        ),
      )
      .innerJoin(units, eq(units.id, ingredients.baseUnitId))
      .where(
        and(
          eq(recipeItems.tenantId, actor.tenantId),
          inArray(recipeItems.recipeId, recipeVersionIds),
        ),
      )
      .orderBy(asc(recipeItems.recipeId), asc(recipeItems.lineNo));
    const components = new Map<string, any[]>();
    for (const row of componentRows) {
      const list = components.get(row.recipeVersionId) ?? [];
      list.push(row);
      components.set(row.recipeVersionId, list);
    }

    const plans: ConsumptionPlan[] = [];
    for (const item of recipeOrderItems) {
      const recipe: any = recipeMap.get(item.recipeVersionId)!;
      const rows = components.get(item.recipeVersionId) ?? [];
      if (!rows.length)
        throw new ConflictException(
          `RECIPE_NOT_READY: Recipe ${item.variantNameSnapshot} tidak memiliki item.`,
        );
      for (const component of rows) {
        if (component.baseQuantity === null)
          throw new ConflictException(
            `RECIPE_NOT_READY: Konversi bahan Recipe ${item.variantNameSnapshot} belum lengkap.`,
          );
        let requiredMicro: bigint;
        try {
          requiredMicro = recipeRequirement(
            component.baseQuantity,
            recipe.servingCount,
            item.quantity,
          );
        } catch {
          throw new ConflictException(
            `RECIPE_NOT_READY: Quantity Recipe ${item.variantNameSnapshot} tidak valid.`,
          );
        }
        plans.push({
          salesOrderItemId: item.id,
          recipeVersionId: item.recipeVersionId,
          recipeItemId: component.id,
          ingredientId: component.ingredientId,
          ingredientSku:
            component.ingredientSku ?? component.currentIngredientSku,
          ingredientName:
            component.ingredientName ?? component.currentIngredientName,
          baseUnitCode: component.baseUnitCode ?? component.currentBaseUnitCode,
          isOptional: component.isOptional,
          requiredMicro,
        });
      }
    }
    return plans;
  }

  private async consumePlans(
    tx: DbExecutor,
    actor: AuthUser,
    order: any,
    movementId: string,
    plans: ConsumptionPlan[],
  ) {
    const requiredPlans = plans.filter((plan) => !plan.isOptional);
    const ingredientIds = [
      ...new Set(requiredPlans.map((plan) => plan.ingredientId)),
    ].sort();
    const batchRows: any[] = ingredientIds.length
      ? await tx.execute(
          sql`select sb.id, sb.ingredient_id, sb.storage_location_id, sb.expiry_date::text, sb.received_date::text, sb.unit_cost::text, sb.quantity_on_hand::text
              from stock_batches sb
              inner join storage_locations sl on sl.id = sb.storage_location_id
              where sb.tenant_id = ${actor.tenantId}
                and sb.outlet_id = ${order.outletId}
                and sb.ingredient_id in (${sql.join(
                  ingredientIds.map((ingredientId) => sql`${ingredientId}`),
                  sql`, `,
                )})
                and sb.quantity_on_hand > 0
                and sl.tenant_id = ${actor.tenantId}
                and sl.outlet_id = ${order.outletId}
                and sl.is_active = true and sl.deleted_at is null
              order by sb.ingredient_id, sb.expiry_date asc nulls last, sb.received_date, sb.id
              for update of sb`,
        )
      : [];
    const batchesByIngredient = new Map<string, any[]>();
    for (const row of batchRows) {
      const normalized = {
        id: row.id,
        ingredientId: row.ingredient_id,
        storageLocationId: row.storage_location_id,
        expiryDate: row.expiry_date,
        receivedDate: row.received_date,
        unitCost: row.unit_cost,
        quantityOnHand: row.quantity_on_hand,
      };
      const list = batchesByIngredient.get(normalized.ingredientId) ?? [];
      list.push(normalized);
      batchesByIngredient.set(normalized.ingredientId, list);
    }

    const allocationAudit: any[] = [];
    for (const plan of plans) {
      if (plan.isOptional) {
        await tx.insert(salesItemConsumptions).values({
          tenantId: actor.tenantId,
          outletId: order.outletId,
          salesOrderId: order.id,
          salesOrderItemId: plan.salesOrderItemId,
          recipeVersionId: plan.recipeVersionId,
          recipeItemId: plan.recipeItemId,
          ingredientId: plan.ingredientId,
          ingredientSkuSnapshot: plan.ingredientSku,
          ingredientNameSnapshot: plan.ingredientName,
          baseUnitCodeSnapshot: plan.baseUnitCode,
          isOptional: true,
          requiredBaseQuantity: formatFixed(plan.requiredMicro, 6) as any,
          consumedBaseQuantity: 0,
          status: "skipped_optional",
          skippedReason: "OPTIONAL_ITEM_PHASE1",
          createdBy: actor.userId,
          updatedBy: actor.userId,
        });
        continue;
      }
      const requiredMilli = requirementToStockMilli(plan.requiredMicro);
      let allocations: Array<{ batch: any; quantityMilli: bigint }>;
      try {
        allocations = allocateFefo(
          requiredMilli,
          batchesByIngredient.get(plan.ingredientId) ?? [],
        );
      } catch {
        throw new ConflictException(
          `INSUFFICIENT_STOCK: Stok ${plan.ingredientName} tidak mencukupi.`,
        );
      }
      let requiredRemaining = plan.requiredMicro;
      for (const allocation of allocations) {
        const consumedMicro = allocation.quantityMilli * 1000n;
        const requiredForRow =
          requiredRemaining < consumedMicro ? requiredRemaining : consumedMicro;
        requiredRemaining -= requiredForRow;
        const nextMilli =
          parseFixed(allocation.batch.quantityOnHand, 3) -
          allocation.quantityMilli;
        const [updatedBatch] = await tx
          .update(stockBatches)
          .set({
            quantityOnHand: formatFixed(nextMilli, 3) as any,
            updatedAt: new Date(),
            updatedBy: actor.userId,
          })
          .where(
            and(
              eq(stockBatches.id, allocation.batch.id),
              eq(stockBatches.tenantId, actor.tenantId),
              eq(stockBatches.outletId, order.outletId),
              gte(
                stockBatches.quantityOnHand,
                formatFixed(allocation.quantityMilli, 3) as any,
              ),
            ),
          )
          .returning({ id: stockBatches.id });
        if (!updatedBatch)
          throw new ConflictException(
            `INSUFFICIENT_STOCK: Stok ${plan.ingredientName} berubah saat submit.`,
          );
        allocation.batch.quantityOnHand = formatFixed(nextMilli, 3);
        const valueMinor = inventoryValueMinor(
          allocation.quantityMilli,
          allocation.batch.unitCost,
        );
        const [locationBalance] = await tx
          .select({
            value: sql<number>`coalesce(sum(${stockBatches.quantityOnHand}), 0)`,
          })
          .from(stockBatches)
          .where(
            and(
              eq(stockBatches.tenantId, actor.tenantId),
              eq(stockBatches.outletId, order.outletId),
              eq(stockBatches.ingredientId, plan.ingredientId),
              eq(
                stockBatches.storageLocationId,
                allocation.batch.storageLocationId,
              ),
            ),
          );
        const [line] = await tx
          .insert(stockMovementLines)
          .values({
            tenantId: actor.tenantId,
            stockMovementId: movementId,
            ingredientId: plan.ingredientId,
            storageLocationId: allocation.batch.storageLocationId,
            stockBatchId: allocation.batch.id,
            quantityDelta: formatFixed(-allocation.quantityMilli, 3) as any,
            unitCost: allocation.batch.unitCost,
            valueDelta: formatMinor(-valueMinor) as any,
            balanceAfter: Number(locationBalance.value),
            createdBy: actor.userId,
            updatedBy: actor.userId,
          })
          .returning({ id: stockMovementLines.id });
        await tx.insert(salesItemConsumptions).values({
          tenantId: actor.tenantId,
          outletId: order.outletId,
          salesOrderId: order.id,
          salesOrderItemId: plan.salesOrderItemId,
          recipeVersionId: plan.recipeVersionId,
          recipeItemId: plan.recipeItemId,
          ingredientId: plan.ingredientId,
          ingredientSkuSnapshot: plan.ingredientSku,
          ingredientNameSnapshot: plan.ingredientName,
          baseUnitCodeSnapshot: plan.baseUnitCode,
          isOptional: false,
          requiredBaseQuantity: formatFixed(requiredForRow, 6) as any,
          consumedBaseQuantity: formatFixed(consumedMicro, 6) as any,
          status: "posted",
          stockBatchId: allocation.batch.id,
          stockMovementId: movementId,
          stockMovementLineId: line.id,
          unitCostSnapshot: allocation.batch.unitCost,
          valueSnapshot: formatMinor(valueMinor) as any,
          createdBy: actor.userId,
          updatedBy: actor.userId,
        });
        allocationAudit.push({
          ingredientId: plan.ingredientId,
          salesOrderItemId: plan.salesOrderItemId,
          batchId: allocation.batch.id,
          quantity: formatFixed(allocation.quantityMilli, 3),
          value: formatMinor(valueMinor),
        });
      }
    }
    return allocationAudit;
  }

  private async createStockMovement(
    tx: DbExecutor,
    actor: AuthUser,
    order: any,
    movementType: "sale_consumption" | "reversal",
    options?: { reversalOfId?: string; reason?: string },
  ) {
    const businessDate = order.businessDate;
    const [sequence] = await tx
      .insert(documentSequences)
      .values({
        tenantId: actor.tenantId,
        outletId: order.outletId,
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
        outletId: order.outletId,
        movementNo,
        movementType,
        businessDate,
        referenceType:
          movementType === "sale_consumption"
            ? "sales_order"
            : "sales_order_cancel",
        referenceId: order.id,
        reversalOfId: options?.reversalOfId,
        reason: options?.reason,
        createdBy: actor.userId,
        updatedBy: actor.userId,
      })
      .returning();
    return movement;
  }

  private async nextReceiptNo(
    tx: DbExecutor,
    actor: AuthUser,
    order: any,
  ) {
    const [sequence] = await tx
      .insert(documentSequences)
      .values({
        tenantId: actor.tenantId,
        outletId: order.outletId,
        documentType: "pos_receipt",
        businessDate: order.businessDate,
        lastNumber: 1,
        prefixPattern: "TRX-{YYMMDD}-{####}",
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
    return `TRX-${order.businessDate.replaceAll("-", "").slice(2)}-${String(sequence.lastNumber).padStart(4, "0")}`;
  }

  private async reverseConsumption(
    tx: DbExecutor,
    actor: AuthUser,
    order: any,
    reason: string,
  ) {
    const [original] = await tx
      .select()
      .from(stockMovements)
      .where(
        and(
          eq(stockMovements.tenantId, actor.tenantId),
          eq(stockMovements.outletId, order.outletId),
          eq(stockMovements.referenceType, "sales_order"),
          eq(stockMovements.referenceId, order.id),
          eq(stockMovements.movementType, "sale_consumption"),
          eq(stockMovements.status, "posted"),
        ),
      )
      .limit(1);
    if (!original)
      throw new ConflictException(
        "CONSUMPTION_NOT_FOUND: Ledger consumption tidak ditemukan.",
      );
    await tx.execute(
      sql`select id from stock_movements where id = ${original.id} and tenant_id = ${actor.tenantId} for update`,
    );
    const [existingReversal] = await tx
      .select({ id: stockMovements.id })
      .from(stockMovements)
      .where(
        and(
          eq(stockMovements.tenantId, actor.tenantId),
          eq(stockMovements.reversalOfId, original.id),
          eq(stockMovements.movementType, "reversal"),
        ),
      )
      .limit(1);
    if (existingReversal)
      throw new ConflictException(
        "ORDER_ALREADY_CANCELLED: Consumption sudah direversal.",
      );
    const originalLines = await tx
      .select()
      .from(stockMovementLines)
      .where(
        and(
          eq(stockMovementLines.tenantId, actor.tenantId),
          eq(stockMovementLines.stockMovementId, original.id),
        ),
      )
      .orderBy(
        asc(stockMovementLines.stockBatchId),
        asc(stockMovementLines.id),
      );
    const batchIds = originalLines
      .map((line: any) => line.stockBatchId)
      .filter((value: unknown): value is string => Boolean(value));
    if (batchIds.length) {
      await tx.execute(
        sql`select id from stock_batches where tenant_id = ${actor.tenantId} and outlet_id = ${order.outletId} and id in (${sql.join(
          [...new Set(batchIds)].sort().map((batchId) => sql`${batchId}`),
          sql`, `,
        )}) order by id for update`,
      );
    }
    const outlet = await this.outletContext(actor.tenantId, order.outletId, tx);
    if (!outlet) throw new ConflictException("OUTLET_NOT_ACTIVE");
    const reversalBusinessDate = await this.businessDate(outlet, tx);
    const reversal = await this.createStockMovement(
      tx,
      actor,
      { ...order, businessDate: reversalBusinessDate },
      "reversal",
      { reversalOfId: original.id, reason },
    );
    let restoredQuantityMilli = 0n;
    let restoredValueMinor = 0n;
    for (const line of originalLines) {
      if (!line.stockBatchId)
        throw new ConflictException(
          "REVERSAL_INVALID: Original consumption tidak memiliki batch.",
        );
      const restoreMilli = -this.parseSignedFixed(line.quantityDelta, 3);
      const restoreValueMinor = -this.parseSignedFixed(line.valueDelta, 2);
      if (restoreMilli <= 0n || restoreValueMinor < 0n)
        throw new ConflictException(
          "REVERSAL_INVALID: Nilai original consumption tidak valid.",
        );
      restoredQuantityMilli += restoreMilli;
      restoredValueMinor += restoreValueMinor;
      await tx
        .update(stockBatches)
        .set({
          quantityOnHand: sql`${stockBatches.quantityOnHand} + ${formatFixed(restoreMilli, 3)}`,
          updatedAt: new Date(),
          updatedBy: actor.userId,
        })
        .where(
          and(
            eq(stockBatches.id, line.stockBatchId),
            eq(stockBatches.tenantId, actor.tenantId),
            eq(stockBatches.outletId, order.outletId),
          ),
        );
      const [locationBalance] = await tx
        .select({
          value: sql<number>`coalesce(sum(${stockBatches.quantityOnHand}), 0)`,
        })
        .from(stockBatches)
        .where(
          and(
            eq(stockBatches.tenantId, actor.tenantId),
            eq(stockBatches.outletId, order.outletId),
            eq(stockBatches.ingredientId, line.ingredientId),
            eq(stockBatches.storageLocationId, line.storageLocationId),
          ),
        );
      const [reversalLine] = await tx
        .insert(stockMovementLines)
        .values({
          tenantId: actor.tenantId,
          stockMovementId: reversal.id,
          ingredientId: line.ingredientId,
          storageLocationId: line.storageLocationId,
          stockBatchId: line.stockBatchId,
          quantityDelta: formatFixed(restoreMilli, 3) as any,
          unitCost: line.unitCost,
          valueDelta: formatMinor(restoreValueMinor) as any,
          balanceAfter: Number(locationBalance.value),
          createdBy: actor.userId,
          updatedBy: actor.userId,
        })
        .returning({ id: stockMovementLines.id });
      await tx
        .update(salesItemConsumptions)
        .set({
          status: "reversed",
          reversalStockMovementLineId: reversalLine.id,
          updatedAt: new Date(),
          updatedBy: actor.userId,
        })
        .where(
          and(
            eq(salesItemConsumptions.tenantId, actor.tenantId),
            eq(salesItemConsumptions.salesOrderId, order.id),
            eq(salesItemConsumptions.stockMovementLineId, line.id),
            eq(salesItemConsumptions.status, "posted"),
          ),
        );
    }
    return {
      originalMovementId: original.id,
      reversalMovementId: reversal.id,
      restoredQuantity: formatFixed(restoredQuantityMilli, 3),
      restoredValue: formatMinor(restoredValueMinor),
    };
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
      throw new ConflictException(
        "IDEMPOTENCY_IN_PROGRESS: Request sedang diproses.",
      );
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
    if (!claimed)
      throw new ConflictException(
        "IDEMPOTENCY_IN_PROGRESS: Request sedang diproses.",
      );
    return { id: claimed.id, replay: false };
  }

  private async completeOperation(
    tx: DbExecutor,
    operationId: string,
    orderId: string,
    paymentId?: string,
  ) {
    await tx
      .update(posOperationRequests)
      .set({
        status: "completed",
        salesOrderId: orderId,
        paymentId,
        responseStatus: 200,
        responseBody: { orderId, ...(paymentId ? { paymentId } : {}) },
        completedAt: new Date(),
      })
      .where(eq(posOperationRequests.id, operationId));
  }

  private parseSignedFixed(value: string | number, scale: number) {
    const normalized = String(value);
    return normalized.startsWith("-")
      ? -parseFixed(normalized.slice(1), scale)
      : parseFixed(normalized, scale);
  }

  private async normalizeItems(
    tenantId: string,
    outletId: string,
    expectedCurrency: string,
    input: PosOrderItemDto[],
    actorUserId: string,
    tx: DbExecutor,
  ) {
    if (!input.length)
      throw new BadRequestException("Order minimal memiliki satu item.");
    const ids = input.map((item) => item.menuVariantId);
    if (new Set(ids).size !== ids.length)
      throw new BadRequestException(
        "Variant yang sama tidak boleh diduplikasi.",
      );
    const rows = await this.lookupRows(tenantId, outletId, tx, ids);
    if (rows.length !== ids.length)
      throw new BadRequestException(
        "Terdapat variant yang tidak aktif, tidak tersedia, atau bukan milik tenant.",
      );
    const map = new Map(rows.map((row: any) => [row.variantId, row]));
    const now = new Date();
    return input.map((item, index) => {
      const row: any = map.get(item.menuVariantId);
      const recipe = this.recipeReadiness(row, outletId, now);
      if (!recipe.ready)
        throw new ConflictException(`RECIPE_NOT_READY: ${row.variantName}.`);
      const price = row.priceOverride ?? row.basePrice;
      if (price === null || price === undefined)
        throw new ConflictException(
          `PRICE_NOT_CONFIGURED: ${row.variantName}.`,
        );
      if (row.currencyCode !== expectedCurrency)
        throw new ConflictException(`CURRENCY_MISMATCH: ${row.variantName}.`);
      const lineSubtotalMinor = multiplyMoney(price, item.quantity);
      return {
        lineNo: index + 1,
        menuId: row.menuId,
        menuCodeSnapshot: row.menuCode,
        menuNameSnapshot: row.menuName,
        menuVariantId: row.variantId,
        variantCodeSnapshot: row.variantCode,
        variantNameSnapshot: row.variantName,
        menuCategoryId: row.categoryId,
        categoryCodeSnapshot: row.categoryCode,
        categoryNameSnapshot: row.categoryName,
        effectivePriceSource:
          row.priceOverride !== null ? "outlet_override" : "base",
        priceSourceVersionAt:
          row.settingUpdatedAt && row.settingUpdatedAt > row.variantUpdatedAt
            ? row.settingUpdatedAt
            : row.variantUpdatedAt,
        unitPrice: formatMinor(parseDecimalToMinor(price)) as unknown as number,
        quantity: item.quantity,
        lineSubtotal: formatMinor(lineSubtotalMinor) as unknown as number,
        lineSubtotalMinor,
        currencyCode: row.currencyCode,
        notes: this.clean(item.notes),
        requiresRecipe: row.requiresRecipe,
        requiresKitchen: row.requiresKitchen,
        recipeHeaderId: recipe.ready ? row.recipeHeaderId : null,
        recipeVersionId: recipe.ready ? row.recipeVersionId : null,
        recipeVersionNo: recipe.ready ? row.recipeVersionNo : null,
        status: "draft" as const,
        lockVersion: 1,
        createdBy: actorUserId,
        updatedBy: actorUserId,
      };
    });
  }

  private async lookupRows(
    tenantId: string,
    outletId: string,
    tx: DbExecutor,
    variantIds?: string[],
  ) {
    const conditions: SQL[] = [
      eq(menuVariantOutletSettings.tenantId, tenantId),
      eq(menuVariantOutletSettings.outletId, outletId),
      eq(menuVariantOutletSettings.isActive, true),
      eq(menuVariantOutletSettings.isAvailable, true),
      eq(menuVariants.tenantId, tenantId),
      eq(menuVariants.isActive, true),
      isNull(menuVariants.deletedAt),
      eq(menus.tenantId, tenantId),
      eq(menus.isActive, true),
      isNull(menus.deletedAt),
      eq(menuCategories.tenantId, tenantId),
      eq(menuCategories.isActive, true),
      isNull(menuCategories.deletedAt),
    ];
    if (variantIds?.length)
      conditions.push(inArray(menuVariants.id, variantIds));
    return tx
      .select({
        categoryId: menuCategories.id,
        categoryCode: menuCategories.code,
        categoryName: menuCategories.name,
        categoryDisplayOrder: menuCategories.displayOrder,
        menuId: menus.id,
        menuCode: menus.sku,
        menuName: menus.name,
        menuDescription: menus.description,
        variantId: menuVariants.id,
        variantCode: menuVariants.code,
        variantName: menuVariants.name,
        displayOrder: menuVariants.displayOrder,
        requiresRecipe: menuVariants.requiresRecipe,
        requiresKitchen: menuVariants.requiresKitchen,
        basePrice: menuVariants.sellingPrice,
        currencyCode: menuVariants.currencyCode,
        variantUpdatedAt: menuVariants.updatedAt,
        priceOverride: menuVariantOutletSettings.priceOverride,
        settingUpdatedAt: menuVariantOutletSettings.updatedAt,
        recipeHeaderId: recipeHeaders.id,
        recipeVersionId: recipes.id,
        recipeVersionNo: recipes.versionNo,
        recipeStatus: recipes.status,
        recipeEffectiveFrom: recipes.effectiveFrom,
        recipeEffectiveUntil: recipes.effectiveUntil,
        recipeApprovedOutletId: recipes.approvedOutletId,
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
          eq(recipeHeaders.tenantId, tenantId),
          eq(recipeHeaders.menuVariantId, menuVariants.id),
          eq(recipeHeaders.isArchived, false),
        ),
      )
      .leftJoin(
        recipes,
        and(
          eq(recipes.tenantId, tenantId),
          eq(recipes.id, recipeHeaders.currentApprovedVersionId),
        ),
      )
      .where(and(...conditions))
      .orderBy(
        asc(menuCategories.displayOrder),
        asc(menus.name),
        asc(menuVariants.displayOrder),
      );
  }

  private recipeReadiness(row: any, outletId: string, now: Date) {
    if (!row.requiresRecipe) return { ready: true, reason: null };
    const valid =
      row.recipeHeaderId &&
      row.recipeVersionId &&
      row.recipeStatus === "approved" &&
      row.recipeEffectiveFrom <= now &&
      (!row.recipeEffectiveUntil || row.recipeEffectiveUntil > now) &&
      (!row.recipeApprovedOutletId || row.recipeApprovedOutletId === outletId);
    return { ready: Boolean(valid), reason: valid ? null : "RECIPE_NOT_READY" };
  }

  private async getBase(tenantId: string, id: string, tx: DbExecutor) {
    const [header] = await tx
      .select({
        id: salesOrders.id,
        tenantId: salesOrders.tenantId,
        outletId: salesOrders.outletId,
        outletCode: outlets.code,
        outletName: outlets.name,
        orderNo: salesOrders.orderNo,
        receiptNo: salesOrders.receiptNo,
        businessDate: salesOrders.businessDate,
        orderType: salesOrders.orderType,
        tableNumber: salesOrders.tableNumber,
        customerName: salesOrders.customerName,
        notes: salesOrders.notes,
        currencyCode: salesOrders.currencyCode,
        status: salesOrders.status,
        paymentStatus: salesOrders.paymentStatus,
        subtotal: salesOrders.subtotal,
        totalAmount: salesOrders.totalAmount,
        cashierId: salesOrders.cashierId,
        cashierName: users.fullName,
        lockVersion: salesOrders.lockVersion,
        createdAt: salesOrders.createdAt,
        createdBy: salesOrders.createdBy,
        updatedAt: salesOrders.updatedAt,
        updatedBy: salesOrders.updatedBy,
      })
      .from(salesOrders)
      .innerJoin(outlets, eq(outlets.id, salesOrders.outletId))
      .leftJoin(users, eq(users.id, salesOrders.cashierId))
      .where(and(eq(salesOrders.id, id), eq(salesOrders.tenantId, tenantId)))
      .limit(1);
    if (!header) return null;
    const items = await tx
      .select()
      .from(salesOrderItems)
      .where(
        and(
          eq(salesOrderItems.tenantId, tenantId),
          eq(salesOrderItems.salesOrderId, id),
        ),
      )
      .orderBy(asc(salesOrderItems.lineNo));
    return { ...header, items };
  }

  private async insertItems(
    tx: DbExecutor,
    actor: AuthUser,
    orderId: string,
    items: any[],
  ) {
    await tx.insert(salesOrderItems).values(
      items.map(({ lineSubtotalMinor: _minor, ...item }) => ({
        ...item,
        tenantId: actor.tenantId,
        salesOrderId: orderId,
      })),
    );
  }

  private async assertOutletAccess(actor: AuthUser, outletId: string) {
    if (actor.outletIds.length && !actor.outletIds.includes(outletId))
      throw new ForbiddenException("User tidak memiliki akses ke outlet ini.");
    const outlet = await this.outletContext(
      actor.tenantId,
      outletId,
      this.database.db,
    );
    if (!outlet) throw new NotFoundException("Outlet aktif tidak ditemukan.");
    return outlet;
  }

  private async outletContext(
    tenantId: string,
    outletId: string,
    tx: DbExecutor,
  ): Promise<OutletContext | null> {
    const [row] = await tx
      .select({
        id: outlets.id,
        code: outlets.code,
        name: outlets.name,
        timezone: outlets.timezone,
        businessDayCutoff: outlets.businessDayCutoff,
        currencyCode: tenants.currencyCode,
      })
      .from(outlets)
      .innerJoin(tenants, eq(tenants.id, outlets.tenantId))
      .where(
        and(
          eq(outlets.id, outletId),
          eq(outlets.tenantId, tenantId),
          eq(outlets.isActive, true),
          isNull(outlets.deletedAt),
          eq(tenants.status, "active"),
          isNull(tenants.deletedAt),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  private async businessDate(outlet: OutletContext, tx: DbExecutor) {
    const [row] = await tx.execute(
      sql`select (((now() at time zone ${outlet.timezone}) - ${outlet.businessDayCutoff}::time)::date)::text as business_date`,
    );
    return row.business_date as string;
  }

  private groupCategories(variants: any[]) {
    const categories = new Map<string, any>();
    for (const variant of variants) {
      if (!categories.has(variant.categoryId))
        categories.set(variant.categoryId, {
          id: variant.categoryId,
          code: variant.categoryCode,
          name: variant.categoryName,
          displayOrder: variant.categoryDisplayOrder,
        });
    }
    return [...categories.values()];
  }

  private serializeDetail(detail: any) {
    return {
      ...this.serializeMoney(detail),
      items: detail.items.map((item: any) => this.serializeMoney(item)),
    };
  }

  private serializeMoney<T extends Record<string, any>>(value: T): T {
    const result: Record<string, any> = { ...value };
    for (const key of [
      "subtotal",
      "totalAmount",
      "unitPrice",
      "lineSubtotal",
      "amountApplied",
      "amountTendered",
      "changeAmount",
    ]) {
      if (key in result && result[key] !== null)
        result[key] = this.moneyString(result[key]);
    }
    return result as T;
  }

  private moneyString(value: string | number) {
    return formatMinor(parseDecimalToMinor(value));
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

  private clean(value?: string | null) {
    const cleaned = value?.trim();
    return cleaned || null;
  }

  private validateDateRange(from?: string, to?: string) {
    if (from && to && to < from)
      throw new BadRequestException(
        "Tanggal akhir tidak boleh sebelum tanggal awal.",
      );
  }

  private validateIdentity(orderType: OrderType, tableNumber?: string | null) {
    try {
      assertOrderIdentity(orderType, tableNumber);
    } catch (error) {
      throw new BadRequestException((error as Error).message);
    }
  }

  private auditSnapshot(order: any, items: any[]) {
    return {
      orderNo: order.orderNo,
      orderType: order.orderType,
      tableNumber: order.tableNumber,
      customerName: order.customerName,
      status: order.status,
      paymentStatus: order.paymentStatus,
      subtotal: this.moneyString(order.subtotal),
      totalAmount: this.moneyString(order.totalAmount),
      itemCount: items.length,
      items: items.map((item) => ({
        menuVariantId: item.menuVariantId,
        variantName: item.variantNameSnapshot,
        quantity: item.quantity,
        lineSubtotal: this.moneyString(item.lineSubtotal),
      })),
      lockVersion: order.lockVersion,
    };
  }
}
