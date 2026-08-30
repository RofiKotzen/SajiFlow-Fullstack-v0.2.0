import { Injectable, NotFoundException } from "@nestjs/common";
import { and, eq } from "drizzle-orm";
import { DatabaseService } from "../database/database.service";
import { menuVariantOutletSettings, menuVariants } from "../database/schema";
import { resolveEffectivePrice } from "./menu-product-rules";

@Injectable()
export class EffectivePriceService {
  constructor(private readonly database: DatabaseService) {}

  async resolve(
    tenantId: string,
    menuVariantId: string,
    outletId: string,
    tx: any = this.database.db,
  ) {
    const [row] = await tx
      .select({
        basePrice: menuVariants.sellingPrice,
        currencyCode: menuVariants.currencyCode,
        variantUpdatedAt: menuVariants.updatedAt,
        priceOverride: menuVariantOutletSettings.priceOverride,
        settingUpdatedAt: menuVariantOutletSettings.updatedAt,
      })
      .from(menuVariants)
      .leftJoin(
        menuVariantOutletSettings,
        and(
          eq(menuVariantOutletSettings.menuVariantId, menuVariants.id),
          eq(menuVariantOutletSettings.tenantId, tenantId),
          eq(menuVariantOutletSettings.outletId, outletId),
          eq(menuVariantOutletSettings.isActive, true),
        ),
      )
      .where(
        and(
          eq(menuVariants.id, menuVariantId),
          eq(menuVariants.tenantId, tenantId),
        ),
      )
      .limit(1);
    if (!row) throw new NotFoundException("Menu variant tidak ditemukan.");
    return {
      sellingPrice: resolveEffectivePrice(row.basePrice, row.priceOverride),
      currencyCode: row.currencyCode,
      sourceVersionAt:
        row.settingUpdatedAt && row.settingUpdatedAt > row.variantUpdatedAt
          ? row.settingUpdatedAt
          : row.variantUpdatedAt,
      source: row.priceOverride !== null ? "outlet_override" : "base",
    };
  }
}
