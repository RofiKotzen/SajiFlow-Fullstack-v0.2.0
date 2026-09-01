import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = (file: string) => readFileSync(join(__dirname, file), "utf8");

describe("KDS Batch 7 contract", () => {
  const controller = source("kds.controller.ts");
  const service = source("kds.service.ts");

  it.each([
    ['@Get("queue")', "kds.read"],
    ['@Get("orders/:orderId")', "kds.read"],
    ['@Post("items/:itemId/start")', "kds.update"],
    ['@Post("items/:itemId/ready")', "kds.update"],
  ])("exposes %s with %s", (route, permission) => {
    expect(controller).toContain(route);
    expect(controller).toContain(`@RequirePermissions("${permission}")`);
  });

  it("does not expose individual cancellation", () => {
    expect(controller).not.toMatch(/cancel|kds\.cancel/i);
  });

  it("uses full polling refresh and snapshot-only active kitchen rows", () => {
    expect(service).toContain('syncMode: "full_active_queue"');
    expect(service).toContain("serverTime:");
    expect(service).toContain("menuNameSnapshot");
    expect(service).toContain("variantNameSnapshot");
    expect(service).toContain("requiresKitchen, true");
    expect(service).toContain("KDS_ACTIVE_STATUSES");
    expect(service).not.toMatch(/payments|stockBatches|stockMovements|recipeItems/);
  });

  it("serializes order then item locks and performs strict transitions", () => {
    expect(service.indexOf("select id from sales_orders")).toBeLessThan(
      service.indexOf("select id from sales_order_items"),
    );
    expect(service).toContain('expectedStatus = action === "start" ? "queued" : "preparing"');
    expect(service).toContain("canTransitionItem(");
    expect(service).toContain("aggregateOrderStatus(");
    expect(service).toContain("STALE_KDS_ITEM_VERSION");
    expect(service).toContain("ORDER_NO_LONGER_ACTIVE");
  });

  it("writes one history, audit, and completed idempotency result", () => {
    expect(service).toContain("insert(salesOrderItemStatusHistory)");
    expect(service).toContain("insert(auditLogs)");
    expect(service).toContain('operationName = action === "start" ? "kds_item_start" : "kds_item_ready"');
    expect(service).toContain("responseBody: { orderId, itemId }");
  });
});
