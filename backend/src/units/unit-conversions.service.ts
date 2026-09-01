import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { and, asc, eq, isNull, or, sql } from "drizzle-orm";
import { AuditService } from "../audit/audit.service";
import { AuthUser } from "../common/types/auth-user";
import { DatabaseService } from "../database/database.service";
import { unitConversions, units } from "../database/schema";
import { decimal, formatDecimal } from "../recipes/recipe-decimal";
import { inverseFactor } from "./unit-conversion-decimal";
import { CreateUnitConversionDto, UpdateUnitConversionDto } from "./dto/unit-conversion.dto";

@Injectable()
export class UnitConversionsService {
  constructor(private readonly database: DatabaseService, private readonly audit: AuditService) {}

  list(actor: AuthUser) {
    return this.database.db.select().from(unitConversions).where(eq(unitConversions.tenantId, actor.tenantId)).orderBy(asc(unitConversions.createdAt));
  }

  async create(actor: AuthUser, dto: CreateUnitConversionDto) {
    const canonical = await this.canonical(actor.tenantId, dto.fromUnitId, dto.toUnitId, dto.factor);
    const [duplicate] = await this.database.db.select({ id: unitConversions.id }).from(unitConversions).where(and(
      eq(unitConversions.tenantId, actor.tenantId), eq(unitConversions.fromUnitId, canonical.fromUnitId), eq(unitConversions.toUnitId, canonical.toUnitId),
    )).limit(1);
    if (duplicate) throw new ConflictException({ code: "UNIT_CONVERSION_DUPLICATE", message: "Pasangan konversi sudah tersedia." });
    try {
      const [created] = await this.database.db.insert(unitConversions).values({ tenantId: actor.tenantId, ...canonical, isActive: dto.isActive ?? true, createdBy: actor.userId, updatedBy: actor.userId }).returning();
      await this.audit.record({ tenantId: actor.tenantId, actorUserId: actor.userId, action: "unit_conversion.create", entityType: "unit_conversion", entityId: created.id, afterData: created });
      return created;
    } catch (error) {
      if ((error as { code?: string }).code === "23505") throw new ConflictException({ code: "UNIT_CONVERSION_DUPLICATE", message: "Pasangan konversi sudah tersedia." });
      throw error;
    }
  }

  async update(actor: AuthUser, id: string, dto: UpdateUnitConversionDto) {
    const [before] = await this.database.db.select().from(unitConversions).where(and(eq(unitConversions.id, id), eq(unitConversions.tenantId, actor.tenantId))).limit(1);
    if (!before) throw new NotFoundException({ code: "UNIT_CONVERSION_NOT_FOUND", message: "Konversi tidak ditemukan." });
    const fromId = dto.fromUnitId ?? before.fromUnitId, toId = dto.toUnitId ?? before.toUnitId;
    const factor = dto.factor ?? before.factor;
    const canonical = await this.canonical(actor.tenantId, fromId, toId, factor);
    if (canonical.fromUnitId !== before.fromUnitId || canonical.toUnitId !== before.toUnitId) throw new BadRequestException({ code: "UNIT_CONVERSION_PAIR_IMMUTABLE", message: "Pasangan satuan tidak dapat diubah." });
    const [updated] = await this.database.db.update(unitConversions).set({ factor: canonical.factor, ...(dto.isActive === undefined ? {} : { isActive: dto.isActive }), lockVersion: sql`${unitConversions.lockVersion} + 1`, updatedAt: new Date(), updatedBy: actor.userId }).where(and(eq(unitConversions.id, id), eq(unitConversions.tenantId, actor.tenantId), eq(unitConversions.lockVersion, dto.lockVersion))).returning();
    if (!updated) throw new ConflictException({ code: "UNIT_CONVERSION_STALE_VERSION", message: "Konversi telah berubah. Muat ulang data." });
    await this.audit.record({ tenantId: actor.tenantId, actorUserId: actor.userId, action: updated.isActive ? "unit_conversion.update" : "unit_conversion.archive", entityType: "unit_conversion", entityId: id, beforeData: before, afterData: updated });
    return updated;
  }

  private async canonical(tenantId: string, fromUnitId: string, toUnitId: string, factor: string) {
    if (fromUnitId === toUnitId) throw new BadRequestException({ code: "UNIT_CONVERSION_SAME_UNIT", message: "Satuan asal dan tujuan harus berbeda." });
    const value = decimal(factor, 6);
    if (value <= 0n) throw new BadRequestException({ code: "UNIT_CONVERSION_FACTOR_INVALID", message: "Faktor harus lebih besar dari nol." });
    const rows = await this.database.db.select().from(units).where(and(eq(units.tenantId, tenantId), isNull(units.deletedAt), eq(units.isActive, true), or(eq(units.id, fromUnitId), eq(units.id, toUnitId))));
    const from = rows.find((x) => x.id === fromUnitId), to = rows.find((x) => x.id === toUnitId);
    if (!from || !to) throw new BadRequestException({ code: "UNIT_CONVERSION_UNIT_INACTIVE", message: "Satuan tidak tersedia atau tidak aktif." });
    if (from.dimension !== to.dimension) throw new BadRequestException({ code: "UNIT_CONVERSION_DIMENSION_MISMATCH", message: "Dimensi satuan tidak kompatibel." });
    if (from.code.localeCompare(to.code) <= 0) return { fromUnitId, toUnitId, factor: formatDecimal(value, 6) };
    try { return { fromUnitId: toUnitId, toUnitId: fromUnitId, factor: inverseFactor(factor, 6) }; }
    catch { throw new BadRequestException({ code: "UNIT_CONVERSION_FACTOR_PRECISION", message: "Inverse faktor terlalu kecil untuk presisi yang didukung." }); }
  }
}
