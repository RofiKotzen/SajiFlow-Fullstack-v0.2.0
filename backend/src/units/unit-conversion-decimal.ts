import { decimal, divide, formatDecimal } from "../recipes/recipe-decimal";

export function normalizeFactor(value: string, scale = 6): string {
  const parsed = decimal(value, scale);
  if (parsed <= 0n) throw new Error("UNIT_CONVERSION_FACTOR_INVALID");
  return formatDecimal(parsed, scale);
}

export function inverseFactor(value: string, scale = 9): string {
  const parsed = decimal(value, scale);
  if (parsed <= 0n) throw new Error("UNIT_CONVERSION_FACTOR_INVALID");
  const inverse = divide(decimal("1", scale), parsed, scale, scale);
  if (inverse <= 0n) throw new Error("UNIT_CONVERSION_FACTOR_PRECISION");
  return formatDecimal(inverse, scale);
}
