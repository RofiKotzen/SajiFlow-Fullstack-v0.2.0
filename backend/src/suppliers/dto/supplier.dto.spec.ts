import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { CreateSupplierCatalogDto } from "./create-supplier-catalog.dto";
import { CreateSupplierDto } from "./create-supplier.dto";

const ingredientId = "17984092-158a-48ed-9401-2509de912765";
const unitId = "27984092-158a-48ed-9401-2509de912765";

describe("Supplier DTO", () => {
  it("accepts a supplier with nullable contact profile", async () => {
    const dto = plainToInstance(CreateSupplierDto, {
      code: "SUP-001",
      name: "Pangan Nusantara",
      paymentTermDays: 30,
      leadTimeDays: 2,
    });
    expect(await validate(dto)).toHaveLength(0);
  });

  it("rejects invalid code and contact fields", async () => {
    const dto = plainToInstance(CreateSupplierDto, {
      code: "kode supplier!",
      name: "A",
      email: "bukan-email",
      paymentTermDays: -1,
    });
    expect((await validate(dto)).map((error) => error.property)).toEqual(
      expect.arrayContaining(["code", "name", "email", "paymentTermDays"]),
    );
  });

  it("requires valid price, MOQ, and conversion for a catalog item", async () => {
    const valid = plainToInstance(CreateSupplierCatalogDto, {
      ingredientId,
      purchaseUnitId: unitId,
      lastPrice: 125000,
      minimumOrderQty: 5,
      conversionToBase: 10,
    });
    expect(await validate(valid)).toHaveLength(0);

    const invalid = plainToInstance(CreateSupplierCatalogDto, {
      ingredientId,
      purchaseUnitId: unitId,
      minimumOrderQty: 0,
      conversionToBase: 0,
    });
    expect((await validate(invalid)).map((error) => error.property)).toEqual(
      expect.arrayContaining([
        "lastPrice",
        "minimumOrderQty",
        "conversionToBase",
      ]),
    );
  });
});
