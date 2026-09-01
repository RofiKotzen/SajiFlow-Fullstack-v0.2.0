import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import {
  CreatePosOrderDto,
  PosReasonMutationDto,
  RecordPosPaymentDto,
  VoidPosOrderDto,
} from "./pos.dto";

const outletId = "11111111-1111-4111-8111-111111111111";
const variantId = "22222222-2222-4222-8222-222222222222";
const idempotencyKey = "33333333-3333-4333-8333-333333333333";

describe("POS DTO validation", () => {
  it("accepts dine-in with table and positive integer quantity", async () => {
    const dto = plainToInstance(CreatePosOrderDto, {
      outletId,
      orderType: "dine_in",
      tableNumber: "M4",
      idempotencyKey,
      items: [{ menuVariantId: variantId, quantity: 2 }],
    });
    expect(await validate(dto)).toHaveLength(0);
  });

  it("rejects dine-in without table and invalid order types", async () => {
    const missing = plainToInstance(CreatePosOrderDto, {
      outletId,
      orderType: "dine_in",
      idempotencyKey,
    });
    const invalid = plainToInstance(CreatePosOrderDto, {
      outletId,
      orderType: "delivery",
      idempotencyKey,
    });
    expect((await validate(missing)).map((error) => error.property)).toContain(
      "tableNumber",
    );
    expect((await validate(invalid)).map((error) => error.property)).toContain(
      "orderType",
    );
    const takeawayWithTable = plainToInstance(CreatePosOrderDto, {
      outletId,
      orderType: "takeaway",
      tableNumber: "M4",
      idempotencyKey,
    });
    expect(
      (await validate(takeawayWithTable)).map((error) => error.property),
    ).toContain("tableNumber");
  });

  it("rejects zero, fractional, and negative quantities", async () => {
    for (const quantity of [0, 1.5, -1]) {
      const dto = plainToInstance(CreatePosOrderDto, {
        outletId,
        orderType: "takeaway",
        idempotencyKey,
        items: [{ menuVariantId: variantId, quantity }],
      });
      expect((await validate(dto)).some((error) => error.property === "items"))
        .toBe(true);
    }
  });

  it("requires UUID v4 idempotency keys and positive lock versions", async () => {
    const dto = plainToInstance(RecordPosPaymentDto, {
      idempotencyKey: "not-a-uuid",
      lockVersion: 0,
      method: "cash",
      amountTendered: "50000.00",
    });
    expect((await validate(dto)).map((error) => error.property)).toEqual(
      expect.arrayContaining(["idempotencyKey", "lockVersion"]),
    );
  });

  it("validates payment method, money precision, and external reference", async () => {
    const valid = plainToInstance(RecordPosPaymentDto, {
      idempotencyKey,
      lockVersion: 1,
      method: "qris_manual",
      amountTendered: "38000.00",
      externalReference: "QRIS-01",
    });
    expect(await validate(valid)).toHaveLength(0);

    const invalid = plainToInstance(RecordPosPaymentDto, {
      idempotencyKey,
      lockVersion: 1,
      method: "qris_manual",
      amountTendered: "38000.001",
    });
    expect((await validate(invalid)).map((error) => error.property)).toEqual(
      expect.arrayContaining(["amountTendered", "externalReference"]),
    );
    const zero = plainToInstance(RecordPosPaymentDto, {
      idempotencyKey,
      lockVersion: 1,
      method: "cash",
      amountTendered: "0",
    });
    expect((await validate(zero)).map((error) => error.property)).toContain(
      "amountTendered",
    );
  });

  it("requires meaningful cancel/void reasons and refund reference", async () => {
    const cancel = plainToInstance(PosReasonMutationDto, {
      idempotencyKey,
      lockVersion: 1,
      reason: "x",
    });
    expect((await validate(cancel)).map((error) => error.property)).toContain(
      "reason",
    );
    const voidDto = plainToInstance(VoidPosOrderDto, {
      idempotencyKey,
      lockVersion: 1,
      reason: "Salah transaksi",
    });
    expect(await validate(voidDto)).toHaveLength(0);
  });
});
