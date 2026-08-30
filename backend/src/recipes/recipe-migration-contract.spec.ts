import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("Recipe Phase 1 migration contracts", () => {
  const migration = readFileSync(
    resolve(process.cwd(), "drizzle/0005_recipe_food_cost_phase1.sql"),
    "utf8",
  );
  const service = readFileSync(
    resolve(process.cwd(), "src/recipes/recipes.service.ts"),
    "utf8",
  );
  it("preserves recipe ids and POS/KDS references during legacy backfill", () => {
    expect(migration).not.toMatch(/UPDATE\s+public\.order_items/i);
    expect(migration).not.toMatch(/DELETE\s+FROM\s+public\.recipes/i);
    expect(migration).toContain("is_legacy = true");
  });
  it("selects UUID audit actors deterministically without unsupported UUID aggregates", () => {
    expect(migration).not.toMatch(
      /(?:min|max)\s*\(\s*r\.(?:created_by|updated_by)\s*\)/i,
    );
    expect(migration).toContain(
      "array_agg(r.created_by ORDER BY r.created_at ASC, r.id ASC)",
    );
    expect(migration).toContain(
      "array_agg(r.updated_by ORDER BY r.updated_at DESC, r.id DESC)",
    );
  });
  it("enforces one approved version and locks concurrent approval", () => {
    expect(migration).toContain("uq_recipe_current_approved");
    expect(service).toContain("for update");
    expect(service).toContain("eq(recipes.lockVersion, draft.lockVersion)");
  });
  it("recalculates approval costing inside the approval transaction", () => {
    const approval = service.slice(
      service.indexOf("async approve"),
      service.indexOf("async revise"),
    );
    expect(approval).toMatch(
      /this\.calculate\(\s*tx,\s*actor,\s*draft\.id,\s*outletId,\s*"approval_snapshot",?\s*\)/,
    );
    expect(approval).toContain("approvedOutletId: outletId");
    expect(approval).toContain("approvedCostingRunId: costingRunId");
  });
  it("defines measurable stale sources and immutable snapshots", () => {
    expect(service).toContain("sourceVersionAt");
    expect(service).toContain("staleSources");
    expect(migration).toContain("trg_costing_run_immutable");
    expect(migration).toContain("trg_costing_line_immutable");
  });
  it("does not modify Inventory, PO, GR, order, or KDS rows", () => {
    for (const table of [
      "stock_batches",
      "stock_movements",
      "purchase_orders",
      "goods_receipts",
      "order_items",
      "kitchen_ticket_items",
    ])
      expect(migration).not.toMatch(
        new RegExp(`(?:update|delete\\s+from)\\s+public\\.${table}`, "i"),
      );
  });
});
