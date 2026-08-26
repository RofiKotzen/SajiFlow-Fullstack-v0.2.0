import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { CreatePurchaseOrderDto } from "./create-purchase-order.dto";

describe("CreatePurchaseOrderDto", () => {
  const validPayload = {
    outletId: "39a0e536-c67c-4486-97bf-9fda63dd5676",
    supplierId: "17984092-158a-48ed-9401-2509de912765",
    orderDate: "2026-08-26",
    expectedDate: "2026-08-28",
    shippingAmount: 25000,
    notes: "Kirim sebelum pukul 10.00 WIB.",
    items: [
      {
        ingredientId: "c5b912b2-42d6-4bfc-8ef9-81055e52984f",
        purchaseUnitId: "615ac24c-a77a-45c3-a5c9-184154144359",
        quantityOrdered: 10,
        unitPrice: 90000,
        discountAmount: 10000,
        taxAmount: 9900,
      },
    ],
  };

  it("menerima payload PO lengkap beserta item", async () => {
    const dto = plainToInstance(CreatePurchaseOrderDto, validPayload);
    expect(await validate(dto)).toHaveLength(0);
  });

  it("menolak kuantitas negatif pada nested item", async () => {
    const dto = plainToInstance(CreatePurchaseOrderDto, {
      ...validPayload,
      items: [{ ...validPayload.items[0], quantityOrdered: -1 }],
    });
    const errors = await validate(dto);
    expect(
      errors.some(
        (error) => error.property === "items" && error.children?.length,
      ),
    ).toBe(true);
  });

  it("menolak UUID dan tanggal yang tidak valid", async () => {
    const dto = plainToInstance(CreatePurchaseOrderDto, {
      ...validPayload,
      supplierId: "bukan-uuid",
      orderDate: "26-08-2026",
    });
    const errors = await validate(dto);
    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(["supplierId", "orderDate"]),
    );
  });
});
