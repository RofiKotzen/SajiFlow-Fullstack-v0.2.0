import { redactRecipeCosts } from "./recipe-visibility";
describe("recipe cost visibility", () => {
  const payload = { name: "Saus", costPerServing: "12.00", lines: [{ ingredientNameSnapshot: "Tomat", costPerBaseUnit: "4.00", supplierCatalogId: "secret" }] };
  it("removes every sensitive nested cost field", () => expect(redactRecipeCosts(payload, false)).toEqual({ name: "Saus", lines: [{ ingredientNameSnapshot: "Tomat" }] }));
  it("preserves cost fields with recipes.cost.read", () => expect(redactRecipeCosts(payload, true)).toEqual(payload));
});
