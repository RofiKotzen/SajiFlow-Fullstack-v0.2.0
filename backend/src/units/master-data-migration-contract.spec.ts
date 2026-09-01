import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("master data support migration contract", () => {
  const sql = readFileSync(join(process.cwd(), "drizzle", "0008_master_data_support_api.sql"), "utf8");
  it("adds conversion constraints and resolver index", () => {
    expect(sql).toContain("uq_unit_conversions_tenant_pair");
    expect(sql).toContain("ck_unit_conversions_factor_positive");
    expect(sql).toContain("ck_unit_conversions_distinct_units");
    expect(sql).toContain("lock_version integer NOT NULL DEFAULT 1");
    expect(sql).toContain("ix_unit_conversions_resolver");
  });
  it("backfills category codes before NOT NULL and tenant unique index", () => {
    expect(sql.indexOf("UPDATE public.ingredient_categories")).toBeLessThan(sql.indexOf("ALTER COLUMN code SET NOT NULL"));
    expect(sql).toContain("uq_ingredient_categories_tenant_code");
    expect(sql).toContain("WHERE deleted_at IS NULL");
  });
  it("preserves data and avoids destructive cascades", () => {
    expect(sql).not.toMatch(/DROP\s+(TABLE|COLUMN)/i);
    expect(sql).not.toMatch(/DELETE\s+FROM/i);
    expect(sql).not.toMatch(/ON\s+DELETE\s+CASCADE/i);
  });
  it("keeps transaction and duplicate preflight", () => {
    expect(sql.trimStart()).toMatch(/^BEGIN;/);
    expect(sql.trimEnd()).toMatch(/COMMIT;$/);
    expect(sql).toContain("duplicate unit conversion pairs require manual review");
  });
});
