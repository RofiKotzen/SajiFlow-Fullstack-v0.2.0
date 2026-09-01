import {
  aggregateOrderStatus,
  assertOrderIdentity,
  calculatePayment,
  canEditOrder,
  canTransitionItem,
  canTransitionOrder,
  canVoidPaidOrder,
  itemStatusOnSubmit,
  formatMinor,
  multiplyMoney,
  parseDecimalToMinor,
  orderStatusAfterVoid,
  shouldConsumeRecipeItem,
} from "./pos-domain";

describe("POS Phase 1 domain rules", () => {
  const unpaid = {
    paymentStatus: "unpaid" as const,
    allItemsReadyOrCompleted: false,
  };

  it("allows only the approved order state machine", () => {
    expect(canTransitionOrder("draft", "submitted", unpaid)).toBe(true);
    expect(canTransitionOrder("submitted", "preparing", unpaid)).toBe(true);
    expect(
      canTransitionOrder("preparing", "ready", {
        ...unpaid,
        allItemsReadyOrCompleted: true,
      }),
    ).toBe(true);
    expect(
      canTransitionOrder("ready", "completed", {
        paymentStatus: "paid",
        allItemsReadyOrCompleted: true,
      }),
    ).toBe(true);
    expect(canTransitionOrder("draft", "completed", unpaid)).toBe(false);
    expect(canTransitionOrder("completed", "cancelled", unpaid)).toBe(false);
    expect(canTransitionOrder("cancelled", "submitted", unpaid)).toBe(false);
  });

  it("does not complete merely because payment is paid", () => {
    expect(
      canTransitionOrder("ready", "completed", {
        paymentStatus: "paid",
        allItemsReadyOrCompleted: false,
      }),
    ).toBe(false);
    expect(canEditOrder("submitted")).toBe(false);
    expect(canEditOrder("draft")).toBe(true);
  });

  it("keeps completed orders terminal while recording financial void separately", () => {
    expect(canVoidPaidOrder("completed", "paid")).toBe(true);
    expect(orderStatusAfterVoid("completed")).toBe("completed");
    expect(orderStatusAfterVoid("ready")).toBe("cancelled");
    expect(canVoidPaidOrder("cancelled", "paid")).toBe(false);
    expect(canVoidPaidOrder("ready", "unpaid")).toBe(false);
  });

  it("routes kitchen and non-kitchen items independently from Recipe", () => {
    expect(itemStatusOnSubmit(true)).toBe("queued");
    expect(itemStatusOnSubmit(false)).toBe("completed");
    expect(canTransitionItem("queued", "preparing", true)).toBe(true);
    expect(canTransitionItem("preparing", "ready", true)).toBe(true);
    expect(canTransitionItem("draft", "completed", false)).toBe(true);
    expect(canTransitionItem("draft", "queued", false)).toBe(false);
    expect(canTransitionItem("completed", "ready", true)).toBe(false);
  });

  it("aggregates kitchen state while ignoring completed non-kitchen items", () => {
    expect(
      aggregateOrderStatus("submitted", [
        { requiresKitchen: true, status: "queued" },
        { requiresKitchen: false, status: "completed" },
      ]),
    ).toBe("submitted");
    expect(
      aggregateOrderStatus("submitted", [
        { requiresKitchen: true, status: "preparing" },
      ]),
    ).toBe("preparing");
    expect(
      aggregateOrderStatus("preparing", [
        { requiresKitchen: true, status: "ready" },
      ]),
    ).toBe("ready");
    expect(aggregateOrderStatus("submitted", [])).toBe("ready");
  });

  it("requires a table only for dine-in", () => {
    expect(() => assertOrderIdentity("dine_in", "M4")).not.toThrow();
    expect(() => assertOrderIdentity("dine_in", " ")).toThrow();
    expect(() => assertOrderIdentity("takeaway", null)).not.toThrow();
    expect(() => assertOrderIdentity("takeaway", "M4")).toThrow();
  });

  it("calculates cash change and validates manual external payments", () => {
    expect(calculatePayment("38000", "cash", "50000")).toEqual({
      amountApplied: "38000.00",
      amountTendered: "50000.00",
      changeAmount: "12000.00",
    });
    expect(() => calculatePayment("38000", "cash", "30000")).toThrow();
    expect(calculatePayment("38000", "qris_manual", "38000", "QR-01")).toEqual({
      amountApplied: "38000.00",
      amountTendered: "38000.00",
      changeAmount: "0.00",
    });
    expect(() => calculatePayment("38000", "card_manual", "38000")).toThrow();
    expect(() =>
      calculatePayment("38000", "qris_manual", "40000", "QR-01"),
    ).toThrow();
    expect(() => calculatePayment("NaN", "cash", "50000")).toThrow();
    expect(() => calculatePayment("1.001", "cash", "50000")).toThrow();
  });

  it("skips optional Recipe items in Phase 1", () => {
    expect(shouldConsumeRecipeItem(false)).toBe(true);
    expect(shouldConsumeRecipeItem(true)).toBe(false);
  });

  it("calculates authoritative draft totals without floating point", () => {
    expect(formatMinor(multiplyMoney("1000000000000.25", 3))).toBe(
      "3000000000000.75",
    );
    const total =
      multiplyMoney("12500.10", 2) +
      multiplyMoney("7500.05", 3) +
      multiplyMoney("0.99", 1);
    expect(formatMinor(total)).toBe("47501.34");
    expect(parseDecimalToMinor("0.00")).toBe(0n);
    expect(() => parseDecimalToMinor("10.001")).toThrow();
  });
});
