import { BadRequestException, Injectable } from "@nestjs/common";
import { and, eq, isNull, or } from "drizzle-orm";
import { DatabaseService } from "../database/database.service";
import { unitConversions, units } from "../database/schema";
import { inverseFactor, normalizeFactor } from "./unit-conversion-decimal";

@Injectable()
export class UnitConversionResolver {
  async resolve(tenantId: string, fromUnitId: string, toUnitId: string): Promise<string> {
    const selected = await this.database.db.select().from(units).where(and(
      eq(units.tenantId, tenantId), isNull(units.deletedAt), eq(units.isActive, true),
      or(eq(units.id, fromUnitId), eq(units.id, toUnitId)),
    ));
    const from = selected.find((unit) => unit.id === fromUnitId);
    const to = selected.find((unit) => unit.id === toUnitId);
    if (!from || !to) throw new BadRequestException({ code: "UNIT_CONVERSION_UNIT_INACTIVE", message: "Satuan tidak tersedia atau tidak aktif." });
    if (from.dimension !== to.dimension) throw new BadRequestException({ code: "UNIT_CONVERSION_DIMENSION_MISMATCH", message: "Dimensi satuan tidak kompatibel." });
    if (fromUnitId === toUnitId) return "1.000000000";
    const rows = await this.database.db.select().from(unitConversions).where(and(
      eq(unitConversions.tenantId, tenantId), eq(unitConversions.isActive, true),
      or(
        and(eq(unitConversions.fromUnitId, fromUnitId), eq(unitConversions.toUnitId, toUnitId)),
        and(eq(unitConversions.fromUnitId, toUnitId), eq(unitConversions.toUnitId, fromUnitId)),
      ),
    )).limit(1);
    const row = rows[0];
    if (!row) throw new BadRequestException({ code: "UNIT_CONVERSION_NOT_FOUND", message: "Konversi satuan aktif tidak ditemukan." });
    if (row.fromUnitId === fromUnitId) return normalizeFactor(row.factor, 9);
    return inverseFactor(row.factor, 9);
  }

  constructor(private readonly database: DatabaseService) {}
}
