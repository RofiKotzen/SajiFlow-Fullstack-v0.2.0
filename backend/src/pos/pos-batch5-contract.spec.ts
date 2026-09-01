import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("POS Batch 5 transaction contract", () => {
  const root = join(__dirname);
  const controller = readFileSync(join(root, "pos.controller.ts"), "utf8");
  const service = readFileSync(join(root, "pos.service.ts"), "utf8");

  it("maps submit and cancel with dedicated permissions only", () => {
    expect(controller).toContain('@Post("orders/:id/submit")');
    expect(controller).toContain('@RequirePermissions("pos.submit")');
    expect(controller).toContain('@Post("orders/:id/cancel")');
    expect(controller).toContain('@RequirePermissions("pos.cancel")');
    expect(controller).not.toMatch(
      /pos\.(pay|complete|void)|@Controller\("kds"\)/,
    );
  });

  it("locks order and FEFO batches inside atomic operations", () => {
    expect(service).toContain("from sales_orders");
    expect(service).toContain("for update of sb");
    expect(service).toContain("expiry_date asc nulls last");
    expect(service).toContain("order by sb.ingredient_id");
    expect(service).toContain("eq(salesOrders.lockVersion, dto.lockVersion)");
  });

  it("writes consumption traceability, ledger and item history", () => {
    expect(service).toContain("insert(stockMovements)");
    expect(service).toContain("insert(stockMovementLines)");
    expect(service).toContain("insert(salesItemConsumptions)");
    expect(service).toContain("insert(salesOrderItemStatusHistory)");
    expect(service).toContain('movementType === "sale_consumption"');
    expect(service).toContain('status: "skipped_optional"');
    expect(service).toContain('skippedReason: "OPTIONAL_ITEM_PHASE1"');
  });

  it("uses idempotency lease, optimistic lock and stable business errors", () => {
    expect(service).toContain('"submit_order"');
    expect(service).toContain('"cancel_order"');
    expect(service).toContain("acquireOperation(");
    expect(service).toContain("completeOperation(");
    for (const code of [
      "ORDER_NOT_DRAFT",
      "STALE_ORDER_VERSION",
      "PRICE_CHANGED",
      "RECIPE_NOT_READY",
      "INSUFFICIENT_STOCK",
      "ORDER_ALREADY_CANCELLED",
      "PAID_ORDER_REQUIRES_VOID",
    ]) {
      expect(service).toContain(code);
    }
  });

  it("reverses original allocation without a new FEFO selection", () => {
    expect(service).toContain("reversalOfId: options?.reversalOfId");
    expect(service).toContain("reversalStockMovementLineId: reversalLine.id");
    expect(service).toContain(
      "quantityOnHand: sql`${stockBatches.quantityOnHand} +",
    );
    expect(service).not.toContain("insert(payments)");
  });
});
