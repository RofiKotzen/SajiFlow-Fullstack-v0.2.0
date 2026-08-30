import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const service = readFileSync(
  resolve(process.cwd(), "src/menu-products/menu-products.service.ts"),
  "utf8",
);
const controller = readFileSync(
  resolve(process.cwd(), "src/menu-products/menu-products.controller.ts"),
  "utf8",
);

describe("menu product business contracts", () => {
  it("rejects category archive while active menus exist", () =>
    expect(service).toContain("CATEGORY_HAS_ACTIVE_MENUS"));
  it("validates parent category/menu and outlet configuration on activation", () => {
    expect(service).toContain(
      "await this.assertActiveCategory(actor, before.categoryId)",
    );
    expect(service).toContain(
      "Variant memerlukan minimal satu konfigurasi outlet aktif",
    );
  });
  it("requires dedicated permissions for prices and outlet configuration", () => {
    expect(controller).toContain('RequirePermissions("menus.prices.manage")');
    expect(controller).toContain('RequirePermissions("menus.outlets.manage")');
    expect(service).toContain(
      'actor.permissions.includes("menus.prices.read")',
    );
  });
});
