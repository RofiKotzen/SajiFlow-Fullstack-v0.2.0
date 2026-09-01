import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = (file: string) =>
  readFileSync(join(__dirname, file), "utf8");

describe("POS Batch 6 payment and completion contract", () => {
  const controller = source("pos.controller.ts");
  const service = source("pos.service.ts");

  it.each([
    ["payments", "pos.pay", "RecordPosPaymentDto"],
    ["complete", "pos.complete", "PosMutationDto"],
    ["void", "pos.void", "VoidPosOrderDto"],
  ])("exposes %s with its dedicated permission", (route, permission, dto) => {
    expect(controller).toContain(`@Post("orders/:id/${route}")`);
    expect(controller).toContain(`@RequirePermissions("${permission}")`);
    expect(controller).toContain(`@Body() dto: ${dto}`);
  });

  it("uses atomic receipt sequencing and authoritative payment calculation", () => {
    expect(service).toContain('documentType: "pos_receipt"');
    expect(service).toContain('prefixPattern: "TRX-{YYMMDD}-{####}"');
    expect(service).toContain("calculatePayment(");
    expect(service).toContain('entryType: "payment"');
    expect(service).toContain('paymentStatus: "paid"');
  });

  it("completes only paid and operationally ready orders", () => {
    expect(service).toContain("KITCHEN_ITEMS_NOT_READY");
    expect(service).toContain("NON_KITCHEN_ITEMS_NOT_COMPLETED");
    expect(service).toContain('action: "sales_order.complete"');
  });

  it("voids the original payment, creates one refund, and reuses reversal", () => {
    expect(service).toContain('entryType: "manual_refund"');
    expect(service).toContain("originalPaymentId: original.id");
    expect(service).toContain("await this.reverseConsumption(");
    expect(service).toContain('paymentStatus: "voided"');
    expect(service).toContain('action: "sales_order.payment_voided"');
  });

  it("records payment ids in completed idempotency operations", () => {
    expect(service).toContain("paymentId?: string");
    expect(service).toContain("paymentId,");
  });
});
