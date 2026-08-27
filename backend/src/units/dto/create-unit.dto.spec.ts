import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { CreateUnitDto } from "./create-unit.dto";

describe("CreateUnitDto", () => {
  it("accepts a valid unit", async () => {
    const dto = plainToInstance(CreateUnitDto, {
      code: "KG",
      name: "Kilogram",
      dimension: "mass",
      decimalScale: 3,
    });
    expect(await validate(dto)).toHaveLength(0);
  });
  it("rejects invalid dimension and precision", async () => {
    const dto = plainToInstance(CreateUnitDto, {
      code: "kg!",
      name: "K",
      dimension: "temperature",
      decimalScale: 9,
    });
    const fields = (await validate(dto)).map((error) => error.property);
    expect(fields).toEqual(
      expect.arrayContaining(["code", "name", "dimension", "decimalScale"]),
    );
  });
});
