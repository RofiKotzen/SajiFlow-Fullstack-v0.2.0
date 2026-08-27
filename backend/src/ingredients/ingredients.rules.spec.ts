import { BadRequestException } from "@nestjs/common";
import {
  validatePerishableShelfLife,
  validateStockLevels,
} from "./ingredients.rules";

describe("ingredient domain rules", () => {
  it("requires shelf life for perishable ingredients", () => {
    expect(() => validatePerishableShelfLife(true, null)).toThrow(
      BadRequestException,
    );
    expect(() => validatePerishableShelfLife(true, 7)).not.toThrow();
    expect(() => validatePerishableShelfLife(false, null)).not.toThrow();
  });

  it("keeps minimum, reorder, and par stock ordered", () => {
    expect(() => validateStockLevels(2, 4, 8)).not.toThrow();
    expect(() => validateStockLevels(4, 2, 8)).toThrow(BadRequestException);
    expect(() => validateStockLevels(2, 6, 4)).toThrow(BadRequestException);
  });
});
