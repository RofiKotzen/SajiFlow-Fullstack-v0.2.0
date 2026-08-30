import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migration = readFileSync(
  resolve(process.cwd(), "drizzle/0006_menu_product_master_phase1.sql"),
  "utf8",
);
const recipeMigration = readFileSync(
  resolve(process.cwd(), "drizzle/0005_recipe_food_cost_phase1.sql"),
  "utf8",
);
const recipeService = readFileSync(
  resolve(process.cwd(), "src/recipes/recipes.service.ts"),
  "utf8",
);

describe("menu product migration contract", () => {
  it("diagnoses legacy duplicate variant SKUs before creating the unique index", () => {
    expect(
      migration.indexOf("duplicate legacy menu variant SKU"),
    ).toBeGreaterThan(-1);
    expect(migration.indexOf("duplicate legacy menu variant SKU")).toBeLessThan(
      migration.indexOf("uq_menu_variants_tenant_sku_ci"),
    );
  });
  it("preserves variant ids and historical references", () => {
    expect(migration).not.toMatch(/DELETE\s+FROM\s+public\.menu_variants/i);
    expect(migration).not.toMatch(/UPDATE\s+public\.order_items/i);
    expect(migration).not.toMatch(/UPDATE\s+public\.recipes/i);
    expect(migration).not.toMatch(
      /DROP\s+COLUMN\s+(IF\s+EXISTS\s+)?outlet_id/i,
    );
  });
  it("uses an idempotent outlet-setting backfill", () => {
    expect(migration).toContain(
      "ON CONFLICT (tenant_id, outlet_id, menu_variant_id) DO NOTHING",
    );
  });
  it("does not modify recipe migration 0005 and resolves effective outlet price", () => {
    expect(recipeMigration).toContain("uq_recipe_current_approved");
    expect(recipeService).toContain("this.effectivePrice.resolve");
    expect(recipeService).toContain("recipes.cost.read");
  });
});
