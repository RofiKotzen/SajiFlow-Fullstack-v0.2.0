import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { CreateBudgetDto } from "./create-budget.dto";

describe("CreateBudgetDto", () => {
  const validPayload = {
    outletId: "39a0e536-c67c-4486-97bf-9fda63dd5676",
    name: "Anggaran Operasional September 2026",
    periodStart: "2026-09-01",
    periodEnd: "2026-09-30",
    lines: [
      {
        category: "purchase",
        description: "Pembelian bahan baku utama",
        plannedAmount: 15000000,
        warningThresholdPct: 80,
      },
    ],
  };

  it("menerima payload lengkap dengan nested budget lines", async () => {
    const dto = plainToInstance(CreateBudgetDto, validPayload);
    expect(await validate(dto)).toHaveLength(0);
  });

  it("menolak kategori yang tidak terdaftar", async () => {
    const dto = plainToInstance(CreateBudgetDto, {
      ...validPayload,
      lines: [{ ...validPayload.lines[0], category: "payroll" }],
    });
    const errors = await validate(dto);
    expect(
      errors.some(
        (error) => error.property === "lines" && error.children?.length,
      ),
    ).toBe(true);
  });

  it("menolak nominal negatif dan ambang di atas 100 persen", async () => {
    const dto = plainToInstance(CreateBudgetDto, {
      ...validPayload,
      lines: [
        {
          ...validPayload.lines[0],
          plannedAmount: -1,
          warningThresholdPct: 101,
        },
      ],
    });
    const errors = await validate(dto);
    expect(
      errors.some(
        (error) => error.property === "lines" && error.children?.length,
      ),
    ).toBe(true);
  });
});
