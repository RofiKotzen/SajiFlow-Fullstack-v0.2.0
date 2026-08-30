import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const menuService = readFileSync(
  resolve(process.cwd(), "src/menu-products/menu-products.service.ts"),
  "utf8",
);
const recipeService = readFileSync(
  resolve(process.cwd(), "src/recipes/recipes.service.ts"),
  "utf8",
);

describe("Recipe lookup integration contract", () => {
  it("isolates candidates by tenant and selected outlet setting", () => {
    expect(menuService).toContain("eq(menus.tenantId, actor.tenantId)");
    expect(menuService).toContain(
      "eq(menuVariantOutletSettings.outletId, outletId)",
    );
    expect(menuService).toContain(
      "eq(menuVariantOutletSettings.tenantId, actor.tenantId)",
    );
  });

  it("does not depend on legacy menu_variants.outlet_id", () => {
    const lookup = menuService.slice(
      menuService.indexOf("async recipeLookup"),
      menuService.indexOf("async posLookup"),
    );
    expect(lookup).not.toContain("menuVariants.outletId");
    expect(recipeService).not.toContain(
      "variantOutletId: menuVariants.outletId",
    );
  });

  it("keeps historical Recipe detail independent of active lookup", () => {
    const historicalGet = recipeService.slice(
      recipeService.indexOf("async get("),
      recipeService.indexOf("async versions("),
    );
    expect(historicalGet).toContain("eq(recipeHeaders.id, headerId)");
    expect(historicalGet).not.toContain(
      "menuVariantOutletSettings.isAvailable",
    );
  });
});
