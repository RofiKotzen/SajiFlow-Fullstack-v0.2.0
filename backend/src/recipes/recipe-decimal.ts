export const RECIPE_SCALES = {
  quantity: 6,
  conversion: 9,
  unitCost: 6,
  money: 2,
  percentage: 4,
} as const;

// Fixed-point decimal helpers. All operations use bigint and ROUND_HALF_UP;
// no financial calculation passes through JavaScript floating point.
export function decimal(value: string | number, scale: number): bigint {
  const input = String(value).trim();
  if (!/^-?\d+(\.\d+)?$/.test(input)) throw new Error(`Invalid decimal: ${input}`);
  const negative = input.startsWith("-");
  const [whole, fraction = ""] = input.replace("-", "").split(".");
  const padded = `${fraction}${"0".repeat(scale + 1)}`;
  let result = BigInt(whole) * 10n ** BigInt(scale) + BigInt(padded.slice(0, scale) || "0");
  if (Number(padded[scale] ?? "0") >= 5) result += 1n;
  return negative ? -result : result;
}

export function formatDecimal(value: bigint, scale: number): string {
  const negative = value < 0n;
  const absolute = negative ? -value : value;
  const base = 10n ** BigInt(scale);
  const fraction = (absolute % base).toString().padStart(scale, "0");
  return `${negative ? "-" : ""}${absolute / base}${scale ? `.${fraction}` : ""}`;
}

export function multiply(a: bigint, b: bigint, inputScale: number, outputScale: number): bigint {
  return rescale(a * b, inputScale * 2, outputScale);
}

export function multiplyScaled(a: bigint, aScale: number, b: bigint, bScale: number, outputScale: number): bigint {
  return rescale(a * b, aScale + bScale, outputScale);
}

export function divide(a: bigint, b: bigint, inputScale: number, outputScale: number): bigint {
  if (b === 0n) throw new Error("Division by zero");
  const numerator = a * 10n ** BigInt(outputScale);
  return roundDivision(numerator, b);
}

export function rescale(value: bigint, fromScale: number, toScale: number): bigint {
  if (fromScale === toScale) return value;
  if (fromScale < toScale) return value * 10n ** BigInt(toScale - fromScale);
  return roundDivision(value, 10n ** BigInt(fromScale - toScale));
}

function roundDivision(numerator: bigint, denominator: bigint): bigint {
  const negative = (numerator < 0n) !== (denominator < 0n);
  const n = numerator < 0n ? -numerator : numerator;
  const d = denominator < 0n ? -denominator : denominator;
  let quotient = n / d;
  if ((n % d) * 2n >= d) quotient += 1n;
  return negative ? -quotient : quotient;
}

export function calculateRecipeMetrics(input: {
  lineCostsInternal: bigint[];
  internalScale: number;
  yieldQuantity: string;
  servingCount: string;
  sellingPrice: string | null;
}) {
  const totalInternal = input.lineCostsInternal.reduce((sum, value) => sum + value, 0n);
  const money = rescale(totalInternal, input.internalScale, RECIPE_SCALES.money);
  const yieldQty = decimal(input.yieldQuantity, RECIPE_SCALES.quantity);
  const servings = decimal(input.servingCount, RECIPE_SCALES.quantity);
  const costPerYield = divide(rescale(totalInternal, input.internalScale, RECIPE_SCALES.quantity), yieldQty, RECIPE_SCALES.quantity, RECIPE_SCALES.unitCost);
  const costPerServingInternal = divide(rescale(totalInternal, input.internalScale, RECIPE_SCALES.quantity), servings, RECIPE_SCALES.quantity, RECIPE_SCALES.unitCost);
  const costPerServing = rescale(costPerServingInternal, RECIPE_SCALES.unitCost, RECIPE_SCALES.money);
  if (input.sellingPrice === null || decimal(input.sellingPrice, RECIPE_SCALES.money) === 0n) {
    return { totalRecipeCost: formatDecimal(money, 2), costPerYield: formatDecimal(costPerYield, 6), costPerServing: formatDecimal(costPerServing, 2), foodCostPercentage: null, grossProfit: input.sellingPrice === null ? null : formatDecimal(-costPerServing, 2), grossMarginPercentage: null };
  }
  const price = decimal(input.sellingPrice, RECIPE_SCALES.money);
  const profit = price - costPerServing;
  const foodPct = divide(costPerServing, price, RECIPE_SCALES.money, RECIPE_SCALES.percentage + 2);
  const marginPct = divide(profit, price, RECIPE_SCALES.money, RECIPE_SCALES.percentage + 2);
  return { totalRecipeCost: formatDecimal(money, 2), costPerYield: formatDecimal(costPerYield, 6), costPerServing: formatDecimal(costPerServing, 2), foodCostPercentage: formatDecimal(foodPct, 4), grossProfit: formatDecimal(profit, 2), grossMarginPercentage: formatDecimal(marginPct, 4) };
}
