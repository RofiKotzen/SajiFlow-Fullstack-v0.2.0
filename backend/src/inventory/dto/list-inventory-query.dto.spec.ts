import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { ListInventoryQueryDto } from "./list-inventory-query.dto";
import { ListStockMovementsQueryDto } from "./list-stock-movements-query.dto";

describe("Inventory query DTO", () => {
  it("menerima filter inventory read-only yang valid", async () => {
    const dto = plainToInstance(ListInventoryQueryDto, {
      outletId: "11111111-1111-4111-8111-111111111111",
      status: "critical",
      expiryWithinDays: "7",
      search: "coffee",
    });
    expect(await validate(dto)).toHaveLength(0);
    expect(dto.expiryWithinDays).toBe(7);
  });

  it("menolak status dan jendela expiry yang tidak valid", async () => {
    const dto = plainToInstance(ListInventoryQueryDto, {
      status: "danger",
      expiryWithinDays: 999,
    });
    const errors = await validate(dto);
    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(["status", "expiryWithinDays"]),
    );
  });

  it("menolak tipe movement dan rentang tanggal berformat salah", async () => {
    const dto = plainToInstance(ListStockMovementsQueryDto, {
      movementType: "manual_edit",
      dateFrom: "27-08-2026",
    });
    const errors = await validate(dto);
    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(["movementType", "dateFrom"]),
    );
  });
});
