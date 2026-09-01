export interface FefoBatch {
  id: string;
  expiryDate: string | null;
  receivedDate: string;
  quantityOnHand: string | number;
}

export function parseFixed(value: string | number, scale: number): bigint {
  const normalized = String(value);
  const match = /^(0|[1-9]\d*)(?:\.(\d+))?$/.exec(normalized);
  if (!match || (match[2]?.length ?? 0) > scale)
    throw new Error(`Nilai harus positif dengan maksimal ${scale} desimal.`);
  return (
    BigInt(match[1]) * 10n ** BigInt(scale) +
    BigInt((match[2] ?? "").padEnd(scale, "0"))
  );
}

export function formatFixed(value: bigint, scale: number): string {
  const sign = value < 0n ? "-" : "";
  const absolute = value < 0n ? -value : value;
  const factor = 10n ** BigInt(scale);
  const whole = absolute / factor;
  const fraction = (absolute % factor).toString().padStart(scale, "0");
  return `${sign}${whole}.${fraction}`;
}

export function recipeRequirement(
  baseQuantity: string | number,
  servingCount: string | number,
  salesQuantity: number,
): bigint {
  if (!Number.isInteger(salesQuantity) || salesQuantity <= 0)
    throw new Error("Quantity penjualan harus integer positif.");
  const base = parseFixed(baseQuantity, 6);
  const servings = parseFixed(servingCount, 3);
  if (base <= 0n || servings <= 0n)
    throw new Error("Base quantity dan serving count harus positif.");
  return divideCeil(base * BigInt(salesQuantity) * 1000n, servings);
}

export function requirementToStockMilli(requiredMicro: bigint): bigint {
  if (requiredMicro <= 0n) throw new Error("Kebutuhan stok harus positif.");
  return divideCeil(requiredMicro, 1000n);
}

export function fefoSort<T extends FefoBatch>(rows: T[]): T[] {
  return [...rows].sort((left, right) => {
    if (left.expiryDate && !right.expiryDate) return -1;
    if (!left.expiryDate && right.expiryDate) return 1;
    const expiry = (left.expiryDate ?? "").localeCompare(
      right.expiryDate ?? "",
    );
    if (expiry) return expiry;
    const received = left.receivedDate.localeCompare(right.receivedDate);
    return received || left.id.localeCompare(right.id);
  });
}

export function allocateFefo<T extends FefoBatch>(
  requiredMilli: bigint,
  rows: T[],
): Array<{ batch: T; quantityMilli: bigint }> {
  let remaining = requiredMilli;
  const allocations: Array<{ batch: T; quantityMilli: bigint }> = [];
  for (const batch of fefoSort(rows)) {
    if (remaining === 0n) break;
    const available = parseFixed(batch.quantityOnHand, 3);
    if (available <= 0n) continue;
    const quantityMilli = available < remaining ? available : remaining;
    allocations.push({ batch, quantityMilli });
    remaining -= quantityMilli;
  }
  if (remaining > 0n) throw new Error("INSUFFICIENT_STOCK");
  return allocations;
}

export function inventoryValueMinor(
  quantityMilli: bigint,
  unitCost: string | number,
): bigint {
  const costMicro = parseFixed(unitCost, 6);
  return divideRoundHalfUp(quantityMilli * costMicro, 10_000_000n);
}

function divideCeil(value: bigint, divisor: bigint): bigint {
  return (value + divisor - 1n) / divisor;
}

function divideRoundHalfUp(value: bigint, divisor: bigint): bigint {
  return (value + divisor / 2n) / divisor;
}
