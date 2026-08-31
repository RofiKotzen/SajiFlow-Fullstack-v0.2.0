// ============================================================
// Saji Flow — mock data (frontend-only, tanpa backend)
// ============================================================

export const idr = (n: number) => "Rp " + Math.round(n).toLocaleString("id-ID");

// ---------- Permissions / RBAC ----------
export const ALL_PERMISSIONS = [
  "inventory.read", "budgets.read", "budgets.create", "budgets.update", "budgets.submit", "budgets.approve", "budgets.close",
  "purchase_orders.read", "purchase_orders.create", "purchase_orders.update", "purchase_orders.approve", "purchase_orders.send", "purchase_orders.cancel", "purchase_orders.close",
  "goods_receipts.read", "goods_receipts.create", "goods_receipts.update", "goods_receipts.post", "goods_receipts.void",
  "ingredients.read", "ingredients.create", "ingredients.update", "units.read", "units.create", "units.update",
  "suppliers.read", "suppliers.create", "suppliers.update", "suppliers.catalog.manage",
  "menus.read", "menus.create", "menus.update", "menus.prices",
  "recipes.read", "recipes.create", "recipes.update", "recipes.approve",
  "tenant.read", "tenant.update", "outlets.read", "outlets.create", "outlets.update",
  "users.read", "users.create", "users.update", "users.reset_password", "users.assign_roles",
  "roles.read", "roles.create", "roles.assign_permissions", "permissions.read",
] as const;
export type Permission = (typeof ALL_PERMISSIONS)[number];

export interface Role { code: string; name: string; system?: boolean | undefined; permissions: Permission[] }

export const ROLE_PRESETS: Role[] = [
  { code: "ADMIN", name: "Administrator", system: true, permissions: [...ALL_PERMISSIONS] },
  {
    code: "PURCHASING", name: "Manajer Beli",
    permissions: ["inventory.read", "budgets.read", "budgets.create", "budgets.update", "budgets.submit", "purchase_orders.read", "purchase_orders.create", "purchase_orders.update", "purchase_orders.send", "goods_receipts.read", "goods_receipts.create", "goods_receipts.update", "goods_receipts.post", "ingredients.read", "suppliers.read", "suppliers.update", "suppliers.catalog.manage", "menus.read", "recipes.read"],
  },
  {
    code: "KASIR", name: "Kasir",
    permissions: ["menus.read"],
  },
  {
    code: "KITCHEN", name: "Staf Dapur",
    permissions: ["recipes.read"],
  },
];

// ---------- Outlets ----------
export interface Outlet { code: string; name: string; address: string; timezone: string; active: boolean }
export const OUTLETS: Outlet[] = [
  { code: "KMG", name: "Cabang Kemang", address: "Jl. Kemang Raya No. 12, Jakarta Selatan", timezone: "Asia/Jakarta", active: true },
  { code: "MTG", name: "Menteng Flagship", address: "Jl. HOS Cokroaminoto No. 45, Jakarta Pusat", timezone: "Asia/Jakarta", active: true },
  { code: "TBT", name: "Tebet", address: "Jl. Tebet Timur Dalam II No. 8", timezone: "Asia/Jakarta", active: true },
  { code: "BKS", name: "Bekasi Selatan", address: "Jl. Pekayon Jaya No. 3, Bekasi", timezone: "Asia/Jakarta", active: false },
];

// ---------- Units ----------
export interface Unit { code: string; name: string; dimension: "mass" | "volume" | "count" | "length"; base: boolean; decimalScale: number; active: boolean }
export const UNITS: Unit[] = [
  { code: "G", name: "Gram", dimension: "mass", base: true, decimalScale: 2, active: true },
  { code: "KG", name: "Kilogram", dimension: "mass", base: false, decimalScale: 3, active: true },
  { code: "ML", name: "Mililiter", dimension: "volume", base: true, decimalScale: 2, active: true },
  { code: "L", name: "Liter", dimension: "volume", base: false, decimalScale: 3, active: true },
  { code: "PCS", name: "Pieces", dimension: "count", base: true, decimalScale: 0, active: true },
  { code: "PACK", name: "Pack", dimension: "count", base: false, decimalScale: 0, active: true },
  { code: "BTL", name: "Botol", dimension: "count", base: false, decimalScale: 0, active: false },
];

// ---------- Ingredients ----------
export type StockStatus = "out" | "critical" | "low" | "safe";
export interface Ingredient {
  sku: string; name: string; category: string; baseUnit: string; valuation: string;
  shelfLifeDays?: number | undefined; perishable: boolean; active: boolean;
  stock: number; minStock: number; reorderPoint: number; location: string; status: StockStatus;
  batches: { batch: string; qty: number; expiry: string }[];
}
export const INGREDIENTS: Ingredient[] = [
  { sku: "BHN-001", name: "Ayam Potong Segar", category: "Protein", baseUnit: "KG", valuation: "weighted_average", shelfLifeDays: 3, perishable: true, active: true, stock: 4.2, minStock: 8, reorderPoint: 10, location: "Chiller A", status: "critical", batches: [{ batch: "B-2605", qty: 4.2, expiry: "2026-08-31" }] },
  { sku: "BHN-002", name: "Beras Premium", category: "Karbo", baseUnit: "KG", valuation: "weighted_average", perishable: false, active: true, stock: 42, minStock: 30, reorderPoint: 50, location: "Gudang Kering", status: "low", batches: [{ batch: "B-2590", qty: 42, expiry: "2027-01-10" }] },
  { sku: "BHN-003", name: "Minyak Zaitun 500ml", category: "Minyak", baseUnit: "PCS", valuation: "weighted_average", shelfLifeDays: 180, perishable: false, active: true, stock: 12, minStock: 6, reorderPoint: 8, location: "Gudang Kering", status: "safe", batches: [{ batch: "B-2601", qty: 12, expiry: "2026-09-03" }] },
  { sku: "BHN-004", name: "Susu Segar", category: "Dairy", baseUnit: "L", valuation: "weighted_average", shelfLifeDays: 5, perishable: true, active: true, stock: 0, minStock: 10, reorderPoint: 12, location: "Chiller B", status: "out", batches: [] },
  { sku: "BHN-005", name: "Kopi Arabika Gayo", category: "Minuman", baseUnit: "KG", valuation: "weighted_average", perishable: false, active: true, stock: 18.5, minStock: 5, reorderPoint: 7, location: "Gudang Kering", status: "safe", batches: [{ batch: "B-2610", qty: 18.5, expiry: "2026-12-20" }] },
  { sku: "BHN-006", name: "Daging Sapi Tenderloin", category: "Protein", baseUnit: "KG", valuation: "weighted_average", shelfLifeDays: 4, perishable: true, active: true, stock: 6.8, minStock: 5, reorderPoint: 8, location: "Freezer 1", status: "low", batches: [{ batch: "B-2607", qty: 6.8, expiry: "2026-09-01" }] },
  { sku: "BHN-007", name: "Gula Pasir", category: "Bumbu", baseUnit: "KG", valuation: "weighted_average", perishable: false, active: true, stock: 25, minStock: 10, reorderPoint: 15, location: "Gudang Kering", status: "safe", batches: [{ batch: "B-2580", qty: 25, expiry: "2027-06-01" }] },
  { sku: "BHN-008", name: "Telur Ayam", category: "Protein", baseUnit: "KG", valuation: "weighted_average", shelfLifeDays: 7, perishable: true, active: true, stock: 3.1, minStock: 6, reorderPoint: 9, location: "Chiller A", status: "critical", batches: [{ batch: "B-2611", qty: 3.1, expiry: "2026-09-05" }] },
  { sku: "BHN-009", name: "Tepung Terigu", category: "Karbo", baseUnit: "KG", valuation: "weighted_average", perishable: false, active: false, stock: 15, minStock: 10, reorderPoint: 12, location: "Gudang Kering", status: "safe", batches: [{ batch: "B-2570", qty: 15, expiry: "2026-11-30" }] },
  { sku: "BHN-010", name: "Keju Mozzarella", category: "Dairy", baseUnit: "KG", valuation: "weighted_average", shelfLifeDays: 14, perishable: true, active: true, stock: 9.4, minStock: 4, reorderPoint: 6, location: "Chiller B", status: "safe", batches: [{ batch: "B-2609", qty: 9.4, expiry: "2026-09-12" }] },
];

// ---------- Suppliers ----------
export interface Supplier {
  code: string; name: string; npwp?: string | undefined; contact?: string | undefined; phone?: string | undefined; email?: string | undefined;
  termsDays: number; leadTimeDays: number; address?: string | undefined; active: boolean; perf: number;
}
export const SUPPLIERS: Supplier[] = [
  { code: "SUP-01", name: "PT Agromandiri", npwp: "01.234.567.8-901.000", contact: "Budi Santoso", phone: "0812-9000-1122", email: "sales@agromandiri.co.id", termsDays: 30, leadTimeDays: 2, address: "Jl. Raya Cikarang KM 21", active: true, perf: 98 },
  { code: "SUP-02", name: "CV Sabun & Sapa", contact: "Sari Dewi", phone: "0813-4400-7788", email: "order@sabunsapa.id", termsDays: 14, leadTimeDays: 3, address: "Jl. Pancoran Barat IV No. 9", active: true, perf: 81 },
  { code: "SUP-03", name: "UD Berkah Tani", contact: "H. Mahmud", phone: "0811-2233-4455", termsDays: 7, leadTimeDays: 1, address: "Pasar Induk Cibitung Blok C2", active: true, perf: 94 },
  { code: "SUP-04", name: "PT Nusantara Rasa", npwp: "02.111.222.3-444.000", contact: "Linda Kusuma", phone: "0812-7700-9900", email: "cs@nusantara-rasa.com", termsDays: 30, leadTimeDays: 4, address: "Kawasan Industri MM2100", active: true, perf: 96 },
  { code: "SUP-05", name: "PT Jati Makmur", contact: "Agus Wijaya", phone: "0856-1122-3344", termsDays: 21, leadTimeDays: 5, address: "Jl. Daan Mogot KM 19", active: false, perf: 72 },
];

export interface CatalogItem {
  supplierCode: string; ingredientSku: string; purchaseUnit: string; supplierSku?: string | undefined;
  price: number; conversion: number; moq: number; preferred: boolean; active: boolean;
}
export const SUPPLIER_CATALOG: CatalogItem[] = [
  { supplierCode: "SUP-01", ingredientSku: "BHN-001", purchaseUnit: "KG", supplierSku: "AGR-CHK-01", price: 42000, conversion: 1, moq: 10, preferred: true, active: true },
  { supplierCode: "SUP-01", ingredientSku: "BHN-006", purchaseUnit: "KG", price: 135000, conversion: 1, moq: 5, preferred: true, active: true },
  { supplierCode: "SUP-03", ingredientSku: "BHN-002", purchaseUnit: "KG", price: 12500, conversion: 1, moq: 25, preferred: true, active: true },
  { supplierCode: "SUP-03", ingredientSku: "BHN-008", purchaseUnit: "KG", price: 28000, conversion: 1, moq: 5, preferred: false, active: true },
  { supplierCode: "SUP-04", ingredientSku: "BHN-003", purchaseUnit: "PCS", supplierSku: "NRA-OLV-500", price: 68500, conversion: 1, moq: 6, preferred: true, active: true },
  { supplierCode: "SUP-04", ingredientSku: "BHN-005", purchaseUnit: "KG", price: 145000, conversion: 1, moq: 2, preferred: true, active: true },
  { supplierCode: "SUP-02", ingredientSku: "BHN-010", purchaseUnit: "KG", price: 98000, conversion: 1, moq: 3, preferred: false, active: true },
];

// ---------- Purchase Orders ----------
export type POStatus = "draft" | "approved" | "sent" | "partially_received" | "received" | "closed" | "cancelled";
export interface POItem { sku: string; qty: number; price: number; receivedQty?: number }
export interface PurchaseOrder {
  no: string; supplierCode: string; outlet: string; date: string; expected: string; ref?: string | undefined;
  status: POStatus; items: POItem[]; taxRate: number; otherCost: number; note?: string | undefined;
  history: { at: string; by: string; action: string }[];
}
export const poTotals = (po: PurchaseOrder) => {
  const subtotal = po.items.reduce((s, i) => s + i.qty * i.price, 0);
  const tax = subtotal * (po.taxRate / 100);
  return { subtotal, tax, total: subtotal + tax + po.otherCost };
};
export const PURCHASE_ORDERS: PurchaseOrder[] = [
  { no: "PO-2026-0514", supplierCode: "SUP-01", outlet: "KMG", date: "2026-08-14", expected: "2026-08-16", status: "received", items: [{ sku: "BHN-001", qty: 20, price: 42000, receivedQty: 20 }, { sku: "BHN-006", qty: 10, price: 135000, receivedQty: 10 }], taxRate: 11, otherCost: 25000, history: [{ at: "2026-08-14 09:12", by: "Raka Aditya", action: "Dibuat" }, { at: "2026-08-14 10:03", by: "Dewi Anjani", action: "Disetujui" }, { at: "2026-08-16 08:40", by: "Raka Aditya", action: "Diterima penuh" }] },
  { no: "PO-2026-0513", supplierCode: "SUP-02", outlet: "KMG", date: "2026-08-13", expected: "2026-08-15", status: "sent", items: [{ sku: "BHN-010", qty: 5, price: 98000 }], taxRate: 11, otherCost: 0, note: "Kirim sebelum Jumat", history: [{ at: "2026-08-13 14:20", by: "Raka Aditya", action: "Dibuat" }, { at: "2026-08-13 15:00", by: "Dewi Anjani", action: "Dikirim ke supplier" }] },
  { no: "PO-2026-0512", supplierCode: "SUP-03", outlet: "MTG", date: "2026-08-12", expected: "2026-08-14", status: "partially_received", items: [{ sku: "BHN-002", qty: 100, price: 12500, receivedQty: 60 }, { sku: "BHN-008", qty: 10, price: 28000, receivedQty: 10 }], taxRate: 0, otherCost: 15000, history: [{ at: "2026-08-12 08:05", by: "Dewi Anjani", action: "Dibuat" }, { at: "2026-08-14 07:30", by: "Dewi Anjani", action: "Diterima sebagian" }] },
  { no: "PO-2026-0511", supplierCode: "SUP-04", outlet: "KMG", date: "2026-08-11", expected: "2026-08-15", status: "approved", items: [{ sku: "BHN-003", qty: 24, price: 68500 }, { sku: "BHN-005", qty: 4, price: 145000 }], taxRate: 11, otherCost: 0, history: [{ at: "2026-08-11 11:44", by: "Raka Aditya", action: "Dibuat" }, { at: "2026-08-11 13:10", by: "Owner", action: "Disetujui" }] },
  { no: "PO-2026-0510", supplierCode: "SUP-02", outlet: "TBT", date: "2026-08-10", expected: "2026-08-13", status: "draft", items: [{ sku: "BHN-010", qty: 8, price: 98000 }], taxRate: 11, otherCost: 0, history: [{ at: "2026-08-10 16:22", by: "Dewi Anjani", action: "Dibuat" }] },
  { no: "PO-2026-0509", supplierCode: "SUP-01", outlet: "MTG", date: "2026-08-08", expected: "2026-08-10", status: "closed", items: [{ sku: "BHN-006", qty: 15, price: 135000, receivedQty: 15 }], taxRate: 11, otherCost: 0, history: [{ at: "2026-08-08 09:00", by: "Raka Aditya", action: "Dibuat" }, { at: "2026-08-12 10:00", by: "Raka Aditya", action: "Ditutup" }] },
];

// ---------- Goods Receipts ----------
export type GRStatus = "draft" | "posted" | "void";
export interface GRItem { sku: string; received: number; rejected: number; unit: string; location: string; batch?: string | undefined; expiry?: string | undefined; rejectReason?: string }
export interface GoodsReceipt {
  no: string; poNo: string; supplierCode: string; outlet: string; receivedAt: string; deliveryNote?: string | undefined;
  status: GRStatus; items: GRItem[]; note?: string | undefined; voidReason?: string | undefined;
  history: { at: string; by: string; action: string }[];
}
export const GOODS_RECEIPTS: GoodsReceipt[] = [
  { no: "GR-2026-0211", poNo: "PO-2026-0514", supplierCode: "SUP-01", outlet: "KMG", receivedAt: "2026-08-16 08:40", deliveryNote: "SJ-8842", status: "posted", items: [{ sku: "BHN-001", received: 20, rejected: 0, unit: "KG", location: "Chiller A", batch: "B-2605", expiry: "2026-08-31" }, { sku: "BHN-006", received: 10, rejected: 0, unit: "KG", location: "Freezer 1", batch: "B-2607", expiry: "2026-09-01" }], history: [{ at: "2026-08-16 08:40", by: "Raka Aditya", action: "Dibuat" }, { at: "2026-08-16 08:55", by: "Raka Aditya", action: "Diposting ke inventory" }] },
  { no: "GR-2026-0210", poNo: "PO-2026-0512", supplierCode: "SUP-03", outlet: "MTG", receivedAt: "2026-08-14 07:30", status: "posted", items: [{ sku: "BHN-002", received: 60, rejected: 0, unit: "KG", location: "Gudang Kering", batch: "B-2590" }, { sku: "BHN-008", received: 9, rejected: 1, unit: "KG", location: "Chiller A", rejectReason: "Kemasan rusak" }], history: [{ at: "2026-08-14 07:30", by: "Dewi Anjani", action: "Dibuat" }, { at: "2026-08-14 07:41", by: "Dewi Anjani", action: "Diposting ke inventory" }] },
  { no: "GR-2026-0209", poNo: "PO-2026-0509", supplierCode: "SUP-01", outlet: "MTG", receivedAt: "2026-08-10 09:10", status: "void", voidReason: "Double input, PO sudah ditutup", items: [{ sku: "BHN-006", received: 15, rejected: 0, unit: "KG", location: "Freezer 1" }], history: [{ at: "2026-08-10 09:10", by: "Raka Aditya", action: "Dibuat" }, { at: "2026-08-11 10:00", by: "Raka Aditya", action: "Void (reversal)" }] },
  { no: "GR-2026-0212", poNo: "PO-2026-0512", supplierCode: "SUP-03", outlet: "MTG", receivedAt: "2026-08-29 09:05", status: "draft", items: [{ sku: "BHN-002", received: 40, rejected: 0, unit: "KG", location: "Gudang Kering" }], history: [{ at: "2026-08-29 09:05", by: "Dewi Anjani", action: "Dibuat" }] },
];

// ---------- Inventory movements ----------
export interface Movement { no: string; date: string; sku: string; type: "purchase" | "usage" | "waste" | "adjustment" | "reversal"; qty: number; ref: string; status: "posted" | "reversed" }
export const MOVEMENTS: Movement[] = [
  { no: "MV-8811", date: "2026-08-16 08:55", sku: "BHN-001", type: "purchase", qty: 20, ref: "GR-2026-0211", status: "posted" },
  { no: "MV-8812", date: "2026-08-16 08:55", sku: "BHN-006", type: "purchase", qty: 10, ref: "GR-2026-0211", status: "posted" },
  { no: "MV-8805", date: "2026-08-14 07:41", sku: "BHN-002", type: "purchase", qty: 60, ref: "GR-2026-0210", status: "posted" },
  { no: "MV-8806", date: "2026-08-14 07:41", sku: "BHN-008", type: "purchase", qty: 9, ref: "GR-2026-0210", status: "posted" },
  { no: "MV-8807", date: "2026-08-14 07:41", sku: "BHN-008", type: "waste", qty: -1, ref: "GR-2026-0210", status: "posted" },
  { no: "MV-8790", date: "2026-08-11 10:00", sku: "BHN-006", type: "reversal", qty: -15, ref: "GR-2026-0209", status: "reversed" },
  { no: "MV-8801", date: "2026-08-15 21:10", sku: "BHN-004", type: "usage", qty: -8.5, ref: "POS-Shift-112", status: "posted" },
  { no: "MV-8802", date: "2026-08-15 21:10", sku: "BHN-001", type: "usage", qty: -12.3, ref: "POS-Shift-112", status: "posted" },
  { no: "MV-8815", date: "2026-08-18 06:30", sku: "BHN-010", type: "adjustment", qty: 0.4, ref: "Opname-08", status: "posted" },
];

// ---------- Budgets ----------
export type BudgetStatus = "draft" | "submitted" | "approved" | "rejected" | "closed";
export interface BudgetLine { category: "purchase" | "operational" | "maintenance" | "marketing" | "other"; desc: string; planned: number; realized: number; threshold: number }
export interface Budget {
  id: string; name: string; outlet: string; period: string; status: BudgetStatus; note?: string | undefined;
  lines: BudgetLine[]; history: { at: string; by: string; action: string }[];
}
export const BUDGETS: Budget[] = [
  {
    id: "BDG-2026-08-KMG", name: "Anggaran Agustus — Kemang", outlet: "KMG", period: "2026-08", status: "approved", note: "Prioritas restok protein",
    lines: [
      { category: "purchase", desc: "Pembelian bahan baku", planned: 95000000, realized: 62400000, threshold: 80 },
      { category: "operational", desc: "Operasional harian", planned: 12000000, realized: 9800000, threshold: 90 },
      { category: "maintenance", desc: "Perawatan peralatan", planned: 5000000, realized: 1100000, threshold: 85 },
      { category: "marketing", desc: "Promo bulanan", planned: 8000000, realized: 8200000, threshold: 80 },
    ],
    history: [{ at: "2026-07-28 10:00", by: "Raka Aditya", action: "Dibuat" }, { at: "2026-07-29 09:15", by: "Raka Aditya", action: "Diajukan" }, { at: "2026-07-30 14:00", by: "Owner", action: "Disetujui" }],
  },
  {
    id: "BDG-2026-09-MTG", name: "Anggaran September — Menteng", outlet: "MTG", period: "2026-09", status: "draft",
    lines: [{ category: "purchase", desc: "Pembelian bahan baku", planned: 110000000, realized: 0, threshold: 80 }],
    history: [{ at: "2026-08-27 11:00", by: "Dewi Anjani", action: "Dibuat" }],
  },
  {
    id: "BDG-2026-07-TBT", name: "Anggaran Juli — Tebet", outlet: "TBT", period: "2026-07", status: "closed",
    lines: [{ category: "purchase", desc: "Pembelian bahan baku", planned: 60000000, realized: 58400000, threshold: 85 }],
    history: [{ at: "2026-06-25 09:00", by: "Dewi Anjani", action: "Dibuat" }, { at: "2026-08-01 10:00", by: "Owner", action: "Ditutup" }],
  },
];

// ---------- Menu & Produk ----------
export interface MenuVariant { sku: string; name: string; price: number; displayOrder: number; isDefault: boolean; requiresRecipe: boolean; active: boolean; availability: Record<string, boolean>; overrides: Record<string, number | undefined> }
export interface MenuProduct { code: string; name: string; category: string; desc?: string | undefined; active: boolean; lockVersion: number; variants: MenuVariant[] }
export const MENU_CATEGORIES = [
  { code: "MKNN", name: "Makanan", order: 1, active: true },
  { code: "MNMN", name: "Minuman", order: 2, active: true },
  { code: "DSRT", name: "Dessert", order: 3, active: true },
];
export const MENUS: MenuProduct[] = [
  { code: "NAS-AYM", name: "Nasi Ayam Bakar", category: "MKNN", desc: "Ayam bakar madu + nasi + lalapan", active: true, lockVersion: 3, variants: [{ sku: "NAS-AYM-REG", name: "Regular", price: 38000, displayOrder: 1, isDefault: true, requiresRecipe: true, active: true, availability: { KMG: true, MTG: true, TBT: true }, overrides: { MTG: 42000 } }, { sku: "NAS-AYM-JMB", name: "Jumbo", price: 48000, displayOrder: 2, isDefault: false, requiresRecipe: true, active: true, availability: { KMG: true, MTG: false, TBT: true }, overrides: {} }] },
  { code: "KP-SGR", name: "Kopi Susu Gula Aren", category: "MNMN", active: true, lockVersion: 5, variants: [{ sku: "KP-SGR-REG", name: "Regular", price: 24000, displayOrder: 1, isDefault: true, requiresRecipe: true, active: true, availability: { KMG: true, MTG: true, TBT: true }, overrides: {} }, { sku: "KP-SGR-LRG", name: "Large", price: 29000, displayOrder: 2, isDefault: false, requiresRecipe: true, active: true, availability: { KMG: true, MTG: true, TBT: false }, overrides: {} }] },
  { code: "STK-TLN", name: "Steak Tenderloin", category: "MKNN", desc: "Tenderloin 200g, saus mushroom", active: true, lockVersion: 2, variants: [{ sku: "STK-TLN-200", name: "200 gram", price: 128000, displayOrder: 1, isDefault: true, requiresRecipe: true, active: true, availability: { KMG: true, MTG: true, TBT: false }, overrides: {} }] },
  { code: "PZA-MZG", name: "Pizza Mozzarella", category: "MKNN", active: true, lockVersion: 1, variants: [{ sku: "PZA-MZG-REG", name: "Regular", price: 78000, displayOrder: 1, isDefault: true, requiresRecipe: true, active: true, availability: { KMG: true, MTG: true, TBT: true }, overrides: {} }] },
  { code: "MLK-TRO", name: "Milkshake Taro", category: "MNMN", active: false, lockVersion: 1, variants: [{ sku: "MLK-TRO-REG", name: "Regular", price: 26000, displayOrder: 1, isDefault: true, requiresRecipe: false, active: false, availability: { KMG: false, MTG: false, TBT: false }, overrides: {} }] },
];

// ---------- Recipes ----------
export type RecipeStatus = "draft" | "approved" | "archived";
export interface RecipeItem { sku: string; unit: string; qty: number; waste: number }
export interface Recipe {
  code: string; name: string; outlet: string; menuVariant: string; status: RecipeStatus;
  yieldQty: number; sellingPrice: number; items: RecipeItem[]; note?: string | undefined;
}
export const RECIPES: Recipe[] = [
  { code: "RCP-001", name: "Resep Nasi Ayam Bakar Regular", outlet: "KMG", menuVariant: "NAS-AYM-REG", status: "approved", yieldQty: 1, sellingPrice: 38000, items: [{ sku: "BHN-001", unit: "G", qty: 180, waste: 5 }, { sku: "BHN-002", unit: "G", qty: 150, waste: 0 }, { sku: "BHN-007", unit: "G", qty: 12, waste: 0 }] },
  { code: "RCP-002", name: "Resep Kopi Susu Gula Aren", outlet: "KMG", menuVariant: "KP-SGR-REG", status: "approved", yieldQty: 1, sellingPrice: 24000, items: [{ sku: "BHN-005", unit: "G", qty: 18, waste: 2 }, { sku: "BHN-004", unit: "ML", qty: 120, waste: 3 }, { sku: "BHN-007", unit: "G", qty: 20, waste: 0 }] },
  { code: "RCP-003", name: "Resep Steak Tenderloin 200g", outlet: "KMG", menuVariant: "STK-TLN-200", status: "draft", yieldQty: 1, sellingPrice: 128000, items: [{ sku: "BHN-006", unit: "G", qty: 210, waste: 4 }], note: "Saus mushroom dihitung terpisah" },
  { code: "RCP-004", name: "Resep Pizza Mozzarella", outlet: "MTG", menuVariant: "PZA-MZG-REG", status: "archived", yieldQty: 1, sellingPrice: 78000, items: [{ sku: "BHN-009", unit: "G", qty: 180, waste: 5 }, { sku: "BHN-010", unit: "G", qty: 90, waste: 0 }] },
];

// ---------- POS ----------
export interface PosMenuItem { sku: string; name: string; category: string; price: number }
export const POS_MENU: PosMenuItem[] = [
  { sku: "NAS-AYM-REG", name: "Nasi Ayam Bakar", category: "Makanan", price: 38000 },
  { sku: "NAS-AYM-JMB", name: "Nasi Ayam Bakar Jumbo", category: "Makanan", price: 48000 },
  { sku: "STK-TLN-200", name: "Steak Tenderloin", category: "Makanan", price: 128000 },
  { sku: "PZA-MZG-REG", name: "Pizza Mozzarella", category: "Makanan", price: 78000 },
  { sku: "KP-SGR-REG", name: "Kopi Susu Gula Aren", category: "Minuman", price: 24000 },
  { sku: "KP-SGR-LRG", name: "Kopi Susu Gula Aren Large", category: "Minuman", price: 29000 },
  { sku: "JUS-ALP", name: "Jus Alpukat", category: "Minuman", price: 22000 },
  { sku: "THT-ICE", name: "Es Teh Tarik", category: "Minuman", price: 15000 },
  { sku: "TIR-CLP", name: "Tiramisu Cup", category: "Dessert", price: 35000 },
  { sku: "CHZ-CKE", name: "Basque Cheesecake", category: "Dessert", price: 42000 },
];
export const POS_TAX_RATE = 10;
export const POS_SERVICE_RATE = 5;
export const POS_PROMO_RATE = 10;

export interface PosTransaction { no: string; time: string; type: string; table?: string | undefined; customer?: string | undefined; items: { name: string; qty: number; price: number }[]; total: number; method: string; status: "paid" | "void" }
export const POS_TRANSACTIONS: PosTransaction[] = [
  { no: "TRX-0912", time: "2026-08-29 12:42", type: "Dine-in", table: "M4", customer: "Bu Ratna", items: [{ name: "Nasi Ayam Bakar", qty: 2, price: 38000 }, { name: "Kopi Susu Gula Aren", qty: 2, price: 24000 }], total: 143000, method: "QRIS", status: "paid" },
  { no: "TRX-0911", time: "2026-08-29 12:15", type: "Takeaway", items: [{ name: "Steak Tenderloin", qty: 1, price: 128000 }], total: 147200, method: "Kartu", status: "paid" },
  { no: "TRX-0910", time: "2026-08-29 11:50", type: "Dine-in", table: "M2", items: [{ name: "Pizza Mozzarella", qty: 1, price: 78000 }, { name: "Es Teh Tarik", qty: 2, price: 15000 }], total: 124200, method: "Tunai", status: "paid" },
  { no: "TRX-0909", time: "2026-08-29 11:20", type: "Delivery", customer: "GoFood #4471", items: [{ name: "Nasi Ayam Bakar Jumbo", qty: 3, price: 48000 }], total: 165600, method: "QRIS", status: "paid" },
  { no: "TRX-0908", time: "2026-08-29 10:45", type: "Dine-in", table: "M1", items: [{ name: "Jus Alpukat", qty: 1, price: 22000 }], total: 25300, method: "Tunai", status: "void" },
];

export interface ActiveOrder { no: string; type: string; table?: string | undefined; items: number; total: number; status: "baru" | "diproses" | "siap" | "selesai"; since: string }
export const ACTIVE_ORDERS: ActiveOrder[] = [
  { no: "ORD-0451", type: "Dine-in", table: "M4", items: 4, total: 143000, status: "diproses", since: "12:42" },
  { no: "ORD-0452", type: "Dine-in", table: "M7", items: 2, total: 58000, status: "baru", since: "12:51" },
  { no: "ORD-0453", type: "Takeaway", items: 1, total: 35000, status: "baru", since: "12:54" },
  { no: "ORD-0450", type: "Dine-in", table: "M2", items: 3, total: 124200, status: "siap", since: "12:10" },
];

// ---------- KDS ----------
export type KdsStatus = "baru" | "diproses" | "siap";
export type KdsUrgency = "normal" | "warning" | "overdue" | "rush";
export interface KdsTicket { id: string; orderNo: string; type: string; table?: string | undefined; station: string; elapsedMin: number; urgency: KdsUrgency; priority: boolean; status: KdsStatus; items: { qty: number; name: string; note?: string }[] }
export const KDS_TICKETS: KdsTicket[] = [
  { id: "T-101", orderNo: "ORD-0452", type: "Dine-in", table: "M7", station: "Grill", elapsedMin: 6, urgency: "normal", priority: false, status: "baru", items: [{ qty: 2, name: "Nasi Ayam Bakar", note: "Level pedas 2" }] },
  { id: "T-102", orderNo: "ORD-0453", type: "Takeaway", station: "Hot Kitchen", elapsedMin: 3, urgency: "normal", priority: true, status: "baru", items: [{ qty: 1, name: "Tiramisu Cup" }] },
  { id: "T-103", orderNo: "ORD-0451", type: "Dine-in", table: "M4", station: "Grill", elapsedMin: 14, urgency: "warning", priority: false, status: "diproses", items: [{ qty: 2, name: "Nasi Ayam Bakar" }, { qty: 2, name: "Kopi Susu Gula Aren", note: "Less sugar 1x" }] },
  { id: "T-104", orderNo: "ORD-0449", type: "Delivery", station: "Hot Kitchen", elapsedMin: 22, urgency: "overdue", priority: true, status: "diproses", items: [{ qty: 3, name: "Nasi Ayam Bakar Jumbo" }] },
  { id: "T-105", orderNo: "ORD-0450", type: "Dine-in", table: "M2", station: "Cold / Dessert", elapsedMin: 31, urgency: "overdue", priority: false, status: "siap", items: [{ qty: 1, name: "Pizza Mozzarella" }, { qty: 2, name: "Es Teh Tarik" }] },
  { id: "T-106", orderNo: "ORD-0448", type: "Dine-in", table: "M9", station: "Cold / Dessert", elapsedMin: 11, urgency: "rush", priority: true, status: "baru", items: [{ qty: 1, name: "Basque Cheesecake", note: "Tanpa garnish" }, { qty: 1, name: "Jus Alpukat" }] },
];
export const KDS_STATIONS = ["Semua", "Grill", "Hot Kitchen", "Cold / Dessert"];

// ---------- Settings ----------
export interface UserAccount { id: string; name: string; email: string; employeeCode?: string | undefined; phone?: string | undefined; status: "active" | "suspended"; role: string; outletScope?: string | undefined }
export const USERS: UserAccount[] = [
  { id: "USR-01", name: "Raka Aditya", email: "raka@sajiflow.id", employeeCode: "EMP-001", phone: "0812-1100-2233", status: "active", role: "ADMIN" },
  { id: "USR-02", name: "Dewi Anjani", email: "dewi@sajiflow.id", employeeCode: "EMP-002", status: "active", role: "PURCHASING", outletScope: "MTG" },
  { id: "USR-03", name: "Bima Pratama", email: "bima@sajiflow.id", status: "active", role: "KASIR", outletScope: "KMG" },
  { id: "USR-04", name: "Sinta Maharani", email: "sinta@sajiflow.id", status: "suspended", role: "KITCHEN", outletScope: "KMG" },
];

export const TENANT = { code: "SAJIFLOW", name: "Saji Nusantara Group", timezone: "Asia/Jakarta", currency: "IDR", status: "active" as const };

export const PERMISSION_MODULES: { module: string; items: { code: string; desc: string }[] }[] = [
  { module: "inventory", items: [{ code: "inventory.read", desc: "Melihat saldo dan pergerakan stok" }] },
  { module: "budgets", items: [{ code: "budgets.read", desc: "Melihat anggaran" }, { code: "budgets.create", desc: "Membuat anggaran" }, { code: "budgets.update", desc: "Mengubah anggaran" }, { code: "budgets.submit", desc: "Mengajukan anggaran" }, { code: "budgets.approve", desc: "Menyetujui anggaran" }, { code: "budgets.close", desc: "Menutup anggaran" }] },
  { module: "purchase_orders", items: [{ code: "purchase_orders.read", desc: "Melihat PO" }, { code: "purchase_orders.create", desc: "Membuat PO" }, { code: "purchase_orders.update", desc: "Mengubah draft PO" }, { code: "purchase_orders.approve", desc: "Menyetujui PO" }, { code: "purchase_orders.send", desc: "Mengirim PO ke supplier" }, { code: "purchase_orders.cancel", desc: "Membatalkan PO" }, { code: "purchase_orders.close", desc: "Menutup PO" }] },
  { module: "goods_receipts", items: [{ code: "goods_receipts.read", desc: "Melihat penerimaan" }, { code: "goods_receipts.create", desc: "Membuat penerimaan" }, { code: "goods_receipts.update", desc: "Mengubah draft penerimaan" }, { code: "goods_receipts.post", desc: "Posting ke inventory" }, { code: "goods_receipts.void", desc: "Void penerimaan" }] },
  { module: "masters", items: [{ code: "ingredients.read", desc: "Melihat bahan" }, { code: "ingredients.create", desc: "Menambah bahan" }, { code: "ingredients.update", desc: "Mengubah/mengarsipkan bahan" }, { code: "units.read", desc: "Melihat satuan" }, { code: "units.create", desc: "Menambah satuan" }, { code: "units.update", desc: "Mengubah satuan" }] },
  { module: "suppliers", items: [{ code: "suppliers.read", desc: "Melihat supplier" }, { code: "suppliers.create", desc: "Menambah supplier" }, { code: "suppliers.update", desc: "Mengubah supplier" }, { code: "suppliers.catalog.manage", desc: "Mengelola katalog supplier" }] },
  { module: "menus", items: [{ code: "menus.read", desc: "Melihat menu" }, { code: "menus.create", desc: "Menambah menu" }, { code: "menus.update", desc: "Mengubah menu" }, { code: "menus.prices", desc: "Melihat & mengatur harga" }] },
  { module: "recipes", items: [{ code: "recipes.read", desc: "Melihat resep" }, { code: "recipes.create", desc: "Membuat resep" }, { code: "recipes.update", desc: "Mengubah resep" }, { code: "recipes.approve", desc: "Menyetujui resep" }] },
  { module: "sistem", items: [{ code: "tenant.read", desc: "Melihat tenant" }, { code: "tenant.update", desc: "Mengubah tenant" }, { code: "outlets.read", desc: "Melihat outlet" }, { code: "outlets.create", desc: "Menambah outlet" }, { code: "outlets.update", desc: "Mengubah outlet" }, { code: "users.read", desc: "Melihat user" }, { code: "users.create", desc: "Menambah user" }, { code: "users.update", desc: "Suspend/aktivasi user" }, { code: "users.reset_password", desc: "Reset password" }, { code: "users.assign_roles", desc: "Assign role" }, { code: "roles.read", desc: "Melihat role" }, { code: "roles.create", desc: "Menambah role" }, { code: "roles.assign_permissions", desc: "Mengatur permission role" }, { code: "permissions.read", desc: "Melihat katalog permission" }] },
];

// ---------- Dashboard helpers ----------
export const supplierName = (code: string) => SUPPLIERS.find((s) => s.code === code)?.name ?? code;
export const ingredientName = (sku: string) => INGREDIENTS.find((i) => i.sku === sku)?.name ?? sku;
export const outletName = (code: string) => OUTLETS.find((o) => o.code === code)?.name ?? code;
