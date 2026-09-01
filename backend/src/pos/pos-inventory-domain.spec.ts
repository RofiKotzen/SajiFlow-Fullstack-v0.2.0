import {
  allocateFefo,
  fefoSort,
  formatFixed,
  inventoryValueMinor,
  recipeRequirement,
  requirementToStockMilli,
} from "./pos-inventory-domain";

describe("POS inventory domain", () => {
  const batch = (
    id: string,
    expiryDate: string | null,
    receivedDate: string,
    quantityOnHand = "1.000",
  ) => ({ id, expiryDate, receivedDate, quantityOnHand });

  it("calculates serving requirements at six decimals without floats", () => {
    expect(formatFixed(recipeRequirement("0.333333", "2.000", 3), 6)).toBe(
      "0.500000",
    );
    expect(requirementToStockMilli(500001n)).toBe(501n);
  });

  it("sorts expiry before no-expiry with deterministic received/id ties", () => {
    const rows = fefoSort([
      batch("d", null, "2026-01-01"),
      batch("c", "2026-03-01", "2026-01-01"),
      batch("b", "2026-02-01", "2026-01-02"),
      batch("a", "2026-02-01", "2026-01-02"),
    ]);
    expect(rows.map((row) => row.id)).toEqual(["a", "b", "c", "d"]);
  });

  it("allocates one or multiple FEFO batches exactly", () => {
    expect(
      allocateFefo(700n, [batch("a", "2026-01-01", "2025-01-01")]),
    ).toEqual([expect.objectContaining({ quantityMilli: 700n })]);
    expect(
      allocateFefo(1500n, [
        batch("b", null, "2025-01-01", "1.000"),
        batch("a", "2026-01-01", "2025-02-01", "0.600"),
      ]).map((row) => [row.batch.id, row.quantityMilli]),
    ).toEqual([
      ["a", 600n],
      ["b", 900n],
    ]);
  });

  it("rejects insufficient stock and values from batch cost", () => {
    expect(() => allocateFefo(1001n, [batch("a", null, "2025-01-01")])).toThrow(
      "INSUFFICIENT_STOCK",
    );
    expect(inventoryValueMinor(1250n, "1234.567890")).toBe(154321n);
    expect(formatFixed(-1250n, 3)).toBe("-1.250");
  });
});
