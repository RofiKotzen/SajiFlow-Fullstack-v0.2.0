import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { SQL, and, asc, eq, ilike, isNull, or } from "drizzle-orm";
import { AuditService } from "../audit/audit.service";
import { AuthUser } from "../common/types/auth-user";
import { DatabaseService } from "../database/database.service";
import {
  ingredients,
  purchaseOrderItems,
  supplierIngredients,
  units,
} from "../database/schema";
import { CreateUnitDto } from "./dto/create-unit.dto";
import { ListUnitsQueryDto } from "./dto/list-units-query.dto";
import { UpdateUnitDto } from "./dto/update-unit.dto";

@Injectable()
export class UnitsService {
  constructor(
    private readonly database: DatabaseService,
    private readonly audit: AuditService,
  ) {}
  async list(actor: AuthUser, query: ListUnitsQueryDto) {
    const conditions: SQL[] = [
      eq(units.tenantId, actor.tenantId),
      isNull(units.deletedAt),
    ];
    if (query.dimension) conditions.push(eq(units.dimension, query.dimension));
    if (query.isActive !== undefined)
      conditions.push(eq(units.isActive, query.isActive));
    if (query.search) {
      const term = `%${query.search.trim()}%`;
      conditions.push(or(ilike(units.code, term), ilike(units.name, term))!);
    }
    return this.database.db
      .select()
      .from(units)
      .where(and(...conditions))
      .orderBy(asc(units.name));
  }
  async get(actor: AuthUser, id: string) {
    const [unit] = await this.database.db
      .select()
      .from(units)
      .where(
        and(
          eq(units.id, id),
          eq(units.tenantId, actor.tenantId),
          isNull(units.deletedAt),
        ),
      )
      .limit(1);
    if (!unit) throw new NotFoundException("Satuan tidak ditemukan.");
    return unit;
  }
  async create(actor: AuthUser, dto: CreateUnitDto) {
    const code = dto.code.trim().toUpperCase();
    await this.assertUniqueCode(actor.tenantId, code);
    const [created] = await this.database.db
      .insert(units)
      .values({
        ...dto,
        code,
        name: dto.name.trim(),
        tenantId: actor.tenantId,
        createdBy: actor.userId,
        updatedBy: actor.userId,
      })
      .returning();
    await this.audit.record({
      tenantId: actor.tenantId,
      actorUserId: actor.userId,
      action: "unit.create",
      entityType: "unit",
      entityId: created.id,
      afterData: created,
    });
    return created;
  }
  async update(actor: AuthUser, id: string, dto: UpdateUnitDto) {
    const before = await this.get(actor, id);
    const code = dto.code?.trim().toUpperCase();
    if (code && code !== before.code)
      await this.assertUniqueCode(actor.tenantId, code, id);
    const used = await this.isUsed(actor.tenantId, id);
    if (
      used &&
      dto.dimension !== undefined &&
      dto.dimension !== before.dimension
    )
      throw new BadRequestException(
        "Dimensi satuan yang sudah digunakan tidak dapat diubah.",
      );
    if (
      used &&
      dto.decimalScale !== undefined &&
      dto.decimalScale !== before.decimalScale
    )
      throw new BadRequestException(
        "Presisi satuan yang sudah digunakan tidak dapat diubah.",
      );
    if (used && dto.isBase !== undefined && dto.isBase !== before.isBase)
      throw new BadRequestException(
        "Status base satuan yang sudah digunakan tidak dapat diubah.",
      );
    const [updated] = await this.database.db
      .update(units)
      .set({
        ...dto,
        ...(code ? { code } : {}),
        ...(dto.name ? { name: dto.name.trim() } : {}),
        updatedBy: actor.userId,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(units.id, id),
          eq(units.tenantId, actor.tenantId),
          isNull(units.deletedAt),
        ),
      )
      .returning();
    await this.audit.record({
      tenantId: actor.tenantId,
      actorUserId: actor.userId,
      action:
        dto.isActive === false
          ? "unit.archive"
          : dto.isActive === true && !before.isActive
            ? "unit.activate"
            : "unit.update",
      entityType: "unit",
      entityId: id,
      beforeData: before,
      afterData: updated,
    });
    return updated;
  }
  private async assertUniqueCode(
    tenantId: string,
    code: string,
    excludeId?: string,
  ) {
    const rows = await this.database.db
      .select({ id: units.id })
      .from(units)
      .where(
        and(
          eq(units.tenantId, tenantId),
          eq(units.code, code),
          isNull(units.deletedAt),
        ),
      )
      .limit(1);
    if (rows[0] && rows[0].id !== excludeId)
      throw new ConflictException("Kode satuan sudah digunakan.");
  }
  private async isUsed(tenantId: string, id: string) {
    const checks = await Promise.all([
      this.database.db
        .select({ id: ingredients.id })
        .from(ingredients)
        .where(
          and(
            eq(ingredients.tenantId, tenantId),
            eq(ingredients.baseUnitId, id),
          ),
        )
        .limit(1),
      this.database.db
        .select({ id: supplierIngredients.id })
        .from(supplierIngredients)
        .where(
          and(
            eq(supplierIngredients.tenantId, tenantId),
            eq(supplierIngredients.purchaseUnitId, id),
          ),
        )
        .limit(1),
      this.database.db
        .select({ id: purchaseOrderItems.id })
        .from(purchaseOrderItems)
        .where(
          and(
            eq(purchaseOrderItems.tenantId, tenantId),
            eq(purchaseOrderItems.purchaseUnitId, id),
          ),
        )
        .limit(1),
    ]);
    return checks.some((rows) => rows.length > 0);
  }
}
