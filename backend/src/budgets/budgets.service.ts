import { randomUUID } from "node:crypto";
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
  inArray,
  isNull,
  lte,
  ne,
  sql,
} from "drizzle-orm";
import { AuditService } from "../audit/audit.service";
import { AuthUser } from "../common/types/auth-user";
import { DatabaseService } from "../database/database.service";
import {
  budgetLines,
  budgetStatusHistory,
  budgets,
  outlets,
  users,
} from "../database/schema";
import { BudgetLineDto } from "./dto/budget-line.dto";
import { CreateBudgetDto } from "./dto/create-budget.dto";
import { ListBudgetsQueryDto } from "./dto/list-budgets-query.dto";
import { UpdateBudgetDto } from "./dto/update-budget.dto";

type BudgetStatus = "draft" | "submitted" | "approved" | "rejected" | "closed";

@Injectable()
export class BudgetsService {
  constructor(
    private readonly database: DatabaseService,
    private readonly audit: AuditService,
  ) {}

  async list(actor: AuthUser, query: ListBudgetsQueryDto) {
    this.validateQueryPeriod(query);
    const conditions: SQL[] = [eq(budgets.tenantId, actor.tenantId)];

    if (query.outletId) {
      await this.assertOutletAccess(actor, query.outletId);
      conditions.push(eq(budgets.outletId, query.outletId));
    } else if (actor.outletIds.length) {
      conditions.push(inArray(budgets.outletId, actor.outletIds));
    }
    if (query.status) conditions.push(eq(budgets.status, query.status));
    if (query.periodStart)
      conditions.push(gte(budgets.periodEnd, query.periodStart));
    if (query.periodEnd)
      conditions.push(lte(budgets.periodStart, query.periodEnd));

    return this.database.db
      .select({
        id: budgets.id,
        outletId: budgets.outletId,
        outletName: outlets.name,
        budgetCode: budgets.budgetCode,
        name: budgets.name,
        periodStart: budgets.periodStart,
        periodEnd: budgets.periodEnd,
        status: budgets.status,
        totalAmount: budgets.totalAmount,
        submittedAt: budgets.submittedAt,
        approvedAt: budgets.approvedAt,
        approvedBy: budgets.approvedBy,
        notes: budgets.notes,
        createdAt: budgets.createdAt,
        createdBy: budgets.createdBy,
        updatedAt: budgets.updatedAt,
      })
      .from(budgets)
      .innerJoin(outlets, eq(outlets.id, budgets.outletId))
      .where(and(...conditions))
      .orderBy(desc(budgets.periodStart), asc(budgets.name));
  }

  async get(actor: AuthUser, id: string) {
    const budget = await this.getHeader(actor, id);
    const lines = await this.database.db
      .select()
      .from(budgetLines)
      .where(
        and(
          eq(budgetLines.tenantId, actor.tenantId),
          eq(budgetLines.budgetId, id),
        ),
      )
      .orderBy(asc(budgetLines.category), asc(budgetLines.description));
    const history = await this.database.db
      .select({
        id: budgetStatusHistory.id,
        fromStatus: budgetStatusHistory.fromStatus,
        toStatus: budgetStatusHistory.toStatus,
        changedBy: budgetStatusHistory.changedBy,
        changedByName: users.fullName,
        reason: budgetStatusHistory.reason,
        changedAt: budgetStatusHistory.changedAt,
      })
      .from(budgetStatusHistory)
      .leftJoin(users, eq(users.id, budgetStatusHistory.changedBy))
      .where(
        and(
          eq(budgetStatusHistory.tenantId, actor.tenantId),
          eq(budgetStatusHistory.budgetId, id),
        ),
      )
      .orderBy(desc(budgetStatusHistory.changedAt));

    return { ...budget, lines, history };
  }

  async create(actor: AuthUser, dto: CreateBudgetDto) {
    await this.assertOutletAccess(actor, dto.outletId);
    this.assertValidPeriod(dto.periodStart, dto.periodEnd);
    const budgetCode = (dto.budgetCode ?? this.generateCode(dto.periodStart))
      .trim()
      .toUpperCase();
    await this.assertCodeAvailable(actor.tenantId, budgetCode);
    const lines = this.normalizeLines(dto.lines);
    const totalAmount = this.total(lines);

    const created = await this.database.db.transaction(async (tx) => {
      const [budget] = await tx
        .insert(budgets)
        .values({
          tenantId: actor.tenantId,
          outletId: dto.outletId,
          budgetCode,
          name: dto.name.trim(),
          periodStart: dto.periodStart,
          periodEnd: dto.periodEnd,
          totalAmount,
          notes: dto.notes?.trim(),
          createdBy: actor.userId,
          updatedBy: actor.userId,
        })
        .returning();
      await tx.insert(budgetLines).values(
        lines.map((line) => ({
          ...line,
          tenantId: actor.tenantId,
          budgetId: budget.id,
          createdBy: actor.userId,
          updatedBy: actor.userId,
        })),
      );
      await tx.insert(budgetStatusHistory).values({
        tenantId: actor.tenantId,
        budgetId: budget.id,
        toStatus: "draft",
        changedBy: actor.userId,
        reason: "Rencana anggaran dibuat",
      });
      return budget;
    });

    const result = await this.get(actor, created.id);
    await this.audit.record({
      tenantId: actor.tenantId,
      outletId: created.outletId,
      actorUserId: actor.userId,
      action: "budget.create",
      entityType: "budget",
      entityId: created.id,
      afterData: result,
    });
    return result;
  }

  async update(actor: AuthUser, id: string, dto: UpdateBudgetDto) {
    const before = await this.get(actor, id);
    if (!["draft", "rejected"].includes(before.status)) {
      throw new ConflictException(
        "Hanya anggaran draft atau rejected yang dapat diubah",
      );
    }

    const outletId = dto.outletId ?? before.outletId;
    const periodStart = dto.periodStart ?? before.periodStart;
    const periodEnd = dto.periodEnd ?? before.periodEnd;
    const budgetCode = (dto.budgetCode ?? before.budgetCode)
      .trim()
      .toUpperCase();
    await this.assertOutletAccess(actor, outletId);
    this.assertValidPeriod(periodStart, periodEnd);
    if (budgetCode !== before.budgetCode) {
      await this.assertCodeAvailable(actor.tenantId, budgetCode, id);
    }

    const normalizedLines = dto.lines ? this.normalizeLines(dto.lines) : null;
    const totalAmount = normalizedLines
      ? this.total(normalizedLines)
      : before.totalAmount;
    const returnsToDraft = before.status === "rejected";

    await this.database.db.transaction(async (tx) => {
      await tx
        .update(budgets)
        .set({
          outletId,
          budgetCode,
          name: dto.name?.trim() ?? before.name,
          periodStart,
          periodEnd,
          notes: dto.notes?.trim() ?? before.notes,
          totalAmount,
          status: returnsToDraft ? "draft" : before.status,
          submittedAt: returnsToDraft ? null : before.submittedAt,
          approvedAt: null,
          approvedBy: null,
          updatedAt: new Date(),
          updatedBy: actor.userId,
        })
        .where(and(eq(budgets.id, id), eq(budgets.tenantId, actor.tenantId)));

      if (normalizedLines) {
        await tx
          .delete(budgetLines)
          .where(
            and(
              eq(budgetLines.budgetId, id),
              eq(budgetLines.tenantId, actor.tenantId),
            ),
          );
        await tx.insert(budgetLines).values(
          normalizedLines.map((line) => ({
            ...line,
            tenantId: actor.tenantId,
            budgetId: id,
            createdBy: actor.userId,
            updatedBy: actor.userId,
          })),
        );
      }

      if (returnsToDraft) {
        await tx.insert(budgetStatusHistory).values({
          tenantId: actor.tenantId,
          budgetId: id,
          fromStatus: "rejected",
          toStatus: "draft",
          changedBy: actor.userId,
          reason: "Anggaran diperbaiki setelah ditolak",
        });
      }
    });

    const after = await this.get(actor, id);
    await this.audit.record({
      tenantId: actor.tenantId,
      outletId,
      actorUserId: actor.userId,
      action: "budget.update",
      entityType: "budget",
      entityId: id,
      beforeData: before,
      afterData: after,
    });
    return after;
  }

  async submit(actor: AuthUser, id: string, reason?: string) {
    const budget = await this.get(actor, id);
    if (!["draft", "rejected"].includes(budget.status)) {
      throw new ConflictException(
        "Hanya anggaran draft atau rejected yang dapat diajukan",
      );
    }
    if (!budget.lines.length || budget.totalAmount <= 0) {
      throw new BadRequestException(
        "Anggaran harus memiliki alokasi dengan total lebih dari nol",
      );
    }
    return this.transition(actor, budget, "submitted", reason, {
      submittedAt: new Date(),
      approvedAt: null,
      approvedBy: null,
    });
  }

  async approve(actor: AuthUser, id: string, reason?: string) {
    const budget = await this.get(actor, id);
    if (budget.status !== "submitted") {
      throw new ConflictException(
        "Hanya anggaran submitted yang dapat disetujui",
      );
    }

    const [overlap] = await this.database.db
      .select({ id: budgets.id, budgetCode: budgets.budgetCode })
      .from(budgets)
      .where(
        and(
          eq(budgets.tenantId, actor.tenantId),
          eq(budgets.outletId, budget.outletId),
          eq(budgets.status, "approved"),
          ne(budgets.id, id),
          lte(budgets.periodStart, budget.periodEnd),
          gte(budgets.periodEnd, budget.periodStart),
          sql`lower(${budgets.name}) = lower(${budget.name})`,
        ),
      )
      .limit(1);
    if (overlap) {
      throw new ConflictException(
        `Periode anggaran beririsan dengan baseline approved ${overlap.budgetCode}`,
      );
    }

    return this.transition(actor, budget, "approved", reason, {
      approvedAt: new Date(),
      approvedBy: actor.userId,
    });
  }

  async reject(actor: AuthUser, id: string, reason: string) {
    const budget = await this.get(actor, id);
    if (budget.status !== "submitted") {
      throw new ConflictException(
        "Hanya anggaran submitted yang dapat ditolak",
      );
    }
    return this.transition(actor, budget, "rejected", reason, {
      approvedAt: null,
      approvedBy: null,
    });
  }

  async close(actor: AuthUser, id: string, reason?: string) {
    const budget = await this.get(actor, id);
    if (budget.status !== "approved") {
      throw new ConflictException("Hanya anggaran approved yang dapat ditutup");
    }
    return this.transition(actor, budget, "closed", reason, {});
  }

  private async transition(
    actor: AuthUser,
    before: Awaited<ReturnType<BudgetsService["get"]>>,
    toStatus: BudgetStatus,
    reason: string | undefined,
    extra: Partial<typeof budgets.$inferInsert>,
  ) {
    const changedAt = new Date();
    await this.database.db.transaction(async (tx) => {
      const [updated] = await tx
        .update(budgets)
        .set({
          ...extra,
          status: toStatus,
          updatedAt: changedAt,
          updatedBy: actor.userId,
        })
        .where(
          and(
            eq(budgets.id, before.id),
            eq(budgets.tenantId, actor.tenantId),
            eq(budgets.status, before.status),
          ),
        )
        .returning({ id: budgets.id });
      if (!updated)
        throw new ConflictException(
          "Status anggaran telah berubah. Muat ulang data.",
        );
      await tx.insert(budgetStatusHistory).values({
        tenantId: actor.tenantId,
        budgetId: before.id,
        fromStatus: before.status,
        toStatus,
        changedBy: actor.userId,
        reason: reason?.trim(),
        changedAt,
      });
    });

    const after = await this.get(actor, before.id);
    await this.audit.record({
      tenantId: actor.tenantId,
      outletId: before.outletId,
      actorUserId: actor.userId,
      action: `budget.${toStatus}`,
      entityType: "budget",
      entityId: before.id,
      beforeData: before,
      afterData: after,
      reason: reason?.trim(),
    });
    return after;
  }

  private async getHeader(actor: AuthUser, id: string) {
    const [budget] = await this.database.db
      .select({
        id: budgets.id,
        tenantId: budgets.tenantId,
        outletId: budgets.outletId,
        outletName: outlets.name,
        budgetCode: budgets.budgetCode,
        name: budgets.name,
        periodStart: budgets.periodStart,
        periodEnd: budgets.periodEnd,
        status: budgets.status,
        totalAmount: budgets.totalAmount,
        submittedAt: budgets.submittedAt,
        approvedAt: budgets.approvedAt,
        approvedBy: budgets.approvedBy,
        notes: budgets.notes,
        createdAt: budgets.createdAt,
        createdBy: budgets.createdBy,
        updatedAt: budgets.updatedAt,
        updatedBy: budgets.updatedBy,
      })
      .from(budgets)
      .innerJoin(outlets, eq(outlets.id, budgets.outletId))
      .where(and(eq(budgets.id, id), eq(budgets.tenantId, actor.tenantId)))
      .limit(1);
    if (!budget) throw new NotFoundException("Anggaran tidak ditemukan");
    await this.assertOutletAccess(actor, budget.outletId);
    return budget;
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

  private async assertCodeAvailable(
    tenantId: string,
    budgetCode: string,
    excludeId?: string,
  ) {
    const conditions: SQL[] = [
      eq(budgets.tenantId, tenantId),
      eq(budgets.budgetCode, budgetCode),
    ];
    if (excludeId) conditions.push(ne(budgets.id, excludeId));
    const [exists] = await this.database.db
      .select({ id: budgets.id })
      .from(budgets)
      .where(and(...conditions))
      .limit(1);
    if (exists) throw new ConflictException("Kode anggaran sudah digunakan");
  }

  private assertValidPeriod(periodStart: string, periodEnd: string) {
    if (periodEnd < periodStart) {
      throw new BadRequestException(
        "Tanggal akhir periode tidak boleh sebelum tanggal awal",
      );
    }
  }

  private validateQueryPeriod(query: ListBudgetsQueryDto) {
    if (query.periodStart && query.periodEnd)
      this.assertValidPeriod(query.periodStart, query.periodEnd);
  }

  private normalizeLines(lines: BudgetLineDto[]) {
    return lines.map((line) => {
      const plannedAmount = this.money(line.plannedAmount);
      return {
        category: line.category,
        description: line.description.trim(),
        plannedAmount,
        actualAmount: 0,
        varianceAmount: plannedAmount,
        warningThresholdPct: this.money(line.warningThresholdPct ?? 80),
      };
    });
  }

  private total(lines: ReturnType<BudgetsService["normalizeLines"]>) {
    return this.money(lines.reduce((sum, line) => sum + line.plannedAmount, 0));
  }

  private money(value: number) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  private generateCode(periodStart: string) {
    return `BUD-${periodStart.slice(0, 7).replace("-", "")}-${randomUUID().slice(0, 8).toUpperCase()}`;
  }
}
