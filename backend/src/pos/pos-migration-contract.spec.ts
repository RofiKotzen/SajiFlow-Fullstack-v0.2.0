import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("POS Phase 1 migration and schema contract", () => {
  const migration = readFileSync(
    resolve(process.cwd(), "drizzle/0007_pos_phase1.sql"),
    "utf8",
  );
  const schema = readFileSync(
    resolve(process.cwd(), "src/database/schema.ts"),
    "utf8",
  );

  const tables = [
    "sales_orders",
    "sales_order_items",
    "sales_order_item_status_history",
    "payments",
    "sales_item_consumptions",
    "pos_operation_requests",
  ];

  it("adds explicit requires_kitchen with a safe fallback and review note", () => {
    expect(migration).toContain(
      "requires_kitchen boolean NOT NULL DEFAULT true",
    );
    expect(migration).toContain("independent from requires_recipe");
    expect(migration).toContain("require manual review");
    expect(schema).toContain(
      'requiresKitchen: boolean("requires_kitchen").notNull().default(true)',
    );
  });

  it.each(tables)("creates tenant-bound table %s with RLS", (table) => {
    expect(migration).toMatch(
      new RegExp(`CREATE TABLE public\\.${table} \\([\\s\\S]*?tenant_id uuid NOT NULL`),
    );
    expect(migration).toContain(
      `ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY`,
    );
    expect(migration).toContain(
      `CREATE POLICY tenant_isolation ON public.${table}`,
    );
    expect(schema).toContain(`"${table}"`);
  });

  it("uses restrictive historical foreign keys and no destructive writes", () => {
    expect(migration).toContain("ON DELETE RESTRICT");
    expect(migration).not.toMatch(/ON DELETE CASCADE/i);
    expect(migration).not.toMatch(/DELETE\s+FROM/i);
    expect(migration).not.toMatch(/DROP\s+TABLE/i);
  });

  it("defines idempotency, receipt, payment, snapshot, and lock constraints", () => {
    expect(migration).toContain("uq_pos_operation_idempotency");
    expect(migration).toContain("uq_sales_orders_receipt");
    expect(migration).toContain("uq_payments_order_entry");
    expect(migration).toContain("menu_name_snapshot");
    expect(migration).toContain("recipe_version_id");
    expect(migration).toContain("ck_sales_orders_lock_version");
  });

  it("binds transaction children to tenant-aware parent keys", () => {
    expect(migration).toContain("uq_sales_orders_tenant_id");
    expect(migration).toContain("uq_sales_orders_scope_id");
    expect(migration).toContain(
      "FOREIGN KEY (tenant_id, outlet_id, sales_order_id)",
    );
    expect(migration).toContain(
      "FOREIGN KEY (tenant_id, sales_order_id, sales_order_item_id)",
    );
    expect(migration).toContain(
      "FOREIGN KEY (tenant_id, original_payment_id)",
    );
  });

  it("allows one payment record to be voided and records one manual refund", () => {
    expect(migration).toContain(
      "WHERE entry_type = 'payment';",
    );
    expect(migration).toContain("uq_payments_refund_original");
    expect(migration).toContain("entry_type = 'manual_refund'");
    expect(migration).toContain("original_payment_id IS NOT NULL");
    expect(migration).toContain("length(btrim(reason)) >= 3");
  });

  it("supports recoverable idempotency processing leases", () => {
    expect(migration).toContain("lease_expires_at");
    expect(migration).toContain("ck_pos_operation_lease");
    expect(migration).toContain("request_hash char(64)");
  });

  it("keeps future inventory references nullable and records optional skips", () => {
    expect(migration).toContain(
      "stock_movement_line_id uuid REFERENCES public.stock_movement_lines(id) ON DELETE RESTRICT",
    );
    expect(migration).not.toContain("stock_movement_line_id uuid NOT NULL");
    expect(migration).toContain("OPTIONAL_ITEM_PHASE1");
    expect(migration).toContain("skipped_optional");
    expect(migration).toContain("uq_stock_movement_sales_order");
    expect(migration).toContain("ck_sales_consumption_reversal");
  });
});
