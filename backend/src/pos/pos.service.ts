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
  menuCategories,
  menus,
  menuVariantOutletSettings,
  menuVariants,
  outlets,
  payments,
  posOperationRequests,
  recipeHeaders,
  recipes,
  salesItemConsumptions,
  salesOrderItemStatusHistory,
  salesOrderItems,
  salesOrders,
  tenants,
  users,
} from "../database/schema";
import { ListPosOrdersQueryDto } from "./dto/list-pos-orders-query.dto";
import {
  CreatePosOrderDto,
  PosOrderItemDto,
  UpdatePosOrderDto,
} from "./dto/pos.dto";
import {
  assertOrderIdentity,
  formatMinor,
  multiplyMoney,
  parseDecimalToMinor,
  type OrderType,
} from "./pos-domain";

type DbExecutor = any;

interface OutletContext {
  id: string;
  code: string;
  name: string;
  timezone: string;
  businessDayCutoff: string;
  currencyCode: string;
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
          .select()
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
    await tx
      .insert(salesOrderItems)
      .values(
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
