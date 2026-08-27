import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { CreateGoodsReceiptDto } from "./create-goods-receipt.dto";

const valid = {
  purchaseOrderId: "11111111-1111-4111-8111-111111111111",
  receivedAt: "2026-08-27T10:00:00.000Z",
  supplierDeliveryNo: "SJ-001",
  items: [
    {
      purchaseOrderItemId: "22222222-2222-4222-8222-222222222222",
      quantityReceived: 2.5,
      quantityRejected: 0,
      storageLocationId: "33333333-3333-4333-8333-333333333333",
      batchNo: "BATCH-01",
      expiryDate: "2026-09-10",
    },
  ],
};

describe("CreateGoodsReceiptDto", () => {
  it("menerima payload penerimaan yang valid", async () => {
    const errors = await validate(
      plainToInstance(CreateGoodsReceiptDto, valid),
    );
    expect(errors).toHaveLength(0);
  });

  it("menolak kuantitas diterima nol", async () => {
    const input = structuredClone(valid);
    input.items[0].quantityReceived = 0;
    const errors = await validate(
      plainToInstance(CreateGoodsReceiptDto, input),
    );
    expect(errors.length).toBeGreaterThan(0);
  });

  it("mewajibkan alasan ketika ada kuantitas ditolak", async () => {
    const input = structuredClone(valid) as typeof valid & {
      items: Array<(typeof valid.items)[number] & { rejectionReason?: string }>;
    };
    input.items[0].quantityRejected = 1;
    const errors = await validate(
      plainToInstance(CreateGoodsReceiptDto, input),
    );
    expect(errors.length).toBeGreaterThan(0);
  });
});
