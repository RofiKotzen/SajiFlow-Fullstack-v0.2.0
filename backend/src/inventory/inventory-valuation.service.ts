import { Injectable } from "@nestjs/common";
import { and, desc, eq, gt, isNull, sql } from "drizzle-orm";
import { DatabaseService } from "../database/database.service";
import { stockBatches } from "../database/schema";

export const validInventoryQuantity = gt(stockBatches.quantityOnHand, 0);
export const weightedInventoryCost = sql<string>`sum(case when ${stockBatches.quantityOnHand} > 0 then ${stockBatches.quantityOnHand} * ${stockBatches.unitCost} else 0 end) / nullif(sum(case when ${stockBatches.quantityOnHand} > 0 then ${stockBatches.quantityOnHand} else 0 end), 0)`;

@Injectable()
export class InventoryValuationService {
  constructor(private readonly database: DatabaseService) {}

  async ingredientCost(tenantId: string, outletId: string, ingredientId: string, executor = this.database.db) {
    const [row] = await executor
      .select({
        costPerBaseUnit: weightedInventoryCost,
        sourceAt: sql<Date>`max(${stockBatches.updatedAt})`,
        batchIds: sql<string[]>`jsonb_agg(${stockBatches.id} order by ${stockBatches.id})`,
      })
      .from(stockBatches)
      .where(and(eq(stockBatches.tenantId, tenantId), eq(stockBatches.outletId, outletId), eq(stockBatches.ingredientId, ingredientId), validInventoryQuantity))
      .groupBy(stockBatches.tenantId, stockBatches.outletId, stockBatches.ingredientId)
      .orderBy(desc(sql`max(${stockBatches.updatedAt})`))
      .limit(1);
    return row ?? null;
  }
}
