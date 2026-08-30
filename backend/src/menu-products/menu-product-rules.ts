export type RecipeEligibilityInput = {
  categoryActive: boolean;
  menuActive: boolean;
  hasVariant: boolean;
  variantActive: boolean | null;
  hasOutletSetting: boolean;
  settingActive: boolean | null;
  isAvailable: boolean | null;
  hasRecipe: boolean;
};

export function recipeEligibility(input: RecipeEligibilityInput) {
  const reasons: string[] = [];
  if (!input.categoryActive) reasons.push("CATEGORY_INACTIVE");
  if (!input.menuActive) reasons.push("MENU_INACTIVE");
  if (!input.hasVariant) reasons.push("NO_VARIANT");
  else if (!input.variantActive) reasons.push("VARIANT_INACTIVE");
  if (input.hasVariant && !input.hasOutletSetting)
    reasons.push("NO_OUTLET_SETTING");
  else if (input.hasVariant && !input.settingActive)
    reasons.push("OUTLET_SETTING_INACTIVE");
  else if (input.hasVariant && !input.isAvailable)
    reasons.push("NOT_AVAILABLE_AT_OUTLET");
  if (input.hasRecipe) reasons.push("RECIPE_EXISTS");
  return { eligible: reasons.length === 0, reasons };
}

export function resolveEffectivePrice(
  basePrice: string | null,
  priceOverride: string | null,
) {
  return priceOverride ?? basePrice;
}
