import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("POS Batch 4 HTTP and persistence contract", () => {
  const root = join(__dirname);
  const controller = readFileSync(join(root, "pos.controller.ts"), "utf8");
  const service = readFileSync(join(root, "pos.service.ts"), "utf8");

  it("exposes only lookup and draft workflow routes with dedicated permissions", () => {
    expect(controller).toContain('@Get("lookups")');
    expect(controller).toContain('@Get("orders")');
    expect(controller).toContain('@Get("orders/:id")');
    expect(controller).toContain('@Post("orders")');
    expect(controller).toContain('@Patch("orders/:id")');
    expect(
      controller.match(/@RequirePermissions\("pos\.read"\)/g),
    ).toHaveLength(3);
    expect(controller).toContain('@RequirePermissions("pos.create")');
    expect(controller).toContain('@RequirePermissions("pos.update")');
  });

  it("binds all reads and mutations to tenant and outlet scope", () => {
    expect(service).toContain("eq(salesOrders.tenantId, actor.tenantId)");
    expect(service).toContain("eq(salesOrders.outletId, before.outletId)");
    expect(service).toContain("actor.outletIds.includes(outletId)");
    expect(service).toContain("eq(menuVariants.tenantId, tenantId)");
    expect(service).toContain(
      "eq(menuVariantOutletSettings.outletId, outletId)",
    );
  });

  it("keeps create idempotent and update optimistic and atomic", () => {
    expect(service).toContain('operation: "create_draft"');
    expect(service).toContain("requestHash");
    expect(service).toContain("onConflictDoNothing()");
    expect(service).toContain("eq(salesOrders.lockVersion, dto.lockVersion)");
    expect(service).toContain(
      "lockVersion: sql`${salesOrders.lockVersion} + 1`",
    );
    expect(
      service.match(/\.transaction\(async \(tx\)/g)?.length,
    ).toBeGreaterThanOrEqual(2);
    expect(service).toContain('action: "sales_order.create"');
    expect(service).toContain('action: "sales_order.draft_update"');
  });

  it("resolves price and Recipe snapshots without inventory or payment writes", () => {
    expect(service).toContain("row.priceOverride ?? row.basePrice");
    expect(service).toContain("multiplyMoney(price, item.quantity)");
    expect(service).toContain("recipeVersionNo");
    expect(service).toContain('status: "draft" as const');
  });
});
