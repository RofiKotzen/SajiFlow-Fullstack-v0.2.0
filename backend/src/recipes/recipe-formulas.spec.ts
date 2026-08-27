import { calculateRecipeMetrics, decimal, divide, formatDecimal, multiply, multiplyScaled, RECIPE_SCALES } from "./recipe-decimal";

describe("recipe decimal formulas", () => {
  it("rounds line costs and totals with ROUND_HALF_UP", () => {
    const quantity = decimal("0.333333", 6);
    const cost = decimal("10.005000", 6);
    const line = multiply(quantity, cost, 6, 12);
    const result = calculateRecipeMetrics({ lineCostsInternal: [line, line, line], internalScale: 12, yieldQuantity: "1", servingCount: "1", sellingPrice: "20.00" });
    expect(result.totalRecipeCost).toBe("10.00");
    expect(result.costPerServing).toBe("10.00");
    expect(result.foodCostPercentage).toBe("50.0000");
  });
  it("keeps percentages null when selling price is zero", () => {
    const result = calculateRecipeMetrics({ lineCostsInternal: [decimal("5", 12)], internalScale: 12, yieldQuantity: "1", servingCount: "1", sellingPrice: "0" });
    expect(result.foodCostPercentage).toBeNull();
    expect(result.grossMarginPercentage).toBeNull();
  });
  it("formats fixed point without floating point", () => {
    expect(formatDecimal(decimal("1.23456789", RECIPE_SCALES.quantity), 6)).toBe("1.234568");
  });
  it("calculates gross and base quantity across explicit scales", () => {
    const net = decimal("0.900000", 6);
    const gross = divide(net, 10000n - decimal("10.00", 2), 6, 4);
    const base = multiplyScaled(gross, 6, decimal("0.001000000", 9), 9, 6);
    expect(formatDecimal(gross, 6)).toBe("1.000000");
    expect(formatDecimal(base, 6)).toBe("0.001000");
  });
});
