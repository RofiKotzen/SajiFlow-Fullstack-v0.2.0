import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { CreateIngredientDto } from "./create-ingredient.dto";

const uuid = "17984092-158a-48ed-9401-2509de912765";
describe("CreateIngredientDto", () => {
  it("accepts valid ingredient and outlet settings", async () => {
    const dto = plainToInstance(CreateIngredientDto, {
      sku: "ING-TOMATO",
      name: "Tomat",
      baseUnitId: uuid,
      isPerishable: true,
      shelfLifeDays: 5,
      outletSettings: [
        { outletId: uuid, minimumStock: 2, reorderPoint: 4, parStock: 8 },
      ],
    });
    expect(await validate(dto)).toHaveLength(0);
  });
  it("rejects malformed identifiers and negative stock", async () => {
    const dto = plainToInstance(CreateIngredientDto, {
      sku: "?",
      name: "T",
      baseUnitId: "invalid",
      outletSettings: [{ outletId: "invalid", minimumStock: -1 }],
    });
    const errors = await validate(dto);
    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(["sku", "name", "baseUnitId", "outletSettings"]),
    );
  });
});
