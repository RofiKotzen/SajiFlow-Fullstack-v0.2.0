import { redactMenuPrices } from "./menu-product-visibility";

describe("menu price visibility", () => {
  const payload = {
    id: "v1",
    sellingPrice: "25000.00",
    currencyCode: "IDR",
    outlets: [
      {
        priceOverride: "27000.00",
        effectiveSellingPrice: "27000.00",
        isAvailable: true,
      },
    ],
  };
  it("preserves prices with menus.prices.read", () =>
    expect(redactMenuPrices(payload, true)).toEqual(payload));
  it("redacts base, override, effective price, and currency recursively", () =>
    expect(redactMenuPrices(payload, false)).toEqual({
      id: "v1",
      outlets: [{ isAvailable: true }],
    }));
});
