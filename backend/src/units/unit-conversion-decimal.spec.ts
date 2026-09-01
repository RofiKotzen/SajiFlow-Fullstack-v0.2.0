import { inverseFactor, normalizeFactor } from "./unit-conversion-decimal";

describe("unit conversion fixed-point arithmetic", () => {
  it("normalizes direct factors without floating-point", () => {
    expect(normalizeFactor("1000", 9)).toBe("1000.000000000");
    expect(normalizeFactor("0.001", 9)).toBe("0.001000000");
  });
  it("resolves KG/G and L/ML inverse factors", () => {
    expect(inverseFactor("1000", 9)).toBe("0.001000000");
    expect(inverseFactor("0.001", 9)).toBe("1000.000000000");
  });
  it("retains decimal precision without binary drift", () => {
    expect(inverseFactor("3", 9)).toBe("0.333333333");
    expect(inverseFactor("0.000001", 9)).toBe("1000000.000000000");
  });
  it("rejects zero and negative values", () => {
    expect(() => normalizeFactor("0")).toThrow("UNIT_CONVERSION_FACTOR_INVALID");
    expect(() => inverseFactor("-1")).toThrow("UNIT_CONVERSION_FACTOR_INVALID");
  });
});
