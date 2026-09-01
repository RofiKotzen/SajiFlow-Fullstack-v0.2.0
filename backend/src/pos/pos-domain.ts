export const ORDER_TYPES = ["dine_in", "takeaway"] as const;
export type OrderType = (typeof ORDER_TYPES)[number];

export const ORDER_STATUSES = [
  "draft",
  "submitted",
  "preparing",
  "ready",
  "completed",
  "cancelled",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ITEM_STATUSES = [
  "draft",
  "queued",
  "preparing",
  "ready",
  "completed",
  "cancelled",
] as const;
export type ItemStatus = (typeof ITEM_STATUSES)[number];

export const PAYMENT_METHODS = [
  "cash",
  "qris_manual",
  "card_manual",
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export type PaymentStatus = "unpaid" | "paid" | "voided";

const orderTransitions: Record<OrderStatus, readonly OrderStatus[]> = {
  draft: ["submitted", "cancelled"],
  submitted: ["preparing", "ready", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

const kitchenItemTransitions: Record<ItemStatus, readonly ItemStatus[]> = {
  draft: ["queued", "cancelled"],
  queued: ["preparing", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

export function canTransitionOrder(
  from: OrderStatus,
  to: OrderStatus,
  context: {
    paymentStatus: PaymentStatus;
    allItemsReadyOrCompleted: boolean;
  },
): boolean {
  if (!orderTransitions[from].includes(to)) return false;
  if (to === "ready" && !context.allItemsReadyOrCompleted) return false;
  if (to === "completed")
    return (
      context.paymentStatus === "paid" && context.allItemsReadyOrCompleted
    );
  return true;
}

export function canEditOrder(status: OrderStatus): boolean {
  return status === "draft";
}

export function canVoidPaidOrder(
  status: OrderStatus,
  paymentStatus: PaymentStatus,
): boolean {
  return status !== "cancelled" && paymentStatus === "paid";
}

export function orderStatusAfterVoid(status: OrderStatus): OrderStatus {
  return status === "completed" ? "completed" : "cancelled";
}

export function itemStatusOnSubmit(requiresKitchen: boolean): ItemStatus {
  return requiresKitchen ? "queued" : "completed";
}

export function canTransitionItem(
  from: ItemStatus,
  to: ItemStatus,
  requiresKitchen: boolean,
): boolean {
  if (!requiresKitchen) return from === "draft" && to === "completed";
  return kitchenItemTransitions[from].includes(to);
}

export function aggregateOrderStatus(
  current: OrderStatus,
  items: ReadonlyArray<{ status: ItemStatus; requiresKitchen: boolean }>,
): OrderStatus {
  if (current === "draft" || current === "completed" || current === "cancelled")
    return current;
  const kitchen = items.filter((item) => item.requiresKitchen);
  if (!kitchen.length) return "ready";
  if (kitchen.every((item) => ["ready", "completed"].includes(item.status)))
    return "ready";
  if (kitchen.some((item) => item.status === "preparing")) return "preparing";
  return "submitted";
}

export function shouldConsumeRecipeItem(isOptional: boolean): boolean {
  return !isOptional;
}

export function assertOrderIdentity(
  orderType: OrderType,
  tableNumber?: string | null,
): void {
  const table = tableNumber?.trim();
  if (orderType === "dine_in" && !table)
    throw new Error("Nomor meja wajib untuk dine-in.");
  if (orderType === "takeaway" && table)
    throw new Error("Nomor meja tidak berlaku untuk takeaway.");
}

export interface PaymentCalculation {
  amountApplied: string;
  amountTendered: string;
  changeAmount: string;
}

export function calculatePayment(
  total: string,
  method: PaymentMethod,
  tendered: string,
  externalReference?: string | null,
): PaymentCalculation {
  const totalMinor = parseMoneyToMinor(total);
  const tenderedMinor = parseMoneyToMinor(tendered);
  if (method === "cash") {
    if (tenderedMinor < totalMinor)
      throw new Error("Uang tunai tidak mencukupi.");
    return {
      amountApplied: formatMinor(totalMinor),
      amountTendered: formatMinor(tenderedMinor),
      changeAmount: formatMinor(tenderedMinor - totalMinor),
    };
  }
  if (!externalReference?.trim())
    throw new Error("Reference pembayaran eksternal wajib diisi.");
  if (tenderedMinor !== totalMinor)
    throw new Error("Pembayaran eksternal harus sama dengan total.");
  return {
    amountApplied: formatMinor(totalMinor),
    amountTendered: formatMinor(tenderedMinor),
    changeAmount: "0.00",
  };
}

export function parseMoneyToMinor(value: string): bigint {
  if (!/^(?:0\.(?:0[1-9]|[1-9]\d?)|[1-9]\d*(?:\.\d{1,2})?)$/.test(value))
    throw new Error("Nilai uang harus positif dengan maksimal dua desimal.");
  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
}

function formatMinor(value: bigint): string {
  const whole = value / 100n;
  const fraction = (value % 100n).toString().padStart(2, "0");
  return `${whole}.${fraction}`;
}
