import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { KdsQueueQueryDto, KdsTransitionDto } from "./kds.dto";

describe("KDS DTO", () => {
  it("validates queue scope, filters, and bounds", async () => {
    const dto = plainToInstance(KdsQueueQueryDto, {
      outletId: "11111111-1111-4111-8111-111111111111",
      status: "preparing",
      page: "2",
      limit: "100",
    });
    expect(await validate(dto)).toHaveLength(0);
    expect(dto.page).toBe(2);
    expect(dto.limit).toBe(100);
    const invalid = plainToInstance(KdsQueueQueryDto, {
      outletId: "bad",
      status: "completed",
      limit: 101,
    });
    expect((await validate(invalid)).map((error) => error.property)).toEqual(
      expect.arrayContaining(["outletId", "status", "limit"]),
    );
  });

  it("requires UUID-v4 idempotency and positive lock version", async () => {
    const valid = plainToInstance(KdsTransitionDto, {
      idempotencyKey: "22222222-2222-4222-8222-222222222222",
      lockVersion: 1,
    });
    expect(await validate(valid)).toHaveLength(0);
    const invalid = plainToInstance(KdsTransitionDto, {
      idempotencyKey: "bad",
      lockVersion: 0,
    });
    expect(await validate(invalid)).toHaveLength(2);
  });
});
