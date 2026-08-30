const priceKeys = new Set([
  "sellingPrice",
  "priceOverride",
  "effectiveSellingPrice",
  "currencyCode",
]);

export function redactMenuPrices<T>(value: T, canReadPrices: boolean): T {
  if (canReadPrices || value === null || value === undefined) return value;
  if (Array.isArray(value))
    return value.map((item) => redactMenuPrices(item, false)) as T;
  if (typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([key]) => !priceKeys.has(key))
      .map(([key, nested]) => [key, redactMenuPrices(nested, false)]),
  ) as T;
}
