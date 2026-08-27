const COST_FIELDS = new Set([
  "totalRecipeCost", "costPerYield", "costPerServing", "foodCostPercentage",
  "grossProfit", "grossMarginPercentage", "sellingPriceSnapshot",
  "costPerBaseUnit", "totalCost", "supplierCatalogId", "inventoryBatchIds",
]);

export function redactRecipeCosts<T>(payload: T, canReadCost: boolean): T {
  if (canReadCost) return payload;
  if (Array.isArray(payload)) return payload.map((value) => redactRecipeCosts(value, false)) as T;
  if (payload && typeof payload === "object") {
    return Object.fromEntries(Object.entries(payload).filter(([key]) => !COST_FIELDS.has(key)).map(([key, value]) => [key, redactRecipeCosts(value, false)])) as T;
  }
  return payload;
}
