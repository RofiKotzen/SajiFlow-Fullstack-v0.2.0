import { recipeEligibility, resolveEffectivePrice } from "./menu-product-rules";

const eligible = {
  categoryActive: true,
  menuActive: true,
  hasVariant: true,
  variantActive: true,
  hasOutletSetting: true,
  settingActive: true,
  isAvailable: true,
  hasRecipe: false,
};

describe("Recipe menu eligibility", () => {
  it("includes an active menu variant available at the selected outlet", () => {
    expect(recipeEligibility(eligible)).toEqual({
      eligible: true,
      reasons: [],
    });
  });

  it("explains a missing outlet configuration", () => {
    expect(
      recipeEligibility({ ...eligible, hasOutletSetting: false }).reasons,
    ).toContain("NO_OUTLET_SETTING");
  });

  it("excludes archived menu and variant from new Recipe selection", () => {
    expect(
      recipeEligibility({
        ...eligible,
        menuActive: false,
        variantActive: false,
      }),
    ).toEqual({
      eligible: false,
      reasons: ["MENU_INACTIVE", "VARIANT_INACTIVE"],
    });
  });

  it("keeps an existing Recipe visible with an explicit disabled reason", () => {
    expect(recipeEligibility({ ...eligible, hasRecipe: true })).toEqual({
      eligible: false,
      reasons: ["RECIPE_EXISTS"],
    });
  });

  it("uses outlet override and falls back to base price", () => {
    expect(resolveEffectivePrice("20000.00", "22500.00")).toBe("22500.00");
    expect(resolveEffectivePrice("20000.00", null)).toBe("20000.00");
  });
});
