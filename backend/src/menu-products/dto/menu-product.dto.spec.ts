import { validate } from "class-validator";
import { plainToInstance } from "class-transformer";
import {
  CreateMenuVariantDto,
  normalizeCode,
  normalizeName,
} from "./menu-product.dto";

describe("menu product DTO and normalization", () => {
  it("normalizes codes case-insensitively and collapses name whitespace", () => {
    expect(normalizeCode("  sku-small ")).toBe("SKU-SMALL");
    expect(normalizeName("  Es   Kopi  ")).toBe("Es Kopi");
  });
  it("rejects negative prices and invalid currency", async () => {
    const dto = plainToInstance(CreateMenuVariantDto, {
      sku: "SKU-1",
      name: "Regular",
      sellingPrice: "-1",
      currencyCode: "idr",
    });
    const errors = await validate(dto);
    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(["sellingPrice", "currencyCode"]),
    );
  });
});
