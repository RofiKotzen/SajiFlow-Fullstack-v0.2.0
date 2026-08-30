"use client";

import { useEffect, useRef, useState } from "react";
import { AdminConsole, SessionControls } from "./admin-console";
import { ConnectedBudgetPlanning } from "./budget-planning";
import { ConnectedGoodsReceipts } from "./goods-receipts";
import { ConnectedInventoryOverview } from "./inventory-overview";
import { ConnectedMasterData } from "./master-data";
import { ConnectedPurchaseOrders } from "./purchase-orders";
import { ConnectedSupplierManagement } from "./supplier-management";
import { ConnectedRecipeFoodCost } from "./recipe-food-cost";
import { ConnectedMenuProducts } from "./menu-products";
import { AuthGate, type ApiClient, type AuthSession } from "./sajiflow-api";

type View =
  | "dashboard"
  | "orders"
  | "receipts"
  | "suppliers"
  | "recipes"
  | "budgets"
  | "kds"
  | "inventory"
  | "masters"
  | "menu-products"
  | "pos"
  | "settings";
type IconName =
  | "grid"
  | "cart"
  | "box"
  | "truck"
  | "recipe"
  | "budget"
  | "kitchen"
  | "inventory"
  | "pos"
  | "search"
  | "plus"
  | "bell"
  | "arrow"
  | "check"
  | "close"
  | "menu"
  | "collapse";

function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, React.ReactNode> = {
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="2" />
        <rect x="14" y="3" width="7" height="7" rx="2" />
        <rect x="3" y="14" width="7" height="7" rx="2" />
        <rect x="14" y="14" width="7" height="7" rx="2" />
      </>
    ),
    cart: (
      <>
        <path d="M4 4h2l2.4 10.2a2 2 0 0 0 2 1.5h6.8a2 2 0 0 0 1.9-1.4L21 8H7" />
        <circle cx="10" cy="20" r="1" />
        <circle cx="18" cy="20" r="1" />
      </>
    ),
    box: (
      <>
        <path d="m4 7 8-4 8 4-8 4-8-4Z" />
        <path d="M4 7v10l8 4 8-4V7M12 11v10" />
      </>
    ),
    truck: (
      <>
        <path d="M3 6h11v10H3zM14 10h4l3 3v3h-7z" />
        <circle cx="7" cy="18" r="2" />
        <circle cx="18" cy="18" r="2" />
      </>
    ),
    recipe: (
      <>
        <path d="M6 3h12v18H6z" />
        <path d="M9 7h6M9 11h6M9 15h3" />
      </>
    ),
    budget: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M15.5 8.5c-.8-.7-1.8-1-3-1-1.7 0-3 .8-3 2s1.1 1.8 3 2.2 3 1 3 2.3-1.3 2.2-3 2.2c-1.2 0-2.4-.4-3.2-1.2M12 5.5v13" />
      </>
    ),
    kitchen: (
      <>
        <rect x="3" y="4" width="18" height="13" rx="2" />
        <path d="M7 21h10M9 17v4M15 17v4M7 8h10M7 12h6" />
      </>
    ),
    inventory: (
      <>
        <path d="M4 5h16v4H4zM5 9h14v11H5z" />
        <path d="M9 13h6M9 16h4" />
      </>
    ),
    pos: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <path d="M7 7h10v4H7zM7 15h2M12 15h2M17 15h.01M7 18h2M12 18h2M17 18h.01" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </>
    ),
    plus: (
      <>
        <path d="M12 5v14M5 12h14" />
      </>
    ),
    bell: (
      <>
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
      </>
    ),
    arrow: (
      <>
        <path d="M5 12h14M14 7l5 5-5 5" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    close: <path d="m6 6 12 12M18 6 6 18" />,
    menu: <path d="M4 7h16M4 12h16M4 17h16" />,
    collapse: <path d="m14 7-5 5 5 5" />,
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

const purchaseOrders = [
  {
    id: "PO-240824-018",
    supplier: "PT Segar Pangan Nusantara",
    category: "Fresh Produce",
    value: 4820000,
    date: "24 Agu 2026",
    status: "Menunggu Persetujuan",
  },
  {
    id: "PO-230824-017",
    supplier: "CV Bumi Rempah",
    category: "Dry Goods",
    value: 2375000,
    date: "23 Agu 2026",
    status: "Diproses",
  },
  {
    id: "PO-220824-016",
    supplier: "Sumber Protein Sejahtera",
    category: "Meat & Poultry",
    value: 6940000,
    date: "22 Agu 2026",
    status: "Dikirim",
  },
  {
    id: "PO-210824-015",
    supplier: "Dairyland Cianjur",
    category: "Dairy",
    value: 1890000,
    date: "21 Agu 2026",
    status: "Selesai",
  },
  {
    id: "PO-200824-014",
    supplier: "Kemasan Prima",
    category: "Packaging",
    value: 1265000,
    date: "20 Agu 2026",
    status: "Selesai",
  },
];

const supplierList = [
  {
    name: "PT Segar Pangan Nusantara",
    code: "SUP-001",
    category: "Sayur & Buah",
    orders: 42,
    rating: 4.9,
    delivery: "98%",
    status: "Aktif",
  },
  {
    name: "Sumber Protein Sejahtera",
    code: "SUP-002",
    category: "Daging & Unggas",
    orders: 31,
    rating: 4.7,
    delivery: "94%",
    status: "Aktif",
  },
  {
    name: "CV Bumi Rempah",
    code: "SUP-003",
    category: "Bumbu & Bahan Kering",
    orders: 28,
    rating: 4.8,
    delivery: "96%",
    status: "Aktif",
  },
  {
    name: "Dairyland Cianjur",
    code: "SUP-004",
    category: "Produk Susu",
    orders: 19,
    rating: 4.5,
    delivery: "91%",
    status: "Evaluasi",
  },
  {
    name: "Kemasan Prima",
    code: "SUP-005",
    category: "Kemasan",
    orders: 24,
    rating: 4.6,
    delivery: "93%",
    status: "Aktif",
  },
];

const menuRecipes = [
  {
    id: "MNU-001",
    name: "Nasi Goreng Kampung",
    category: "Main Course",
    price: 48000,
    cost: 14200,
    foodCost: 29.6,
    margin: 33800,
    sold: 342,
    portions: 48,
    status: "Sehat",
    engineering: "Star",
  },
  {
    id: "MNU-002",
    name: "Beef Tenderloin Steak",
    category: "Main Course",
    price: 95000,
    cost: 38500,
    foodCost: 40.5,
    margin: 56500,
    sold: 126,
    portions: 18,
    status: "Perlu Evaluasi",
    engineering: "Puzzle",
  },
  {
    id: "MNU-003",
    name: "Avocado Coffee",
    category: "Beverage",
    price: 32000,
    cost: 11500,
    foodCost: 35.9,
    margin: 20500,
    sold: 298,
    portions: 24,
    status: "Waspada",
    engineering: "Plowhorse",
  },
  {
    id: "MNU-004",
    name: "Creamy Mushroom Pasta",
    category: "Main Course",
    price: 62000,
    cost: 18400,
    foodCost: 29.7,
    margin: 43600,
    sold: 214,
    portions: 31,
    status: "Sehat",
    engineering: "Star",
  },
  {
    id: "MNU-005",
    name: "Chicken Caesar Salad",
    category: "Appetizer",
    price: 52000,
    cost: 17300,
    foodCost: 33.3,
    margin: 34700,
    sold: 97,
    portions: 16,
    status: "Waspada",
    engineering: "Dog",
  },
  {
    id: "MNU-006",
    name: "Caramel Macchiato",
    category: "Beverage",
    price: 36000,
    cost: 9800,
    foodCost: 27.2,
    margin: 26200,
    sold: 387,
    portions: 62,
    status: "Sehat",
    engineering: "Star",
  },
];

const kitchenOrdersSeed = [
  {
    id: "ORD-1048",
    table: "Meja 08",
    customer: "Rina",
    source: "Dine-in",
    created: "19:24",
    elapsed: 6,
    status: "new",
    priority: "normal",
    items: [
      {
        qty: 2,
        name: "Nasi Goreng Kampung",
        modifier: "Pedas sedang",
        station: "Hot Kitchen",
      },
      {
        qty: 1,
        name: "Avocado Coffee",
        modifier: "Less sugar",
        station: "Bar",
      },
    ],
  },
  {
    id: "ORD-1049",
    table: "Meja 03",
    customer: "Aditya",
    source: "Dine-in",
    created: "19:27",
    elapsed: 3,
    status: "new",
    priority: "normal",
    items: [
      {
        qty: 1,
        name: "Beef Tenderloin Steak",
        modifier: "Medium well • Sauce terpisah",
        station: "Hot Kitchen",
      },
      { qty: 1, name: "Caramel Macchiato", modifier: "Hot", station: "Bar" },
    ],
  },
  {
    id: "ORD-1050",
    table: "Takeaway",
    customer: "Fahmi",
    source: "Takeaway",
    created: "19:29",
    elapsed: 1,
    status: "new",
    priority: "rush",
    items: [
      {
        qty: 2,
        name: "Creamy Mushroom Pasta",
        modifier: "No mushroom garnish",
        station: "Hot Kitchen",
      },
    ],
  },
  {
    id: "ORD-1044",
    table: "Meja 11",
    customer: "Dewi",
    source: "Dine-in",
    created: "19:14",
    elapsed: 16,
    status: "preparing",
    priority: "warning",
    items: [
      {
        qty: 1,
        name: "Chicken Caesar Salad",
        modifier: "Dressing terpisah",
        station: "Cold Kitchen",
      },
      { qty: 2, name: "Avocado Coffee", modifier: "Normal", station: "Bar" },
    ],
  },
  {
    id: "ORD-1045",
    table: "Meja 05",
    customer: "Bagas",
    source: "Dine-in",
    created: "19:17",
    elapsed: 13,
    status: "preparing",
    priority: "normal",
    items: [
      {
        qty: 2,
        name: "Beef Tenderloin Steak",
        modifier: "1 medium • 1 well done",
        station: "Hot Kitchen",
      },
      {
        qty: 1,
        name: "Chicken Caesar Salad",
        modifier: "Extra parmesan",
        station: "Cold Kitchen",
      },
    ],
  },
  {
    id: "ORD-1046",
    table: "Online",
    customer: "Novi",
    source: "Delivery",
    created: "19:18",
    elapsed: 12,
    status: "preparing",
    priority: "normal",
    items: [
      {
        qty: 1,
        name: "Nasi Goreng Kampung",
        modifier: "Tidak pedas",
        station: "Hot Kitchen",
      },
      { qty: 1, name: "Caramel Macchiato", modifier: "Iced", station: "Bar" },
    ],
  },
  {
    id: "ORD-1041",
    table: "Meja 02",
    customer: "Sarah",
    source: "Dine-in",
    created: "19:08",
    elapsed: 22,
    status: "ready",
    priority: "overdue",
    items: [
      {
        qty: 2,
        name: "Creamy Mushroom Pasta",
        modifier: "Normal",
        station: "Hot Kitchen",
      },
    ],
  },
  {
    id: "ORD-1043",
    table: "Meja 14",
    customer: "Rudi",
    source: "Dine-in",
    created: "19:12",
    elapsed: 18,
    status: "ready",
    priority: "warning",
    items: [
      {
        qty: 1,
        name: "Nasi Goreng Kampung",
        modifier: "Extra egg",
        station: "Hot Kitchen",
      },
      {
        qty: 2,
        name: "Caramel Macchiato",
        modifier: "1 hot • 1 iced",
        station: "Bar",
      },
    ],
  },
];

const inventoryItems = [
  {
    id: "INV-001",
    name: "Beef Tenderloin",
    category: "Meat & Poultry",
    unit: "kg",
    onHand: 8.4,
    reserved: 2.1,
    minimum: 10,
    averageUse: 3.2,
    location: "Cold Storage A",
    unitCost: 245000,
    status: "Stok Kritis",
    expiry: "27 Agu 2026",
    lastUpdate: "24 Agu, 19:18",
    supplier: "Sumber Protein Sejahtera",
  },
  {
    id: "INV-002",
    name: "Avocado Hass",
    category: "Fresh Produce",
    unit: "kg",
    onHand: 12.5,
    reserved: 3.2,
    minimum: 8,
    averageUse: 4.1,
    location: "Chiller Produce",
    unitCost: 90000,
    status: "Menipis",
    expiry: "26 Agu 2026",
    lastUpdate: "24 Agu, 18:52",
    supplier: "PT Segar Pangan Nusantara",
  },
  {
    id: "INV-003",
    name: "Cooking Cream 1L",
    category: "Dairy",
    unit: "liter",
    onHand: 18,
    reserved: 4,
    minimum: 12,
    averageUse: 5.5,
    location: "Dairy Chiller",
    unitCost: 85000,
    status: "Aman",
    expiry: "02 Sep 2026",
    lastUpdate: "24 Agu, 17:40",
    supplier: "Dairyland Cianjur",
  },
  {
    id: "INV-004",
    name: "Chicken Breast",
    category: "Meat & Poultry",
    unit: "kg",
    onHand: 24.8,
    reserved: 6.5,
    minimum: 15,
    averageUse: 7.2,
    location: "Cold Storage B",
    unitCost: 65000,
    status: "Aman",
    expiry: "29 Agu 2026",
    lastUpdate: "24 Agu, 19:18",
    supplier: "Sumber Protein Sejahtera",
  },
  {
    id: "INV-005",
    name: "Romaine Lettuce",
    category: "Fresh Produce",
    unit: "kg",
    onHand: 6.2,
    reserved: 1.8,
    minimum: 7,
    averageUse: 2.7,
    location: "Chiller Produce",
    unitCost: 42000,
    status: "Stok Kritis",
    expiry: "25 Agu 2026",
    lastUpdate: "24 Agu, 18:36",
    supplier: "PT Segar Pangan Nusantara",
  },
  {
    id: "INV-006",
    name: "Fresh Milk",
    category: "Dairy",
    unit: "liter",
    onHand: 32,
    reserved: 8.5,
    minimum: 20,
    averageUse: 9.8,
    location: "Bar Chiller",
    unitCost: 25000,
    status: "Aman",
    expiry: "30 Agu 2026",
    lastUpdate: "24 Agu, 19:22",
    supplier: "Dairyland Cianjur",
  },
  {
    id: "INV-007",
    name: "Fettuccine Pasta",
    category: "Dry Goods",
    unit: "kg",
    onHand: 19.5,
    reserved: 2.4,
    minimum: 10,
    averageUse: 3.8,
    location: "Dry Store R2",
    unitCost: 36000,
    status: "Aman",
    expiry: "18 Jan 2027",
    lastUpdate: "24 Agu, 16:04",
    supplier: "CV Bumi Rempah",
  },
  {
    id: "INV-008",
    name: "Espresso Beans",
    category: "Beverage",
    unit: "kg",
    onHand: 7.8,
    reserved: 1.2,
    minimum: 6,
    averageUse: 1.9,
    location: "Bar Store",
    unitCost: 185000,
    status: "Menipis",
    expiry: "12 Nov 2026",
    lastUpdate: "24 Agu, 19:22",
    supplier: "Kopi Lembah Puncak",
  },
];

const inventoryMovements = [
  {
    time: "19:22",
    reference: "KDS-ORD-1046",
    type: "Pemakaian Produksi",
    quantity: -0.18,
    balance: 32,
    unit: "liter",
    user: "Sistem • KDS",
  },
  {
    time: "19:18",
    reference: "KDS-ORD-1045",
    type: "Pemakaian Produksi",
    quantity: -0.3,
    balance: 8.4,
    unit: "kg",
    user: "Sistem • KDS",
  },
  {
    time: "17:40",
    reference: "GR-240824-006",
    type: "Penerimaan Barang",
    quantity: 12,
    balance: 18,
    unit: "liter",
    user: "Fajar • Storekeeper",
  },
  {
    time: "15:12",
    reference: "WST-240824-004",
    type: "Waste / Rusak",
    quantity: -0.8,
    balance: 6.2,
    unit: "kg",
    user: "Dimas • Kitchen",
  },
  {
    time: "11:05",
    reference: "ADJ-240824-002",
    type: "Stock Adjustment",
    quantity: -0.4,
    balance: 12.5,
    unit: "kg",
    user: "Nadia • Supervisor",
  },
];

const posMenuItems = [
  {
    id: "MNU-001",
    name: "Nasi Goreng Kampung",
    category: "Main Course",
    price: 48000,
    station: "Hot Kitchen",
    available: 48,
    sold: 34,
    code: "NG",
  },
  {
    id: "MNU-002",
    name: "Beef Tenderloin Steak",
    category: "Main Course",
    price: 95000,
    station: "Hot Kitchen",
    available: 18,
    sold: 12,
    code: "BT",
  },
  {
    id: "MNU-004",
    name: "Creamy Mushroom Pasta",
    category: "Main Course",
    price: 62000,
    station: "Hot Kitchen",
    available: 31,
    sold: 21,
    code: "CP",
  },
  {
    id: "MNU-005",
    name: "Chicken Caesar Salad",
    category: "Appetizer",
    price: 52000,
    station: "Cold Kitchen",
    available: 16,
    sold: 9,
    code: "CS",
  },
  {
    id: "MNU-003",
    name: "Avocado Coffee",
    category: "Beverage",
    price: 32000,
    station: "Bar",
    available: 24,
    sold: 29,
    code: "AC",
  },
  {
    id: "MNU-006",
    name: "Caramel Macchiato",
    category: "Beverage",
    price: 36000,
    station: "Bar",
    available: 62,
    sold: 41,
    code: "CM",
  },
  {
    id: "MNU-007",
    name: "Classic Tiramisu",
    category: "Dessert",
    price: 42000,
    station: "Pastry",
    available: 14,
    sold: 17,
    code: "CT",
  },
  {
    id: "MNU-008",
    name: "Truffle French Fries",
    category: "Appetizer",
    price: 38000,
    station: "Hot Kitchen",
    available: 27,
    sold: 24,
    code: "TF",
  },
];

const salesTransactions = [
  {
    id: "TRX-240824-0188",
    orderId: "ORD-1047",
    time: "19:20",
    customer: "Alvin",
    type: "Dine-in",
    table: "Meja 06",
    total: 286000,
    payment: "QRIS",
    cashier: "Salsa",
    status: "Selesai",
    items: [
      { name: "Beef Tenderloin Steak", qty: 2, price: 95000 },
      { name: "Avocado Coffee", qty: 2, price: 32000 },
    ],
  },
  {
    id: "TRX-240824-0187",
    orderId: "ORD-1042",
    time: "19:05",
    customer: "Maya",
    type: "Takeaway",
    table: "Takeaway",
    total: 126500,
    payment: "Debit BCA",
    cashier: "Salsa",
    status: "Selesai",
    items: [
      { name: "Creamy Mushroom Pasta", qty: 1, price: 62000 },
      { name: "Caramel Macchiato", qty: 1, price: 36000 },
    ],
  },
  {
    id: "TRX-240824-0186",
    orderId: "ORD-1039",
    time: "18:54",
    customer: "Reno",
    type: "Dine-in",
    table: "Meja 12",
    total: 214500,
    payment: "Tunai",
    cashier: "Salsa",
    status: "Selesai",
    items: [
      { name: "Nasi Goreng Kampung", qty: 2, price: 48000 },
      { name: "Chicken Caesar Salad", qty: 1, price: 52000 },
      { name: "Caramel Macchiato", qty: 1, price: 36000 },
    ],
  },
  {
    id: "TRX-240824-0185",
    orderId: "ORD-1037",
    time: "18:42",
    customer: "Gina",
    type: "Delivery",
    table: "GoFood",
    total: 104000,
    payment: "Online",
    cashier: "Sistem",
    status: "Refund Sebagian",
    items: [{ name: "Chicken Caesar Salad", qty: 2, price: 52000 }],
  },
];

type DetailSelection =
  | { kind: "order"; data: (typeof purchaseOrders)[number] }
  | { kind: "supplier"; data: (typeof supplierList)[number] }
  | { kind: "recipe"; data: (typeof menuRecipes)[number] }
  | { kind: "kds"; data: (typeof kitchenOrdersSeed)[number] }
  | { kind: "inventory"; data: (typeof inventoryItems)[number] }
  | { kind: "sale"; data: (typeof salesTransactions)[number] };

const rupiah = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);

function Badge({ status }: { status: string }) {
  const kind = [
    "Selesai",
    "Aktif",
    "Diterima",
    "Sehat",
    "Sesuai",
    "Aman",
    "Terkirim",
    "Disetujui",
    "Siap Disajikan",
  ].includes(status)
    ? "success"
    : [
          "Dikirim",
          "Dalam Perjalanan",
          "Dalam Proses",
          "Sedang Diproses",
        ].includes(status)
      ? "info"
      : [
            "Evaluasi",
            "Perlu Evaluasi",
            "Overbudget",
            "Stok Kritis",
            "Ditolak",
            "Refund Sebagian",
          ].includes(status)
        ? "danger"
        : "warning";
  return (
    <span className={`badge ${kind}`}>
      <span />
      {status}
    </span>
  );
}

export default function Home() {
  return (
    <AuthGate>
      {({ session, api, logout }) => (
        <OperationWorkspace session={session} api={api} logout={logout} />
      )}
    </AuthGate>
  );
}

function OperationWorkspace({
  session,
  api,
  logout,
}: {
  session: AuthSession;
  api: ApiClient;
  logout: () => Promise<void>;
}) {
  const [view, setView] = useState<View>("dashboard");
  const [toast, setToast] = useState("");
  const [detail, setDetail] = useState<DetailSelection | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const permissions = session.user.permissions;
  const hasAnyPermission = (...codes: string[]) =>
    codes.some((code) => permissions.includes(code));
  const navGroups = [
    {
      label: "Utama",
      items: [{ id: "dashboard", label: "Dashboard", icon: "grid", visible: true }],
    },
    {
      label: "Operasional",
      items: [
        { id: "pos", label: "POS", icon: "pos", visible: true },
        { id: "kds", label: "Kitchen Display", icon: "kitchen", visible: true },
      ],
    },
    {
      label: "Persediaan",
      items: [
        { id: "inventory", label: "Ringkasan Stok", icon: "inventory", visible: hasAnyPermission("inventory.read") },
      ],
    },
    {
      label: "Pembelian",
      items: [
        { id: "budgets", label: "Budget Planning", icon: "budget", visible: hasAnyPermission("budgets.read") },
        { id: "orders", label: "Purchase Order", icon: "cart", visible: hasAnyPermission("purchase_orders.read") },
        { id: "receipts", label: "Goods Receipt", icon: "box", visible: hasAnyPermission("goods_receipts.read") },
      ],
    },
    {
      label: "Master Data",
      items: [
        { id: "masters", label: "Bahan & Satuan", icon: "box", visible: hasAnyPermission("ingredients.read", "units.read") },
        { id: "suppliers", label: "Supplier", icon: "truck", visible: hasAnyPermission("suppliers.read") },
        { id: "menu-products", label: "Menu & Produk", icon: "recipe", visible: hasAnyPermission("menus.read") },
        { id: "recipes", label: "Resep & Food Cost", icon: "recipe", visible: hasAnyPermission("recipes.read") },
      ],
    },
    {
      label: "Sistem",
      items: [
        { id: "settings", label: "Pengaturan", icon: "grid", visible: hasAnyPermission("tenant.read", "outlets.read", "users.read", "roles.read", "permissions.read") },
      ],
    },
  ] satisfies { label: string; items: { id: View; label: string; icon: IconName; visible: boolean }[] }[];
  const currentGroup = navGroups.find((group) =>
    group.items.some((item) => item.id === view),
  )?.label;
  const titles: Record<View, { title: string; subtitle: string }> = {
    dashboard: {
      title: "Purchasing Overview",
      subtitle:
        "Pantau pembelian, penerimaan, dan kinerja supplier dalam satu tempat.",
    },
    orders: {
      title: "Purchase Order",
      subtitle:
        "Kelola proses pembelian dari permintaan hingga pesanan disetujui.",
    },
    receipts: {
      title: "Penerimaan Barang",
      subtitle: "Cocokkan pesanan, kuantitas, dan kualitas barang yang tiba.",
    },
    suppliers: {
      title: "Supplier Management",
      subtitle:
        "Evaluasi harga, ketepatan pengiriman, dan performa mitra pemasok.",
    },
    recipes: {
      title: "Recipe & Food Cost",
      subtitle:
        "Kendalikan biaya resep, margin, dan profitabilitas setiap menu.",
    },
    budgets: {
      title: "Budget Planning",
      subtitle:
        "Rencanakan, alokasikan, dan kendalikan anggaran pembelian setiap periode.",
    },
    kds: {
      title: "Kitchen Display System",
      subtitle:
        "Kelola antrean produksi dan waktu pelayanan dapur secara real-time.",
    },
    inventory: {
      title: "Inventory & Stock Control",
      subtitle:
        "Pantau ketersediaan, pergerakan, waste, dan kebutuhan stok bahan baku.",
    },
    masters: {
      title: "Master Bahan & Satuan",
      subtitle:
        "Kelola identitas bahan, satuan dasar, dan parameter persediaan setiap outlet.",
    },
    "menu-products": {
      title: "Menu & Produk",
      subtitle:
        "Kelola kategori, menu, variant, harga, dan availability setiap outlet.",
    },
    pos: {
      title: "POS & Sales",
      subtitle:
        "Proses transaksi, kelola pesanan aktif, dan pantau penjualan setiap shift.",
    },
    settings: {
      title: "Administrasi Workspace",
      subtitle:
        "Kelola organisasi, outlet, pengguna, role, dan hak akses Saji Flow.",
    },
  };
  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 3000);
  }

  useEffect(() => {
    if (!mobileNavOpen) return;
    const sidebar = sidebarRef.current;
    const mobileMenuButton = mobileMenuButtonRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    sidebar?.querySelector<HTMLElement>("button, [href], select, input")?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMobileNavOpen(false);
        return;
      }
      if (event.key !== "Tab" || !sidebar) return;
      const focusable = [...sidebar.querySelectorAll<HTMLElement>("button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex='-1'])")];
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      mobileMenuButton?.focus();
    };
  }, [mobileNavOpen]);

  return (
    <main className={`app-shell app-shell-v2 ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      {mobileNavOpen && <button className="nav-scrim" aria-label="Tutup navigasi" onClick={() => setMobileNavOpen(false)} />}
      <aside id="saji-primary-navigation" ref={sidebarRef} className={`sidebar ${mobileNavOpen ? "mobile-open" : ""}`} aria-label="Navigasi aplikasi">
        <div className="brand">
          <div className="brand-mark">S</div>
          <div>
            <strong>Saji Flow</strong>
            <span>Restaurant Operations</span>
          </div>
          <button className="sidebar-collapse" aria-label={sidebarCollapsed ? "Perluas sidebar" : "Ciutkan sidebar"} onClick={() => setSidebarCollapsed((value) => !value)}><Icon name="collapse" /></button>
        </div>
        <nav aria-label="Navigasi utama">
          {navGroups.map((group) => {
            const items = group.items.filter((item) => item.visible);
            if (!items.length) return null;
            return <div className="nav-group" key={group.label}>
              <p className="nav-label">{group.label}</p>
              {items.map((item) => (
                <button key={item.id} title={sidebarCollapsed ? item.label : undefined} aria-current={view === item.id ? "page" : undefined} className={view === item.id ? "active" : ""} onClick={() => { setView(item.id); setMobileNavOpen(false); }}>
                  <Icon name={item.icon} /><span>{item.label}</span>{view === item.id && <i />}
                </button>
              ))}
            </div>;
          })}
        </nav>
        <div className="sidebar-card">
          <span className="eyebrow">Bulan berjalan</span>
          <strong>72% anggaran</strong>
          <div className="mini-progress">
            <i />
          </div>
          <small>Rp28,6 jt dari Rp40 jt</small>
        </div>
        <div className="profile">
          <div className="avatar">{initials(session.user.fullName)}</div>
          <div>
            <strong>{session.user.fullName}</strong>
            <span>{session.user.roles[0] || "User"}</span>
          </div>
          <button aria-label="Buka menu akun" onClick={() => void logout()}>
            ↪
          </button>
        </div>
      </aside>
      <section className={`workspace view-${view}`}>
        <header className="topbar">
          <div className="mobile-brand">
            <button ref={mobileMenuButtonRef} className="icon-button mobile-menu" aria-label="Buka navigasi" aria-expanded={mobileNavOpen} aria-controls="saji-primary-navigation" onClick={() => setMobileNavOpen(true)}><Icon name="menu" /></button>
            <div><strong>Saji Flow</strong><span>{titles[view].title}</span></div>
          </div>
          <button className="icon-button desktop-collapse" aria-label={sidebarCollapsed ? "Perluas sidebar" : "Ciutkan sidebar"} onClick={() => setSidebarCollapsed((value) => !value)}><Icon name="collapse" /></button>
          <SessionControls api={api} logout={logout} />
          <div className="top-actions">
            <button className="icon-button" aria-label="Notifikasi">
              <Icon name="bell" />
              <span className="notification-dot" />
            </button>
            <div className="topbar-profile"><div className="avatar">{initials(session.user.fullName)}</div><div><strong>{session.user.fullName}</strong><span>{session.user.roles[0] || "User"}</span></div><button onClick={() => void logout()}>Keluar</button></div>
          </div>
        </header>
        <div className="content">
          <div className="page-heading">
            <div>
              <p className="breadcrumb">
                <span>Saji Flow</span><b aria-hidden="true">/</b><span>{currentGroup}</span><b aria-hidden="true">/</b><strong>{titles[view].title}</strong>
              </p>
              <h1>{titles[view].title}</h1>
              <p>{titles[view].subtitle}</p>
            </div>
            {view === "recipes" ? (
              <button
                className="primary-button"
                onClick={() =>
                  notify(
                    "Form resep baru siap digunakan pada tahap pengembangan berikutnya.",
                  )
                }
              >
                <Icon name="plus" /> Tambah Resep
              </button>
            ) : view === "kds" ? (
              <button
                className="secondary-button"
                onClick={() => notify("Mode layar dapur siap diaktifkan.")}
              >
                <Icon name="kitchen" /> Mode Layar Dapur
              </button>
            ) : view === "pos" ? (
              <button
                className="secondary-button"
                onClick={() =>
                  notify("Ringkasan penutupan shift kasir siap ditinjau.")
                }
              >
                <Icon name="check" /> Tutup Shift
              </button>
            ) : null}
          </div>
          {view === "dashboard" && (
            <Dashboard
              setView={setView}
              onSelect={(data) => setDetail({ kind: "order", data })}
            />
          )}
          {view === "orders" && (
            <ConnectedPurchaseOrders
              session={session}
              api={api}
              onNotify={notify}
            />
          )}
          {view === "suppliers" && (
            <ConnectedSupplierManagement
              session={session}
              api={api}
              onNotify={notify}
            />
          )}
          {view === "receipts" && (
            <ConnectedGoodsReceipts
              session={session}
              api={api}
              onNotify={notify}
            />
          )}
          {view === "recipes" && (
            <ConnectedRecipeFoodCost
              session={session}
              api={api}
              onNotify={notify}
            />
          )}
          {view === "budgets" && (
            <ConnectedBudgetPlanning
              session={session}
              api={api}
              onNotify={notify}
            />
          )}
          {view === "kds" && (
            <KitchenDisplay
              onSelect={(data) => setDetail({ kind: "kds", data })}
              onNotify={notify}
            />
          )}
          {view === "inventory" && (
            <ConnectedInventoryOverview session={session} api={api} />
          )}
          {view === "masters" && (
            <ConnectedMasterData
              session={session}
              api={api}
              onNotify={notify}
            />
          )}
          {view === "menu-products" && (
            <ConnectedMenuProducts
              session={session}
              api={api}
              onNotify={notify}
            />
          )}
          {view === "pos" && (
            <PosSales
              onSelect={(data) => setDetail({ kind: "sale", data })}
              onNotify={notify}
            />
          )}
          {view === "settings" && (
            <AdminConsole session={session} api={api} notify={notify} />
          )}
        </div>
      </section>
      {detail && (
        <DetailDrawer
          detail={detail}
          onClose={() => setDetail(null)}
          onAction={(message) => {
            setDetail(null);
            notify(message);
          }}
        />
      )}
      {toast && (
        <div className="toast">
          <span>
            <Icon name="check" />
          </span>
          {toast}
        </div>
      )}
    </main>
  );
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function Dashboard({
  setView,
  onSelect,
}: {
  setView: (view: View) => void;
  onSelect: (order: (typeof purchaseOrders)[number]) => void;
}) {
  const stats = [
    {
      label: "Pembelian bulan ini",
      value: "Rp28,6 jt",
      note: "+8,4% dari Juli",
      icon: "cart" as IconName,
      tone: "green",
    },
    {
      label: "PO aktif",
      value: "12",
      note: "3 perlu persetujuan",
      icon: "box" as IconName,
      tone: "gold",
    },
    {
      label: "Pengiriman hari ini",
      value: "4",
      note: "1 sedang dalam perjalanan",
      icon: "truck" as IconName,
      tone: "blue",
    },
    {
      label: "Supplier aktif",
      value: "18",
      note: "Rata-rata rating 4,7",
      icon: "grid" as IconName,
      tone: "purple",
    },
  ];
  return (
    <>
      <div className="stats-grid">
        {stats.map((stat) => (
          <article className="stat-card" key={stat.label}>
            <div className={`stat-icon ${stat.tone}`}>
              <Icon name={stat.icon} />
            </div>
            <div>
              <span>{stat.label}</span>
              <strong>{stat.value}</strong>
              <small>{stat.note}</small>
            </div>
          </article>
        ))}
      </div>
      <div className="dashboard-grid">
        <section className="panel orders-panel">
          <div className="panel-heading">
            <div>
              <h2>Purchase Order Terbaru</h2>
              <p>Aktivitas pembelian 7 hari terakhir</p>
            </div>
            <button className="text-button" onClick={() => setView("orders")}>
              Lihat semua <Icon name="arrow" size={16} />
            </button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>No. PO</th>
                  <th>Supplier</th>
                  <th>Nilai</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {purchaseOrders.slice(0, 4).map((order) => (
                  <tr
                    key={order.id}
                    className="clickable-row"
                    onClick={() => onSelect(order)}
                  >
                    <td>
                      <b>{order.id}</b>
                      <small>{order.category}</small>
                    </td>
                    <td>{order.supplier}</td>
                    <td>
                      <b>{rupiah(order.value)}</b>
                    </td>
                    <td>
                      <Badge status={order.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <aside className="panel budget-panel">
          <div className="panel-heading">
            <div>
              <h2>Realisasi Anggaran</h2>
              <p>Agustus 2026</p>
            </div>
            <button className="text-button" onClick={() => setView("budgets")}>
              Kelola <Icon name="arrow" size={14} />
            </button>
          </div>
          <div className="budget-ring">
            <div>
              <strong>72%</strong>
              <span>Terpakai</span>
            </div>
          </div>
          <div className="budget-values">
            <div>
              <span>Terpakai</span>
              <strong>Rp28,6 jt</strong>
            </div>
            <div>
              <span>Sisa</span>
              <strong>Rp11,4 jt</strong>
            </div>
          </div>
          <div className="budget-alert">
            <span>!</span>
            <p>
              <strong>Fresh Produce</strong> sudah menggunakan 86% anggaran
              kategori.
            </p>
          </div>
        </aside>
        <section className="panel attention-panel">
          <div className="panel-heading">
            <div>
              <h2>Perlu Perhatian</h2>
              <p>Item yang perlu segera ditindaklanjuti</p>
            </div>
          </div>
          <div className="attention-list">
            {[
              {
                item: "Daging Sapi Tenderloin",
                detail: "Stok tersisa untuk ±2 hari",
                tag: "Stok rendah",
                tone: "red",
              },
              {
                item: "Avocado Hass",
                detail: "Harga supplier naik 14%",
                tag: "Cek harga",
                tone: "yellow",
              },
              {
                item: "Cooking Cream 1L",
                detail: "PO belum disetujui sejak 22 Agu",
                tag: "Approval",
                tone: "blue",
              },
            ].map((x) => (
              <div className="attention-item" key={x.item}>
                <span className={`alert-dot ${x.tone}`} />
                <div>
                  <strong>{x.item}</strong>
                  <small>{x.detail}</small>
                </div>
                <span className={`small-tag ${x.tone}`}>{x.tag}</span>
              </div>
            ))}
          </div>
        </section>
        <section className="panel supplier-panel">
          <div className="panel-heading">
            <div>
              <h2>Kinerja Supplier</h2>
              <p>Berdasarkan ketepatan dan kualitas</p>
            </div>
            <button
              className="text-button"
              onClick={() => setView("suppliers")}
            >
              Kelola supplier <Icon name="arrow" size={16} />
            </button>
          </div>
          <div className="supplier-bars">
            {supplierList.slice(0, 4).map((supplier) => (
              <div key={supplier.code}>
                <div className="bar-meta">
                  <span>{supplier.name}</span>
                  <strong>{supplier.delivery}</strong>
                </div>
                <div className="bar">
                  <i style={{ width: supplier.delivery }} />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}

function SearchBox({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="search-box">
      <Icon name="search" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}

function PosSales({
  onSelect,
  onNotify,
}: {
  onSelect: (transaction: (typeof salesTransactions)[number]) => void;
  onNotify: (message: string) => void;
}) {
  const [mode, setMode] = useState<
    "terminal" | "active" | "transactions" | "shift"
  >("terminal");
  const [menuQuery, setMenuQuery] = useState("");
  const [menuCategory, setMenuCategory] = useState("Semua Menu");
  const [orderType, setOrderType] = useState("Dine-in");
  const [table, setTable] = useState("Meja 08");
  const [customer, setCustomer] = useState("Rina");
  const [cart, setCart] = useState([
    { ...posMenuItems[0], qty: 2 },
    { ...posMenuItems[4], qty: 1 },
  ]);
  const [discountApplied, setDiscountApplied] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("QRIS");
  const [completedCount, setCompletedCount] = useState(86);
  const menuCategories = [
    "Semua Menu",
    "Main Course",
    "Appetizer",
    "Beverage",
    "Dessert",
  ];
  const filteredMenu = posMenuItems.filter(
    (item) =>
      `${item.name} ${item.id}`
        .toLowerCase()
        .includes(menuQuery.toLowerCase()) &&
      (menuCategory === "Semua Menu" || item.category === menuCategory),
  );
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const discount = discountApplied ? subtotal * 0.1 : 0;
  const service = orderType === "Dine-in" ? subtotal * 0.05 : 0;
  const tax = (subtotal - discount + service) * 0.1;
  const total = Math.round(subtotal - discount + service + tax);
  const itemCount = cart.reduce((sum, item) => sum + item.qty, 0);
  const tabs = [
    { id: "terminal", label: "Terminal POS" },
    { id: "active", label: "Pesanan Aktif", count: kitchenOrdersSeed.length },
    { id: "transactions", label: "Transaksi" },
    { id: "shift", label: "Shift Kasir" },
  ] as const;
  function addItem(item: (typeof posMenuItems)[number]) {
    setCart((current) => {
      const found = current.find((row) => row.id === item.id);
      return found
        ? current.map((row) =>
            row.id === item.id ? { ...row, qty: row.qty + 1 } : row,
          )
        : [...current, { ...item, qty: 1 }];
    });
  }
  function changeQuantity(id: string, change: number) {
    setCart((current) =>
      current
        .map((item) =>
          item.id === id ? { ...item, qty: item.qty + change } : item,
        )
        .filter((item) => item.qty > 0),
    );
  }
  function completePayment() {
    if (!cart.length) return;
    setPaymentOpen(false);
    setCompletedCount((count) => count + 1);
    setCart([]);
    setDiscountApplied(false);
    onNotify(
      `Pembayaran ${paymentMethod} berhasil. Pesanan dikirim ke KDS dan stok telah direservasi.`,
    );
  }
  return (
    <>
      <div className="pos-livebar">
        <div>
          <span className="pos-register-icon">
            <Icon name="pos" />
          </span>
          <div>
            <strong>POS 01 • Main Floor</strong>
            <small>Kasir Salsa Putri • Shift Malam dibuka pukul 15:00</small>
          </div>
        </div>
        <div className="pos-live-status">
          <i /> Online & tersinkron dengan KDS
        </div>
      </div>
      <div className="stats-grid pos-stats">
        <article className="stat-card">
          <div className="stat-icon green">
            <Icon name="budget" />
          </div>
          <div>
            <span>Penjualan hari ini</span>
            <strong>Rp18,64 jt</strong>
            <small>+12,8% dari Senin lalu</small>
          </div>
        </article>
        <article className="stat-card">
          <div className="stat-icon blue">
            <Icon name="pos" />
          </div>
          <div>
            <span>Total transaksi</span>
            <strong>{completedCount}</strong>
            <small>74 selesai • 12 aktif</small>
          </div>
        </article>
        <article className="stat-card">
          <div className="stat-icon gold">
            <Icon name="cart" />
          </div>
          <div>
            <span>Average order</span>
            <strong>Rp216.700</strong>
            <small>3,4 item per transaksi</small>
          </div>
        </article>
        <article className="stat-card">
          <div className="stat-icon purple">
            <Icon name="kitchen" />
          </div>
          <div>
            <span>Kitchen SLA</span>
            <strong>91%</strong>
            <small>Rata-rata 12:34 menit</small>
          </div>
        </article>
      </div>
      <section className="panel pos-workspace">
        <div className="pos-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={mode === tab.id ? "active" : ""}
              onClick={() => setMode(tab.id)}
            >
              {tab.label}
              {"count" in tab && <span>{tab.count}</span>}
            </button>
          ))}
        </div>
        {mode === "terminal" && (
          <div className="pos-terminal-grid">
            <section className="pos-menu-panel">
              <div className="order-context">
                <div className="order-type-switch">
                  {["Dine-in", "Takeaway", "Delivery"].map((type) => (
                    <button
                      key={type}
                      className={orderType === type ? "active" : ""}
                      onClick={() => setOrderType(type)}
                    >
                      {type}
                    </button>
                  ))}
                </div>
                <select
                  value={table}
                  onChange={(event) => setTable(event.target.value)}
                  disabled={orderType !== "Dine-in"}
                  aria-label="Pilih meja"
                >
                  <option>Meja 08</option>
                  <option>Meja 03</option>
                  <option>Meja 11</option>
                  <option>Meja 14</option>
                </select>
                <input
                  value={customer}
                  onChange={(event) => setCustomer(event.target.value)}
                  placeholder="Nama pelanggan"
                  aria-label="Nama pelanggan"
                />
              </div>
              <div className="pos-menu-toolbar">
                <SearchBox
                  value={menuQuery}
                  onChange={setMenuQuery}
                  placeholder="Cari menu..."
                />
                <div className="pos-category-scroll">
                  {menuCategories.map((item) => (
                    <button
                      key={item}
                      className={menuCategory === item ? "active" : ""}
                      onClick={() => setMenuCategory(item)}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
              <div className="pos-menu-grid">
                {filteredMenu.map((item) => (
                  <button
                    className="pos-menu-card"
                    key={item.id}
                    onClick={() => addItem(item)}
                  >
                    <div
                      className={`menu-code tone-${item.category.toLowerCase().replace(" ", "-")}`}
                    >
                      {item.code}
                    </div>
                    <div className="pos-menu-info">
                      <span>{item.category}</span>
                      <strong>{item.name}</strong>
                      <small>
                        {item.station} • {item.available} porsi
                      </small>
                      <b>{rupiah(item.price)}</b>
                    </div>
                    <i>
                      <Icon name="plus" size={14} />
                    </i>
                    {item.available < 20 && <em>Sisa {item.available}</em>}
                  </button>
                ))}
              </div>
            </section>
            <aside className="pos-cart-panel">
              <div className="cart-heading">
                <div>
                  <span className="eyebrow">CURRENT ORDER</span>
                  <h2>Order Baru</h2>
                  <p>
                    {orderType} • {orderType === "Dine-in" ? table : orderType}{" "}
                    • {customer || "Pelanggan umum"}
                  </p>
                </div>
                <span className="cart-count">{itemCount} item</span>
              </div>
              <div className="cart-items">
                {cart.length ? (
                  cart.map((item) => (
                    <article key={item.id}>
                      <div className="cart-item-main">
                        <strong>{item.name}</strong>
                        <small>
                          {item.station} • Harga satuan {rupiah(item.price)}
                        </small>
                        <button
                          onClick={() =>
                            onNotify(`Modifier ${item.name} siap dipilih.`)
                          }
                        >
                          + Modifier / catatan
                        </button>
                      </div>
                      <div className="quantity-stepper">
                        <button onClick={() => changeQuantity(item.id, -1)}>
                          −
                        </button>
                        <span>{item.qty}</span>
                        <button onClick={() => changeQuantity(item.id, 1)}>
                          +
                        </button>
                      </div>
                      <b>{rupiah(item.price * item.qty)}</b>
                    </article>
                  ))
                ) : (
                  <div className="empty-cart">
                    <span>
                      <Icon name="cart" />
                    </span>
                    <strong>Belum ada menu</strong>
                    <small>Pilih menu untuk memulai pesanan baru.</small>
                  </div>
                )}
              </div>
              <div className="cart-promo">
                <button
                  className={discountApplied ? "active" : ""}
                  onClick={() => setDiscountApplied((value) => !value)}
                >
                  <span>%</span>
                  <div>
                    <strong>
                      {discountApplied ? "Diskon 10% aktif" : "Tambah diskon"}
                    </strong>
                    <small>Promo atau complimentary</small>
                  </div>
                </button>
                <button
                  onClick={() => onNotify("Pesanan ditandai untuk split bill.")}
                >
                  <Icon name="grid" size={14} />
                  <div>
                    <strong>Split Bill</strong>
                    <small>Pisahkan pembayaran</small>
                  </div>
                </button>
              </div>
              <div className="cart-totals">
                <div>
                  <span>Subtotal</span>
                  <b>{rupiah(subtotal)}</b>
                </div>
                {discountApplied && (
                  <div className="discount-row">
                    <span>Diskon 10%</span>
                    <b>− {rupiah(discount)}</b>
                  </div>
                )}
                <div>
                  <span>Service 5%</span>
                  <b>{rupiah(service)}</b>
                </div>
                <div>
                  <span>Pajak 10%</span>
                  <b>{rupiah(tax)}</b>
                </div>
                <div className="grand-total">
                  <span>Total Pembayaran</span>
                  <strong>{rupiah(total)}</strong>
                </div>
              </div>
              <div className="cart-actions">
                <button
                  className="secondary-button"
                  disabled={!cart.length}
                  onClick={() =>
                    onNotify(`ORD-1051 dikirim ke KDS untuk ${table}.`)
                  }
                >
                  <Icon name="kitchen" /> Kirim ke KDS
                </button>
                <button
                  className="primary-button"
                  disabled={!cart.length}
                  onClick={() => setPaymentOpen(true)}
                >
                  Bayar {rupiah(total)} <Icon name="arrow" size={14} />
                </button>
              </div>
              {paymentOpen && (
                <div className="payment-sheet">
                  <div className="payment-sheet-head">
                    <div>
                      <span className="eyebrow">PEMBAYARAN</span>
                      <h3>{rupiah(total)}</h3>
                      <p>
                        {itemCount} item • {customer || "Pelanggan umum"}
                      </p>
                    </div>
                    <button
                      className="icon-button"
                      onClick={() => setPaymentOpen(false)}
                    >
                      <Icon name="close" />
                    </button>
                  </div>
                  <div className="payment-methods">
                    {[
                      {
                        name: "QRIS",
                        note: "Scan kode pembayaran",
                        icon: "QR",
                      },
                      {
                        name: "Tunai",
                        note: "Input uang diterima",
                        icon: "Rp",
                      },
                      {
                        name: "Debit BCA",
                        note: "EDC Terminal 01",
                        icon: "DC",
                      },
                      {
                        name: "Kartu Kredit",
                        note: "Visa / Mastercard",
                        icon: "CC",
                      },
                    ].map((method) => (
                      <button
                        key={method.name}
                        className={
                          paymentMethod === method.name ? "active" : ""
                        }
                        onClick={() => setPaymentMethod(method.name)}
                      >
                        <span>{method.icon}</span>
                        <div>
                          <strong>{method.name}</strong>
                          <small>{method.note}</small>
                        </div>
                        {paymentMethod === method.name && (
                          <Icon name="check" size={15} />
                        )}
                      </button>
                    ))}
                  </div>
                  <div className="payment-summary">
                    <span>Total dibayar</span>
                    <strong>{rupiah(total)}</strong>
                  </div>
                  <button
                    className="primary-button confirm-payment"
                    onClick={completePayment}
                  >
                    <Icon name="check" /> Konfirmasi Pembayaran
                  </button>
                </div>
              )}
            </aside>
          </div>
        )}
        {mode === "active" && (
          <div className="pos-mode-content">
            <div className="pos-mode-heading">
              <div>
                <h2>Pesanan Aktif</h2>
                <p>Pantau seluruh order dari kasir hingga disajikan</p>
              </div>
              <div className="active-order-filters">
                <button className="active">Semua 8</button>
                <button>Baru 3</button>
                <button>Diproses 3</button>
                <button>Siap 2</button>
              </div>
            </div>
            <div className="active-order-grid">
              {kitchenOrdersSeed.map((order, index) => {
                const label =
                  order.status === "new"
                    ? "Menunggu Dapur"
                    : order.status === "preparing"
                      ? "Sedang Diproses"
                      : "Siap Disajikan";
                return (
                  <article
                    className={`active-order-card ${order.priority}`}
                    key={order.id}
                  >
                    <header>
                      <div>
                        <span>{order.id}</span>
                        <strong>{order.table}</strong>
                      </div>
                      <Badge status={label} />
                    </header>
                    <div className="active-customer">
                      <span>{order.customer.slice(0, 2).toUpperCase()}</span>
                      <div>
                        <strong>{order.customer}</strong>
                        <small>
                          {order.source} • Masuk {order.created}
                        </small>
                      </div>
                      <b>{order.elapsed}m</b>
                    </div>
                    <div className="active-order-items">
                      {order.items.map((item) => (
                        <div key={item.name}>
                          <span>{item.qty}×</span>
                          <strong>{item.name}</strong>
                          <small>{item.station}</small>
                        </div>
                      ))}
                    </div>
                    <footer>
                      <strong>{rupiah(68000 + index * 19000)}</strong>
                      <button
                        onClick={() =>
                          onNotify(`${order.id} dibuka di Kitchen Display.`)
                        }
                      >
                        Lihat di KDS <Icon name="arrow" size={13} />
                      </button>
                    </footer>
                  </article>
                );
              })}
            </div>
          </div>
        )}
        {mode === "transactions" && (
          <div className="pos-mode-content">
            <div className="pos-mode-heading">
              <div>
                <h2>Riwayat Transaksi</h2>
                <p>Seluruh pembayaran dan aktivitas penjualan hari ini</p>
              </div>
              <button
                className="secondary-button"
                onClick={() =>
                  onNotify("Laporan penjualan hari ini sedang disiapkan.")
                }
              >
                Export Penjualan
              </button>
            </div>
            <div className="transaction-summary">
              <div>
                <span>Gross sales</span>
                <strong>Rp19,28 jt</strong>
                <small>Sebelum diskon & refund</small>
              </div>
              <div>
                <span>Diskon</span>
                <strong>Rp412 rb</strong>
                <small>2,1% dari gross sales</small>
              </div>
              <div>
                <span>Refund</span>
                <strong>Rp228 rb</strong>
                <small>3 transaksi</small>
              </div>
              <div>
                <span>Net sales</span>
                <strong>Rp18,64 jt</strong>
                <small>Setelah penyesuaian</small>
              </div>
            </div>
            <div className="transaction-toolbar">
              <SearchBox
                value={menuQuery}
                onChange={setMenuQuery}
                placeholder="Cari transaksi atau pelanggan..."
              />
              <select>
                <option>Semua Pembayaran</option>
                <option>QRIS</option>
                <option>Tunai</option>
                <option>Debit BCA</option>
              </select>
              <select>
                <option>Semua Status</option>
                <option>Selesai</option>
                <option>Refund Sebagian</option>
              </select>
            </div>
            <div className="table-wrap">
              <table className="sales-table">
                <thead>
                  <tr>
                    <th>No. Transaksi</th>
                    <th>Waktu</th>
                    <th>Pelanggan</th>
                    <th>Tipe</th>
                    <th>Total</th>
                    <th>Pembayaran</th>
                    <th>Kasir</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {salesTransactions
                    .filter((item) =>
                      `${item.id} ${item.customer}`
                        .toLowerCase()
                        .includes(menuQuery.toLowerCase()),
                    )
                    .map((item) => (
                      <tr
                        className="clickable-row"
                        key={item.id}
                        onClick={() => onSelect(item)}
                      >
                        <td>
                          <b>{item.id}</b>
                          <small>{item.orderId}</small>
                        </td>
                        <td>{item.time}</td>
                        <td>
                          <b>{item.customer}</b>
                          <small>{item.table}</small>
                        </td>
                        <td>{item.type}</td>
                        <td>
                          <b>{rupiah(item.total)}</b>
                        </td>
                        <td>{item.payment}</td>
                        <td>{item.cashier}</td>
                        <td>
                          <Badge status={item.status} />
                        </td>
                        <td>
                          <button
                            className="row-action"
                            onClick={(event) => {
                              event.stopPropagation();
                              onSelect(item);
                            }}
                          >
                            <Icon name="arrow" size={15} />
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {mode === "shift" && (
          <div className="pos-mode-content">
            <div className="shift-banner">
              <div>
                <span className="shift-avatar">SP</span>
                <div>
                  <span className="eyebrow">SHIFT AKTIF</span>
                  <h2>Salsa Putri • POS 01</h2>
                  <p>Dibuka 24 Agustus 2026, 15:00 • Durasi 4 jam 30 menit</p>
                </div>
              </div>
              <div>
                <i /> Kasir Online
              </div>
            </div>
            <div className="shift-grid">
              <section>
                <div className="shift-section-head">
                  <div>
                    <h3>Ringkasan Kas</h3>
                    <p>Perkiraan saldo sebelum tutup shift</p>
                  </div>
                  <Badge status="Sesuai" />
                </div>
                <div className="cash-summary">
                  <div>
                    <span>Modal awal</span>
                    <strong>Rp1.500.000</strong>
                  </div>
                  <div>
                    <span>Penjualan tunai</span>
                    <strong>Rp4.285.000</strong>
                  </div>
                  <div>
                    <span>Pengeluaran kas</span>
                    <strong>− Rp150.000</strong>
                  </div>
                  <div className="cash-total">
                    <span>Ekspektasi uang kas</span>
                    <strong>Rp5.635.000</strong>
                  </div>
                </div>
                <button
                  className="primary-button full-button"
                  onClick={() =>
                    onNotify("Proses hitung kas fisik siap dimulai.")
                  }
                >
                  <Icon name="check" /> Mulai Tutup Shift
                </button>
              </section>
              <section>
                <div className="shift-section-head">
                  <div>
                    <h3>Metode Pembayaran</h3>
                    <p>Komposisi penjualan shift ini</p>
                  </div>
                </div>
                <div className="payment-breakdown">
                  {[
                    {
                      name: "QRIS",
                      value: 6240000,
                      count: 28,
                      pct: 38,
                      color: "#377865",
                    },
                    {
                      name: "Debit / Kredit",
                      value: 4915000,
                      count: 19,
                      pct: 30,
                      color: "#5d8297",
                    },
                    {
                      name: "Tunai",
                      value: 4285000,
                      count: 24,
                      pct: 26,
                      color: "#c08b3e",
                    },
                    {
                      name: "Online Delivery",
                      value: 990000,
                      count: 7,
                      pct: 6,
                      color: "#816b90",
                    },
                  ].map((item) => (
                    <div key={item.name}>
                      <div>
                        <span>
                          {item.name}
                          <small>{item.count} transaksi</small>
                        </span>
                        <strong>{rupiah(item.value)}</strong>
                      </div>
                      <div>
                        <i
                          style={{
                            width: `${item.pct}%`,
                            background: item.color,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
              <section>
                <div className="shift-section-head">
                  <div>
                    <h3>Aktivitas Kasir</h3>
                    <p>Kontrol transaksi sensitif</p>
                  </div>
                </div>
                <div className="cashier-activity">
                  <div>
                    <span className="activity-icon discount">%</span>
                    <div>
                      <strong>Diskon diberikan</strong>
                      <small>12 transaksi • Rp412.000</small>
                    </div>
                    <b>Normal</b>
                  </div>
                  <div>
                    <span className="activity-icon refund">↺</span>
                    <div>
                      <strong>Refund diproses</strong>
                      <small>3 transaksi • Rp228.000</small>
                    </div>
                    <b>Disetujui</b>
                  </div>
                  <div>
                    <span className="activity-icon void">×</span>
                    <div>
                      <strong>Void item</strong>
                      <small>5 item • Supervisor approval</small>
                    </div>
                    <b>5 aktivitas</b>
                  </div>
                </div>
              </section>
              <section>
                <div className="shift-section-head">
                  <div>
                    <h3>Serah Terima Shift</h3>
                    <p>Checklist sebelum kasir ditutup</p>
                  </div>
                </div>
                <div className="shift-checklist">
                  <label>
                    <input type="checkbox" defaultChecked /> Semua transaksi
                    tersinkron
                  </label>
                  <label>
                    <input type="checkbox" defaultChecked /> Void dan refund
                    sudah direview
                  </label>
                  <label>
                    <input type="checkbox" /> Uang kas fisik sudah dihitung
                  </label>
                  <label>
                    <input type="checkbox" /> Berita acara serah terima dibuat
                  </label>
                </div>
                <p className="detail-note">
                  Shift dapat ditutup setelah seluruh checklist selesai dan
                  saldo kas fisik dicocokkan dengan sistem.
                </p>
              </section>
            </div>
          </div>
        )}
      </section>
    </>
  );
}

// Legacy visual reference retained until Stock Transfer and Waste become connected modules.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function InventoryControl({
  onSelect,
  onNotify,
}: {
  onSelect: (item: (typeof inventoryItems)[number]) => void;
  onNotify: (message: string) => void;
}) {
  const [mode, setMode] = useState<
    "overview" | "movements" | "transfers" | "waste"
  >("overview");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Semua Kategori");
  const [stockStatus, setStockStatus] = useState("Semua Status");
  const filtered = inventoryItems.filter(
    (item) =>
      `${item.name} ${item.id} ${item.location}`
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (category === "Semua Kategori" || item.category === category) &&
      (stockStatus === "Semua Status" || item.status === stockStatus),
  );
  const totalValue = inventoryItems.reduce(
    (sum, item) => sum + item.onHand * item.unitCost,
    0,
  );
  const availableUnits = inventoryItems.reduce(
    (sum, item) => sum + Math.max(0, item.onHand - item.reserved),
    0,
  );
  const categories = [
    "Semua Kategori",
    ...Array.from(new Set(inventoryItems.map((item) => item.category))),
  ];
  const categoryValues = Array.from(
    new Set(inventoryItems.map((item) => item.category)),
  )
    .map((name) => ({
      name,
      value: inventoryItems
        .filter((item) => item.category === name)
        .reduce((sum, item) => sum + item.onHand * item.unitCost, 0),
    }))
    .sort((a, b) => b.value - a.value);
  const maxCategoryValue = Math.max(
    ...categoryValues.map((item) => item.value),
  );
  const transfers = [
    {
      id: "TRF-240824-011",
      from: "Main Warehouse",
      to: "Hot Kitchen",
      items: 6,
      requested: "18:10",
      status: "Dalam Proses",
      owner: "Dimas",
    },
    {
      id: "TRF-240824-010",
      from: "Main Warehouse",
      to: "Bar Store",
      items: 4,
      requested: "16:35",
      status: "Terkirim",
      owner: "Raka",
    },
    {
      id: "TRF-240824-009",
      from: "Cold Storage",
      to: "Prep Kitchen",
      items: 3,
      requested: "14:20",
      status: "Terkirim",
      owner: "Sari",
    },
  ];
  const wasteRecords = [
    {
      id: "WST-240824-004",
      item: "Romaine Lettuce",
      quantity: "0,8 kg",
      reason: "Layunya melebihi standar",
      value: 33600,
      area: "Cold Kitchen",
      status: "Disetujui",
    },
    {
      id: "WST-240824-003",
      item: "Fresh Milk",
      quantity: "1,5 liter",
      reason: "Sisa prep melewati holding time",
      value: 37500,
      area: "Bar",
      status: "Menunggu Review",
    },
    {
      id: "WST-230824-012",
      item: "Chicken Breast",
      quantity: "0,6 kg",
      reason: "Trim produksi",
      value: 39000,
      area: "Hot Kitchen",
      status: "Disetujui",
    },
  ];
  const tabs = [
    { id: "overview", label: "Stock Overview" },
    { id: "movements", label: "Kartu Stok" },
    { id: "transfers", label: "Transfer Stok" },
    { id: "waste", label: "Waste & Adjustment" },
  ] as const;
  return (
    <>
      <div className="inventory-sync">
        <div>
          <span className="sync-icon">
            <Icon name="inventory" />
          </span>
          <div>
            <strong>Inventory tersinkron otomatis</strong>
            <small>
              Goods Receipt menambah stok • KDS mengurangi stok berdasarkan
              resep aktif
            </small>
          </div>
        </div>
        <span className="sync-time">
          <i /> Terakhir sinkron 19:30:12
        </span>
      </div>
      <div className="stats-grid inventory-stats">
        <article className="stat-card">
          <div className="stat-icon green">
            <Icon name="inventory" />
          </div>
          <div>
            <span>Nilai persediaan</span>
            <strong>{rupiah(totalValue)}</strong>
            <small>128 SKU aktif</small>
          </div>
        </article>
        <article className="stat-card">
          <div className="stat-icon blue">
            <Icon name="box" />
          </div>
          <div>
            <span>Stok tersedia</span>
            <strong>{availableUnits.toFixed(1)}</strong>
            <small>Setelah reservasi produksi</small>
          </div>
        </article>
        <article className="stat-card">
          <div className="stat-icon gold">
            <Icon name="bell" />
          </div>
          <div>
            <span>Perlu perhatian</span>
            <strong>9 item</strong>
            <small>2 kritis • 7 menipis</small>
          </div>
        </article>
        <article className="stat-card">
          <div className="stat-icon purple">
            <Icon name="recipe" />
          </div>
          <div>
            <span>Waste bulan ini</span>
            <strong>Rp1,24 jt</strong>
            <small>1,8% dari pemakaian</small>
          </div>
        </article>
      </div>
      <section className="panel inventory-workspace">
        <div className="inventory-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={mode === tab.id ? "active" : ""}
              onClick={() => setMode(tab.id)}
            >
              {tab.label}
              {tab.id === "overview" && <span>128</span>}
              {tab.id === "waste" && <span className="warning-count">3</span>}
            </button>
          ))}
        </div>
        {mode === "overview" && (
          <>
            <div className="inventory-overview-grid">
              <section>
                <div className="subpanel-heading">
                  <div>
                    <h2>Nilai Stok per Kategori</h2>
                    <p>Komposisi nilai persediaan saat ini</p>
                  </div>
                  <span>{rupiah(totalValue)}</span>
                </div>
                <div className="category-stock-bars">
                  {categoryValues.map((item) => (
                    <div key={item.name}>
                      <div>
                        <span>{item.name}</span>
                        <strong>{rupiah(item.value)}</strong>
                      </div>
                      <div>
                        <i
                          style={{
                            width: `${(item.value / maxCategoryValue) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
              <section>
                <div className="subpanel-heading">
                  <div>
                    <h2>Prioritas Hari Ini</h2>
                    <p>Risiko stok dan masa simpan</p>
                  </div>
                  <button
                    onClick={() =>
                      onNotify("Semua peringatan stok ditandai sudah dibaca.")
                    }
                  >
                    Tandai dibaca
                  </button>
                </div>
                <div className="inventory-alerts">
                  <article className="critical">
                    <span>!</span>
                    <div>
                      <strong>Beef Tenderloin di bawah minimum</strong>
                      <small>
                        Tersedia 6,3 kg • Kebutuhan 2 hari ke depan 9,6 kg
                      </small>
                    </div>
                    <button
                      onClick={() =>
                        onNotify("Draft PO Beef Tenderloin berhasil dibuat.")
                      }
                    >
                      Buat PO
                    </button>
                  </article>
                  <article className="expiry">
                    <span>2d</span>
                    <div>
                      <strong>Romaine Lettuce mendekati kedaluwarsa</strong>
                      <small>6,2 kg • Gunakan sebelum 25 Agustus</small>
                    </div>
                    <button onClick={() => onSelect(inventoryItems[4])}>
                      Lihat
                    </button>
                  </article>
                  <article className="warning">
                    <span>↑</span>
                    <div>
                      <strong>Harga Avocado Hass naik 14%</strong>
                      <small>Perubahan dari supplier utama hari ini</small>
                    </div>
                    <button
                      onClick={() =>
                        onNotify("Perbandingan supplier Avocado Hass dibuka.")
                      }
                    >
                      Bandingkan
                    </button>
                  </article>
                </div>
              </section>
            </div>
            <div className="inventory-toolbar">
              <SearchBox
                value={query}
                onChange={setQuery}
                placeholder="Cari bahan, kode, atau lokasi penyimpanan..."
              />
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
              >
                {categories.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
              <select
                value={stockStatus}
                onChange={(event) => setStockStatus(event.target.value)}
              >
                <option>Semua Status</option>
                <option>Aman</option>
                <option>Menipis</option>
                <option>Stok Kritis</option>
              </select>
              <button
                className="secondary-button"
                onClick={() => setMode("transfers")}
              >
                <Icon name="truck" /> Transfer Stok
              </button>
            </div>
            <div className="table-wrap">
              <table className="inventory-table">
                <thead>
                  <tr>
                    <th>Bahan Baku</th>
                    <th>Lokasi</th>
                    <th>Stok Fisik</th>
                    <th>Reservasi</th>
                    <th>Tersedia</th>
                    <th>Min. Stok</th>
                    <th>Coverage</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item) => {
                    const available = item.onHand - item.reserved;
                    const coverage = available / item.averageUse;
                    return (
                      <tr
                        className="clickable-row"
                        key={item.id}
                        onClick={() => onSelect(item)}
                      >
                        <td>
                          <b>{item.name}</b>
                          <small>
                            {item.id} • {item.category}
                          </small>
                        </td>
                        <td>{item.location}</td>
                        <td>
                          <b>
                            {item.onHand.toLocaleString("id-ID")} {item.unit}
                          </b>
                        </td>
                        <td>
                          {item.reserved.toLocaleString("id-ID")} {item.unit}
                        </td>
                        <td>
                          <b>
                            {available.toLocaleString("id-ID")} {item.unit}
                          </b>
                        </td>
                        <td>
                          {item.minimum.toLocaleString("id-ID")} {item.unit}
                        </td>
                        <td>
                          <span
                            className={`coverage-chip ${coverage < 2 ? "critical" : coverage < 3 ? "warning" : "safe"}`}
                          >
                            {coverage.toFixed(1)} hari
                          </span>
                        </td>
                        <td>
                          <Badge status={item.status} />
                        </td>
                        <td>
                          <button
                            className="row-action"
                            aria-label={`Detail ${item.name}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              onSelect(item);
                            }}
                          >
                            <Icon name="arrow" size={15} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <div className="empty-state">
                  <Icon name="search" size={24} />
                  <strong>Stok tidak ditemukan</strong>
                  <span>Ubah kata kunci atau filter yang digunakan.</span>
                </div>
              )}
            </div>
            <div className="inventory-table-footer">
              <span>Menampilkan {filtered.length} dari 128 item inventori</span>
              <div>
                <button>‹</button>
                <button className="active">1</button>
                <button>2</button>
                <button>3</button>
                <button>›</button>
              </div>
            </div>
          </>
        )}
        {mode === "movements" && (
          <div className="inventory-mode-content">
            <div className="mode-heading">
              <div>
                <span className="mode-icon">
                  <Icon name="inventory" />
                </span>
                <div>
                  <h2>Kartu Stok Terbaru</h2>
                  <p>Jejak transaksi inventori dari seluruh area operasional</p>
                </div>
              </div>
              <button
                className="secondary-button"
                onClick={() => onNotify("Laporan kartu stok sedang disiapkan.")}
              >
                Export Laporan
              </button>
            </div>
            <div className="movement-summary">
              <div>
                <span>Saldo awal hari ini</span>
                <strong>Rp18,42 jt</strong>
              </div>
              <div className="in">
                <span>Stok masuk</span>
                <strong>+ Rp4,86 jt</strong>
              </div>
              <div className="out">
                <span>Stok keluar</span>
                <strong>− Rp2,14 jt</strong>
              </div>
              <div>
                <span>Saldo berjalan</span>
                <strong>Rp21,14 jt</strong>
              </div>
            </div>
            <div className="movement-list">
              <div className="movement-head">
                <span>Waktu & Referensi</span>
                <span>Jenis Transaksi</span>
                <span>Petugas / Sumber</span>
                <span>Perubahan</span>
                <span>Saldo</span>
              </div>
              {inventoryMovements.map((item) => (
                <article key={item.reference}>
                  <div>
                    <strong>{item.time}</strong>
                    <small>{item.reference}</small>
                  </div>
                  <span
                    className={`movement-type ${item.quantity > 0 ? "in" : item.type.includes("Waste") ? "waste" : "out"}`}
                  >
                    {item.type}
                  </span>
                  <div>
                    <strong>{item.user}</strong>
                    <small>24 Agustus 2026</small>
                  </div>
                  <b className={item.quantity > 0 ? "positive" : "negative"}>
                    {item.quantity > 0 ? "+" : ""}
                    {item.quantity.toLocaleString("id-ID")} {item.unit}
                  </b>
                  <strong>
                    {item.balance.toLocaleString("id-ID")} {item.unit}
                  </strong>
                </article>
              ))}
            </div>
          </div>
        )}
        {mode === "transfers" && (
          <div className="inventory-mode-content">
            <div className="mode-heading">
              <div>
                <span className="mode-icon">
                  <Icon name="truck" />
                </span>
                <div>
                  <h2>Transfer Antar-Area</h2>
                  <p>Perpindahan bahan dari gudang menuju area produksi</p>
                </div>
              </div>
              <button
                className="primary-button"
                onClick={() =>
                  onNotify("Form transfer stok baru siap digunakan.")
                }
              >
                <Icon name="plus" /> Buat Transfer
              </button>
            </div>
            <div className="transfer-flow-card">
              <div>
                <span>Main Warehouse</span>
                <strong>Gudang Utama</strong>
              </div>
              <i>
                <Icon name="arrow" />
              </i>
              <div>
                <span>Area Produksi</span>
                <strong>Kitchen • Bar • Pastry</strong>
              </div>
              <p>
                Setiap transfer membutuhkan konfirmasi pengirim dan penerima
                agar saldo lokasi tetap akurat.
              </p>
            </div>
            <div className="transfer-list">
              {transfers.map((item) => (
                <article key={item.id}>
                  <span className="transfer-box">
                    <Icon name="box" />
                  </span>
                  <div className="transfer-main">
                    <strong>{item.id}</strong>
                    <small>
                      {item.items} item • Diminta {item.requested} oleh{" "}
                      {item.owner}
                    </small>
                    <div>
                      <span>{item.from}</span>
                      <Icon name="arrow" size={13} />
                      <b>{item.to}</b>
                    </div>
                  </div>
                  <Badge status={item.status} />
                  <button
                    className="secondary-button"
                    onClick={() =>
                      onNotify(`${item.id} dibuka untuk pemeriksaan.`)
                    }
                  >
                    Detail
                  </button>
                </article>
              ))}
            </div>
          </div>
        )}
        {mode === "waste" && (
          <div className="inventory-mode-content">
            <div className="mode-heading">
              <div>
                <span className="mode-icon waste">
                  <Icon name="recipe" />
                </span>
                <div>
                  <h2>Waste & Stock Adjustment</h2>
                  <p>Catat selisih fisik, kerusakan, dan bahan kedaluwarsa</p>
                </div>
              </div>
              <button
                className="primary-button"
                onClick={() =>
                  onNotify("Form pencatatan waste siap digunakan.")
                }
              >
                <Icon name="plus" /> Catat Waste
              </button>
            </div>
            <div className="waste-kpis">
              <div>
                <span>Waste bulan berjalan</span>
                <strong>Rp1.240.500</strong>
                <small>1,8% dari total pemakaian</small>
              </div>
              <div>
                <span>Target maksimum</span>
                <strong>2,5%</strong>
                <small className="positive">Masih di bawah target</small>
              </div>
              <div>
                <span>Menunggu review</span>
                <strong>3 transaksi</strong>
                <small>Perlu persetujuan supervisor</small>
              </div>
            </div>
            <div className="waste-list">
              <div className="waste-list-head">
                <span>Item & Referensi</span>
                <span>Area</span>
                <span>Alasan</span>
                <span>Nilai</span>
                <span>Status</span>
                <span />
              </div>
              {wasteRecords.map((item) => (
                <article key={item.id}>
                  <div>
                    <strong>{item.item}</strong>
                    <small>
                      {item.id} • {item.quantity}
                    </small>
                  </div>
                  <span>{item.area}</span>
                  <p>{item.reason}</p>
                  <b>{rupiah(item.value)}</b>
                  <Badge status={item.status} />
                  <button
                    className="row-action"
                    onClick={() => onNotify(`${item.id} dibuka untuk review.`)}
                  >
                    <Icon name="arrow" size={15} />
                  </button>
                </article>
              ))}
            </div>
          </div>
        )}
      </section>
    </>
  );
}

function KitchenDisplay({
  onSelect,
  onNotify,
}: {
  onSelect: (order: (typeof kitchenOrdersSeed)[number]) => void;
  onNotify: (message: string) => void;
}) {
  const [orders, setOrders] = useState(kitchenOrdersSeed);
  const [station, setStation] = useState("Semua Station");
  const [soundOn, setSoundOn] = useState(true);
  const [servedCount, setServedCount] = useState(18);
  const stations = [
    "Semua Station",
    "Hot Kitchen",
    "Cold Kitchen",
    "Bar",
    "Pastry",
  ];
  const visibleOrders = orders.filter(
    (order) =>
      station === "Semua Station" ||
      order.items.some((item) => item.station === station),
  );
  const columns = [
    {
      id: "new",
      title: "Pesanan Baru",
      subtitle: "Perlu dikonfirmasi",
      tone: "new",
    },
    {
      id: "preparing",
      title: "Sedang Diproses",
      subtitle: "Dalam produksi",
      tone: "preparing",
    },
    {
      id: "ready",
      title: "Siap Disajikan",
      subtitle: "Menunggu waiter",
      tone: "ready",
    },
  ];
  function advanceOrder(id: string, currentStatus: string) {
    const order = orders.find((item) => item.id === id);
    if (!order) return;
    if (currentStatus === "ready") {
      setOrders((current) => current.filter((item) => item.id !== id));
      setServedCount((count) => count + 1);
      onNotify(`${id} selesai dan sudah disajikan.`);
      return;
    }
    const next = currentStatus === "new" ? "preparing" : "ready";
    setOrders((current) =>
      current.map((item) =>
        item.id === id ? { ...item, status: next } : item,
      ),
    );
    onNotify(
      currentStatus === "new"
        ? `${id} mulai diproses di dapur.`
        : `${id} siap disajikan.`,
    );
  }
  return (
    <>
      <div className="kds-topline">
        <div className="live-status">
          <i />
          <div>
            <strong>Kitchen Online</strong>
            <span>Sinkron dengan POS • Diperbarui sekarang</span>
          </div>
        </div>
        <div className="kds-clock">
          <span>Senin, 24 Agustus</span>
          <strong>19:30</strong>
        </div>
      </div>
      <div className="stats-grid kds-stats">
        <article className="stat-card">
          <div className="stat-icon gold">
            <Icon name="kitchen" />
          </div>
          <div>
            <span>Pesanan aktif</span>
            <strong>{orders.length}</strong>
            <small>
              {orders.filter((order) => order.status === "new").length} belum
              dimulai
            </small>
          </div>
        </article>
        <article className="stat-card">
          <div className="stat-icon green">
            <Icon name="check" />
          </div>
          <div>
            <span>Selesai hari ini</span>
            <strong>{servedCount}</strong>
            <small>Sejak shift pukul 15.00</small>
          </div>
        </article>
        <article className="stat-card">
          <div className="stat-icon blue">
            <Icon name="grid" />
          </div>
          <div>
            <span>Rata-rata produksi</span>
            <strong>12:34</strong>
            <small>Target di bawah 15 menit</small>
          </div>
        </article>
        <article className="stat-card">
          <div className="stat-icon purple">
            <Icon name="bell" />
          </div>
          <div>
            <span>Ketepatan SLA</span>
            <strong>91%</strong>
            <small>2 pesanan melewati target</small>
          </div>
        </article>
      </div>
      <section className="panel kds-controlbar">
        <div className="station-filters">
          {stations.map((item) => (
            <button
              key={item}
              className={station === item ? "active" : ""}
              onClick={() => setStation(item)}
            >
              {item}
              {item !== "Semua Station" && (
                <span>
                  {
                    orders.filter((order) =>
                      order.items.some((menu) => menu.station === item),
                    ).length
                  }
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="kds-tools">
          <button
            className={soundOn ? "sound-on" : ""}
            onClick={() => setSoundOn((value) => !value)}
          >
            <Icon name="bell" size={15} />
            {soundOn ? "Suara aktif" : "Suara mati"}
          </button>
          <span className="shift-chip">Shift Malam</span>
        </div>
      </section>
      <div className="kds-board">
        {columns.map((column) => {
          const tickets = visibleOrders.filter(
            (order) => order.status === column.id,
          );
          return (
            <section className={`kds-column ${column.tone}`} key={column.id}>
              <header>
                <div>
                  <span className="column-dot" />
                  <div>
                    <strong>{column.title}</strong>
                    <small>{column.subtitle}</small>
                  </div>
                </div>
                <b>{tickets.length}</b>
              </header>
              <div className="ticket-stack">
                {tickets.length ? (
                  tickets.map((order) => (
                    <article
                      className={`kitchen-ticket ${order.priority}`}
                      key={order.id}
                    >
                      <div className="ticket-head">
                        <div>
                          <span>{order.id}</span>
                          <strong>{order.table}</strong>
                        </div>
                        <div className={`ticket-timer ${order.priority}`}>
                          <Icon name="bell" size={13} />
                          {order.elapsed} menit
                        </div>
                      </div>
                      <div className="ticket-meta">
                        <span>{order.customer}</span>
                        <i>•</i>
                        <span>{order.source}</span>
                        <i>•</i>
                        <span>{order.created}</span>
                      </div>
                      <div className="ticket-items">
                        {order.items.map((item, index) => (
                          <div key={`${item.name}-${index}`}>
                            <span className="item-qty">{item.qty}×</span>
                            <div>
                              <strong>{item.name}</strong>
                              <small>{item.modifier}</small>
                              <em>{item.station}</em>
                            </div>
                          </div>
                        ))}
                      </div>
                      {order.priority === "rush" && (
                        <div className="rush-note">
                          <b>RUSH</b> Pelanggan meminta dipercepat
                        </div>
                      )}
                      <div className="ticket-actions">
                        <button
                          className="ticket-detail"
                          onClick={() => onSelect(order)}
                        >
                          Detail
                        </button>
                        <button
                          className={`ticket-primary ${column.tone}`}
                          onClick={() => advanceOrder(order.id, order.status)}
                        >
                          {order.status === "new"
                            ? "Mulai Proses"
                            : order.status === "preparing"
                              ? "Siap Disajikan"
                              : "Sudah Diantar"}
                          <Icon
                            name={order.status === "ready" ? "check" : "arrow"}
                            size={14}
                          />
                        </button>
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="empty-column">
                    <span>
                      <Icon name="check" />
                    </span>
                    <strong>Antrean kosong</strong>
                    <small>Tidak ada pesanan pada tahap ini</small>
                  </div>
                )}
              </div>
            </section>
          );
        })}
      </div>
      <div className="kds-bottom-grid">
        <section className="panel station-load">
          <div className="panel-heading">
            <div>
              <h2>Beban Station</h2>
              <p>Jumlah item yang sedang ditangani</p>
            </div>
          </div>
          <div className="station-load-list">
            {[
              { name: "Hot Kitchen", load: 7, max: 10, tone: "#b9685d" },
              { name: "Cold Kitchen", load: 2, max: 8, tone: "#4d8774" },
              { name: "Bar", load: 6, max: 12, tone: "#6c8fa3" },
              { name: "Pastry", load: 0, max: 6, tone: "#a78655" },
            ].map((item) => (
              <div key={item.name}>
                <div>
                  <span>{item.name}</span>
                  <strong>
                    {item.load} / {item.max} item
                  </strong>
                </div>
                <div className="station-load-bar">
                  <i
                    style={{
                      width: `${(item.load / item.max) * 100}%`,
                      background: item.tone,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
        <section className="panel service-alerts">
          <div className="panel-heading">
            <div>
              <h2>Peringatan Layanan</h2>
              <p>Prioritas yang harus ditangani</p>
            </div>
          </div>
          <div className="service-alert-list">
            <div className="critical">
              <span>22m</span>
              <div>
                <strong>ORD-1041 • Meja 02</strong>
                <small>Sudah siap, belum diantar oleh waiter</small>
              </div>
              <button
                onClick={() =>
                  onNotify("Waiter telah dipanggil untuk ORD-1041.")
                }
              >
                Panggil Waiter
              </button>
            </div>
            <div className="warning">
              <span>16m</span>
              <div>
                <strong>ORD-1044 • Meja 11</strong>
                <small>Mendekati batas waktu produksi</small>
              </div>
              <button
                onClick={() => onNotify("ORD-1044 ditandai sebagai prioritas.")}
              >
                Prioritaskan
              </button>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

// Retained as a visual reference while the connected module is stabilized.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function RecipeFoodCost({
  query,
  setQuery,
  onSelect,
}: {
  query: string;
  setQuery: (value: string) => void;
  onSelect: (recipe: (typeof menuRecipes)[number]) => void;
}) {
  const [mode, setMode] = useState<"menu" | "engineering">("menu");
  const [category, setCategory] = useState("Semua Kategori");
  const filtered = menuRecipes.filter(
    (menu) =>
      `${menu.name} ${menu.id}`.toLowerCase().includes(query.toLowerCase()) &&
      (category === "Semua Kategori" || menu.category === category),
  );
  const quadrants = [
    {
      name: "Star",
      subtitle: "Populer • Margin tinggi",
      tone: "star",
      note: "Pertahankan kualitas dan ketersediaan",
      menus: menuRecipes.filter((menu) => menu.engineering === "Star"),
    },
    {
      name: "Plowhorse",
      subtitle: "Populer • Margin rendah",
      tone: "plowhorse",
      note: "Evaluasi porsi atau harga jual",
      menus: menuRecipes.filter((menu) => menu.engineering === "Plowhorse"),
    },
    {
      name: "Puzzle",
      subtitle: "Kurang populer • Margin tinggi",
      tone: "puzzle",
      note: "Dorong promosi dan rekomendasi",
      menus: menuRecipes.filter((menu) => menu.engineering === "Puzzle"),
    },
    {
      name: "Dog",
      subtitle: "Kurang populer • Margin rendah",
      tone: "dog",
      note: "Pertimbangkan perbaikan atau eliminasi",
      menus: menuRecipes.filter((menu) => menu.engineering === "Dog"),
    },
  ];
  return (
    <>
      <div className="stats-grid recipe-stats">
        <article className="stat-card">
          <div className="stat-icon green">
            <Icon name="recipe" />
          </div>
          <div>
            <span>Rata-rata food cost</span>
            <strong>31,8%</strong>
            <small>Target maksimal 32%</small>
          </div>
        </article>
        <article className="stat-card">
          <div className="stat-icon gold">
            <Icon name="cart" />
          </div>
          <div>
            <span>Menu aktif</span>
            <strong>42</strong>
            <small>6 kategori menu</small>
          </div>
        </article>
        <article className="stat-card">
          <div className="stat-icon purple">
            <Icon name="grid" />
          </div>
          <div>
            <span>Margin kotor</span>
            <strong>Rp36,9 jt</strong>
            <small>+6,2% dari Juli</small>
          </div>
        </article>
        <article className="stat-card">
          <div className="stat-icon blue">
            <Icon name="bell" />
          </div>
          <div>
            <span>Perlu evaluasi</span>
            <strong>7 menu</strong>
            <small>Food cost di atas target</small>
          </div>
        </article>
      </div>
      <div className="foodcost-insights">
        <section className="panel foodcost-health">
          <div className="panel-heading">
            <div>
              <h2>Kesehatan Food Cost</h2>
              <p>Komposisi 42 menu aktif</p>
            </div>
            <span className="health-label">Agustus 2026</span>
          </div>
          <div className="health-content">
            <div className="foodcost-ring">
              <div>
                <strong>31,8%</strong>
                <span>Rata-rata</span>
              </div>
            </div>
            <div className="health-legend">
              <div>
                <i className="healthy" />
                <span>Sehat</span>
                <strong>24 menu</strong>
              </div>
              <div>
                <i className="watch" />
                <span>Waspada</span>
                <strong>11 menu</strong>
              </div>
              <div>
                <i className="risk" />
                <span>Perlu evaluasi</span>
                <strong>7 menu</strong>
              </div>
            </div>
          </div>
        </section>
        <section className="panel price-alerts">
          <div className="panel-heading">
            <div>
              <h2>Perubahan Harga Bahan</h2>
              <p>Dampak terhadap biaya resep</p>
            </div>
            <button className="text-button">
              Lihat semua <Icon name="arrow" size={15} />
            </button>
          </div>
          <div className="price-alert-list">
            <div>
              <span className="ingredient-icon">AV</span>
              <div>
                <strong>Avocado Hass</strong>
                <small>Rp79.000 → Rp90.000 / kg</small>
              </div>
              <b className="price-up">+13,9%</b>
              <span>3 menu terdampak</span>
            </div>
            <div>
              <span className="ingredient-icon">BT</span>
              <div>
                <strong>Beef Tenderloin</strong>
                <small>Rp232.000 → Rp245.000 / kg</small>
              </div>
              <b className="price-up">+5,6%</b>
              <span>2 menu terdampak</span>
            </div>
            <div>
              <span className="ingredient-icon">CC</span>
              <div>
                <strong>Cooking Cream</strong>
                <small>Rp81.000 → Rp85.000 / liter</small>
              </div>
              <b className="price-up">+4,9%</b>
              <span>5 menu terdampak</span>
            </div>
          </div>
        </section>
      </div>
      <section className="panel menu-cost-panel">
        <div className="menu-tabs">
          <button
            className={mode === "menu" ? "active" : ""}
            onClick={() => setMode("menu")}
          >
            Daftar Menu
          </button>
          <button
            className={mode === "engineering" ? "active" : ""}
            onClick={() => setMode("engineering")}
          >
            Menu Engineering
          </button>
        </div>
        {mode === "menu" ? (
          <>
            <div className="data-toolbar">
              <SearchBox
                value={query}
                onChange={setQuery}
                placeholder="Cari nama atau kode menu..."
              />
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                aria-label="Filter kategori menu"
              >
                <option>Semua Kategori</option>
                <option>Main Course</option>
                <option>Appetizer</option>
                <option>Beverage</option>
              </select>
            </div>
            <div className="table-wrap">
              <table className="recipe-table">
                <thead>
                  <tr>
                    <th>Menu</th>
                    <th>Harga Jual</th>
                    <th>HPP / Porsi</th>
                    <th>Food Cost</th>
                    <th>Margin</th>
                    <th>Estimasi Porsi</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((menu) => (
                    <tr
                      key={menu.id}
                      className="clickable-row"
                      onClick={() => onSelect(menu)}
                    >
                      <td>
                        <b>{menu.name}</b>
                        <small>
                          {menu.id} • {menu.category}
                        </small>
                      </td>
                      <td>
                        <b>{rupiah(menu.price)}</b>
                      </td>
                      <td>{rupiah(menu.cost)}</td>
                      <td>
                        <strong
                          className={
                            menu.foodCost > 35
                              ? "cost-high"
                              : menu.foodCost > 32
                                ? "cost-watch"
                                : "cost-good"
                          }
                        >
                          {menu.foodCost}%
                        </strong>
                      </td>
                      <td>
                        <b>{rupiah(menu.margin)}</b>
                      </td>
                      <td>
                        <span className="portion-chip">
                          {menu.portions} porsi
                        </span>
                      </td>
                      <td>
                        <Badge status={menu.status} />
                      </td>
                      <td>
                        <button
                          className="row-action"
                          onClick={(event) => {
                            event.stopPropagation();
                            onSelect(menu);
                          }}
                          aria-label={`Buka resep ${menu.name}`}
                        >
                          <Icon name="arrow" size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="table-footer">
              Menampilkan {filtered.length} dari {menuRecipes.length} menu
              contoh
            </div>
          </>
        ) : (
          <div className="engineering-wrap">
            <div className="engineering-intro">
              <div>
                <h3>Peta Profitabilitas Menu</h3>
                <p>
                  Klasifikasi berdasarkan popularitas penjualan dan kontribusi
                  margin.
                </p>
              </div>
              <div className="axis-hint">
                <span>Popularitas</span>
                <Icon name="arrow" size={15} />
                <span>Profitabilitas</span>
              </div>
            </div>
            <div className="engineering-grid">
              {quadrants.map((quadrant) => (
                <article
                  className={`engineering-card ${quadrant.tone}`}
                  key={quadrant.name}
                >
                  <div className="engineering-card-head">
                    <div>
                      <span>{quadrant.name}</span>
                      <strong>{quadrant.subtitle}</strong>
                    </div>
                    <b>{quadrant.menus.length}</b>
                  </div>
                  <p>{quadrant.note}</p>
                  <div className="engineering-menus">
                    {quadrant.menus.length ? (
                      quadrant.menus.map((menu) => (
                        <button key={menu.id} onClick={() => onSelect(menu)}>
                          <span>{menu.name}</span>
                          <b>{menu.foodCost}%</b>
                        </button>
                      ))
                    ) : (
                      <span className="no-menu">Belum ada menu</span>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}
      </section>
    </>
  );
}

const orderItems: Record<
  string,
  { name: string; qty: string; price: number; total: number }[]
> = {
  "PO-240824-018": [
    { name: "Avocado Hass", qty: "20 kg", price: 90000, total: 1800000 },
    { name: "Beef Tomato", qty: "30 kg", price: 44000, total: 1320000 },
    { name: "Romaine Lettuce", qty: "25 kg", price: 42000, total: 1050000 },
    { name: "Mixed Fresh Herbs", qty: "10 pack", price: 65000, total: 650000 },
  ],
  "PO-230824-017": [
    {
      name: "Tepung Protein Tinggi",
      qty: "5 sack",
      price: 250000,
      total: 1250000,
    },
    { name: "Minyak Goreng 5L", qty: "12 pcs", price: 75000, total: 900000 },
    {
      name: "Bumbu Kering Assorted",
      qty: "5 pack",
      price: 45000,
      total: 225000,
    },
  ],
  "PO-220824-016": [
    { name: "Beef Tenderloin", qty: "20 kg", price: 245000, total: 4900000 },
    { name: "Chicken Breast", qty: "20 kg", price: 65000, total: 1300000 },
    { name: "Salmon Fillet", qty: "5 kg", price: 148000, total: 740000 },
  ],
  "PO-210824-015": [
    { name: "Cooking Cream 1L", qty: "12 pcs", price: 85000, total: 1020000 },
    { name: "Fresh Milk 1L", qty: "24 pcs", price: 25000, total: 600000 },
    { name: "Unsalted Butter", qty: "6 pcs", price: 45000, total: 270000 },
  ],
  "PO-200824-014": [
    { name: "Cold Cup 16oz", qty: "500 pcs", price: 1200, total: 600000 },
    { name: "Takeaway Box", qty: "250 pcs", price: 1800, total: 450000 },
    { name: "Paper Straw", qty: "430 pcs", price: 500, total: 215000 },
  ],
};

const recipeIngredients: Record<
  string,
  { name: string; usage: string; unitCost: number; total: number }[]
> = {
  "MNU-001": [
    { name: "Nasi putih", usage: "200 gr", unitCost: 16000, total: 3200 },
    { name: "Telur ayam", usage: "1 pcs", unitCost: 2400, total: 2400 },
    { name: "Chicken breast", usage: "80 gr", unitCost: 60000, total: 4800 },
    { name: "Sayuran campur", usage: "70 gr", unitCost: 25700, total: 1800 },
    {
      name: "Bumbu & seasoning",
      usage: "1 porsi",
      unitCost: 2000,
      total: 2000,
    },
  ],
  "MNU-002": [
    {
      name: "Beef tenderloin",
      usage: "150 gr",
      unitCost: 245000,
      total: 36750,
    },
    { name: "Herb butter", usage: "15 gr", unitCost: 65000, total: 975 },
    { name: "Steak sauce", usage: "50 ml", unitCost: 10000, total: 500 },
    { name: "Garnish", usage: "1 porsi", unitCost: 275, total: 275 },
  ],
  "MNU-003": [
    { name: "Avocado Hass", usage: "100 gr", unitCost: 90000, total: 9000 },
    { name: "Espresso", usage: "1 shot", unitCost: 1500, total: 1500 },
    { name: "Fresh milk", usage: "100 ml", unitCost: 8000, total: 800 },
    { name: "Simple syrup", usage: "20 ml", unitCost: 10000, total: 200 },
  ],
  "MNU-004": [
    { name: "Pasta fettuccine", usage: "120 gr", unitCost: 36000, total: 4320 },
    { name: "Cooking cream", usage: "100 ml", unitCost: 85000, total: 8500 },
    { name: "Mushroom", usage: "80 gr", unitCost: 45000, total: 3600 },
    { name: "Parmesan & herbs", usage: "1 porsi", unitCost: 1980, total: 1980 },
  ],
  "MNU-005": [
    { name: "Romaine lettuce", usage: "120 gr", unitCost: 42000, total: 5040 },
    { name: "Chicken breast", usage: "120 gr", unitCost: 65000, total: 7800 },
    { name: "Caesar dressing", usage: "50 ml", unitCost: 50000, total: 2500 },
    {
      name: "Crouton & parmesan",
      usage: "1 porsi",
      unitCost: 1960,
      total: 1960,
    },
  ],
  "MNU-006": [
    { name: "Espresso", usage: "1 shot", unitCost: 1500, total: 1500 },
    { name: "Fresh milk", usage: "180 ml", unitCost: 25000, total: 4500 },
    { name: "Caramel sauce", usage: "30 ml", unitCost: 80000, total: 2400 },
    { name: "Cup & garnish", usage: "1 set", unitCost: 1400, total: 1400 },
  ],
};

function DetailDrawer({
  detail,
  onClose,
  onAction,
}: {
  detail: DetailSelection;
  onClose: () => void;
  onAction: (message: string) => void;
}) {
  return (
    <div className="drawer-backdrop" role="presentation" onMouseDown={onClose}>
      <aside
        className="detail-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="detail-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        {detail.kind === "order" && (
          <OrderDetail
            order={detail.data}
            onClose={onClose}
            onAction={onAction}
          />
        )}
        {detail.kind === "supplier" && (
          <SupplierDetail supplier={detail.data} onClose={onClose} />
        )}
        {detail.kind === "recipe" && (
          <RecipeDetail
            recipe={detail.data}
            onClose={onClose}
            onAction={onAction}
          />
        )}
        {detail.kind === "kds" && (
          <KdsOrderDetail
            order={detail.data}
            onClose={onClose}
            onAction={onAction}
          />
        )}
        {detail.kind === "inventory" && (
          <InventoryDetail
            item={detail.data}
            onClose={onClose}
            onAction={onAction}
          />
        )}
        {detail.kind === "sale" && (
          <SalesTransactionDetail
            transaction={detail.data}
            onClose={onClose}
            onAction={onAction}
          />
        )}
      </aside>
    </div>
  );
}

function DrawerHeading({
  eyebrow,
  title,
  subtitle,
  status,
  onClose,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  status?: string;
  onClose: () => void;
}) {
  return (
    <div className="drawer-heading">
      <div className="drawer-title-row">
        <div>
          <span className="eyebrow">{eyebrow}</span>
          <h2 id="detail-title">{title}</h2>
          <p>{subtitle}</p>
        </div>
        <button
          className="icon-button"
          onClick={onClose}
          aria-label="Tutup detail"
        >
          <Icon name="close" />
        </button>
      </div>
      {status && <Badge status={status} />}
    </div>
  );
}

function OrderDetail({
  order,
  onClose,
  onAction,
}: {
  order: (typeof purchaseOrders)[number];
  onClose: () => void;
  onAction: (message: string) => void;
}) {
  const items = orderItems[order.id];
  return (
    <>
      <DrawerHeading
        eyebrow="PURCHASE ORDER"
        title={order.id}
        subtitle={`Dibuat ${order.date} • Kotzen Demo Kitchen`}
        status={order.status}
        onClose={onClose}
      />
      <div className="drawer-scroll">
        <section className="drawer-section">
          <h3>Informasi Pesanan</h3>
          <div className="detail-info-grid">
            <div>
              <span>Supplier</span>
              <strong>{order.supplier}</strong>
            </div>
            <div>
              <span>Kategori</span>
              <strong>{order.category}</strong>
            </div>
            <div>
              <span>Dibutuhkan</span>
              <strong>26 Agu 2026</strong>
            </div>
            <div>
              <span>Pembayaran</span>
              <strong>Tempo 14 hari</strong>
            </div>
            <div>
              <span>Dibuat oleh</span>
              <strong>Nadia • Purchasing</strong>
            </div>
            <div>
              <span>Lokasi</span>
              <strong>Gudang Utama</strong>
            </div>
          </div>
        </section>
        <section className="drawer-section">
          <div className="section-title-row">
            <h3>Rincian Item</h3>
            <span>{items.length} item</span>
          </div>
          <div className="detail-items">
            <div className="detail-item-head">
              <span>Item</span>
              <span>Qty</span>
              <span>Harga</span>
              <span>Subtotal</span>
            </div>
            {items.map((item) => (
              <div className="detail-item-row" key={item.name}>
                <strong>{item.name}</strong>
                <span>{item.qty}</span>
                <span>{rupiah(item.price)}</span>
                <b>{rupiah(item.total)}</b>
              </div>
            ))}
          </div>
          <div className="detail-total">
            <span>Total Purchase Order</span>
            <strong>{rupiah(order.value)}</strong>
          </div>
        </section>
        <section className="drawer-section">
          <h3>Catatan Pengiriman</h3>
          <p className="detail-note">
            Pengiriman dilakukan sebelum pukul 10.00. Untuk bahan segar,
            pastikan kualitas grade A dan suhu tetap terjaga selama perjalanan.
          </p>
        </section>
        <section className="drawer-section">
          <h3>Riwayat Proses</h3>
          <div className="timeline">
            <div className="done">
              <i>
                <Icon name="check" size={13} />
              </i>
              <div>
                <strong>Purchase order dibuat</strong>
                <span>24 Agu 2026, 08:42 • Nadia</span>
              </div>
            </div>
            <div
              className={
                order.status === "Menunggu Persetujuan" ? "current" : "done"
              }
            >
              <i>
                {order.status === "Menunggu Persetujuan" ? (
                  "2"
                ) : (
                  <Icon name="check" size={13} />
                )}
              </i>
              <div>
                <strong>Persetujuan Manager</strong>
                <span>
                  {order.status === "Menunggu Persetujuan"
                    ? "Menunggu tindakan"
                    : "Disetujui oleh Rofi Firdaus"}
                </span>
              </div>
            </div>
            <div>
              <i>3</i>
              <div>
                <strong>Dikirim ke supplier</strong>
                <span>Otomatis setelah disetujui</span>
              </div>
            </div>
          </div>
        </section>
      </div>
      <div className="drawer-footer">
        <button className="ghost-button" onClick={onClose}>
          Tutup
        </button>
        {order.status === "Menunggu Persetujuan" ? (
          <button
            className="primary-button"
            onClick={() => onAction(`${order.id} berhasil disetujui.`)}
          >
            <Icon name="check" /> Setujui PO
          </button>
        ) : (
          <button
            className="primary-button"
            onClick={() => onAction(`${order.id} siap dicetak.`)}
          >
            Cetak Purchase Order
          </button>
        )}
      </div>
    </>
  );
}

function SupplierDetail({
  supplier,
  onClose,
}: {
  supplier: (typeof supplierList)[number];
  onClose: () => void;
}) {
  const recent = purchaseOrders.filter(
    (order) => order.supplier === supplier.name,
  );
  return (
    <>
      <DrawerHeading
        eyebrow="PROFIL SUPPLIER"
        title={supplier.name}
        subtitle={`${supplier.code} • Terdaftar sejak Januari 2025`}
        status={supplier.status}
        onClose={onClose}
      />
      <div className="drawer-scroll">
        <div className="supplier-detail-summary">
          <div>
            <span className="supplier-avatar large">
              {supplier.name
                .split(" ")
                .slice(-2)
                .map((word) => word[0])
                .join("")}
            </span>
            <div>
              <strong>{supplier.category}</strong>
              <small>Supplier utama outlet</small>
            </div>
          </div>
          <div className="supplier-score">
            <strong>★ {supplier.rating}</strong>
            <span>dari 5,0</span>
          </div>
        </div>
        <section className="drawer-section">
          <h3>Informasi Kontak</h3>
          <div className="detail-info-grid">
            <div>
              <span>Contact Person</span>
              <strong>Andi Kurniawan</strong>
            </div>
            <div>
              <span>Telepon</span>
              <strong>+62 812-3456-7890</strong>
            </div>
            <div>
              <span>Email</span>
              <strong>order@{supplier.code.toLowerCase()}.co.id</strong>
            </div>
            <div>
              <span>Wilayah</span>
              <strong>Cianjur, Jawa Barat</strong>
            </div>
            <div className="full">
              <span>Alamat Gudang</span>
              <strong>Jl. Raya Cipanas No. 88, Kabupaten Cianjur</strong>
            </div>
          </div>
        </section>
        <section className="drawer-section">
          <h3>Kinerja Kerja Sama</h3>
          <div className="supplier-metrics">
            <div>
              <span>Total PO</span>
              <strong>{supplier.orders}</strong>
              <small>Sejak terdaftar</small>
            </div>
            <div>
              <span>Tepat waktu</span>
              <strong>{supplier.delivery}</strong>
              <small>Target ≥ 95%</small>
            </div>
            <div>
              <span>Total transaksi</span>
              <strong>Rp84,2 jt</strong>
              <small>12 bulan terakhir</small>
            </div>
          </div>
        </section>
        <section className="drawer-section">
          <h3>Informasi Pembayaran</h3>
          <div className="detail-info-grid">
            <div>
              <span>Termin</span>
              <strong>14 hari</strong>
            </div>
            <div>
              <span>Metode</span>
              <strong>Transfer Bank</strong>
            </div>
            <div>
              <span>Bank</span>
              <strong>Bank Central Asia</strong>
            </div>
            <div>
              <span>Status Pajak</span>
              <strong>PKP • NPWP terverifikasi</strong>
            </div>
          </div>
        </section>
        <section className="drawer-section">
          <div className="section-title-row">
            <h3>Purchase Order Terakhir</h3>
            <span>{recent.length || 1} transaksi</span>
          </div>
          <div className="mini-order-list">
            {(recent.length ? recent : purchaseOrders.slice(0, 1)).map(
              (order) => (
                <div key={order.id}>
                  <div>
                    <strong>{order.id}</strong>
                    <span>
                      {order.date} • {order.category}
                    </span>
                  </div>
                  <b>{rupiah(order.value)}</b>
                  <Badge status={order.status} />
                </div>
              ),
            )}
          </div>
        </section>
      </div>
      <div className="drawer-footer">
        <button className="ghost-button" onClick={onClose}>
          Tutup
        </button>
        <button className="primary-button">Edit Data Supplier</button>
      </div>
    </>
  );
}

function RecipeDetail({
  recipe,
  onClose,
  onAction,
}: {
  recipe: (typeof menuRecipes)[number];
  onClose: () => void;
  onAction: (message: string) => void;
}) {
  const [simulatedPrice, setSimulatedPrice] = useState(recipe.price);
  const ingredients = recipeIngredients[recipe.id];
  const simulatedFoodCost = (recipe.cost / simulatedPrice) * 100;
  const simulatedMargin = simulatedPrice - recipe.cost;
  const simulatedStatus =
    simulatedFoodCost <= 32
      ? "Sehat"
      : simulatedFoodCost <= 35
        ? "Waspada"
        : "Perlu Evaluasi";
  return (
    <>
      <DrawerHeading
        eyebrow="RESEP & FOOD COST"
        title={recipe.name}
        subtitle={`${recipe.id} • ${recipe.category} • Versi 2.4`}
        status={recipe.status}
        onClose={onClose}
      />
      <div className="drawer-scroll">
        <div className="recipe-summary-strip">
          <div>
            <span>Harga jual</span>
            <strong>{rupiah(recipe.price)}</strong>
          </div>
          <div>
            <span>HPP / porsi</span>
            <strong>{rupiah(recipe.cost)}</strong>
          </div>
          <div>
            <span>Food cost</span>
            <strong
              className={
                recipe.foodCost > 35
                  ? "cost-high"
                  : recipe.foodCost > 32
                    ? "cost-watch"
                    : "cost-good"
              }
            >
              {recipe.foodCost}%
            </strong>
          </div>
          <div>
            <span>Margin</span>
            <strong>{rupiah(recipe.margin)}</strong>
          </div>
        </div>
        <section className="drawer-section">
          <div className="section-title-row">
            <h3>Komposisi Resep</h3>
            <span>{ingredients.length} bahan</span>
          </div>
          <div className="recipe-ingredient-list">
            <div className="recipe-ingredient-head">
              <span>Bahan</span>
              <span>Takaran</span>
              <span>Harga Unit</span>
              <span>Biaya</span>
            </div>
            {ingredients.map((ingredient) => (
              <div className="recipe-ingredient-row" key={ingredient.name}>
                <strong>{ingredient.name}</strong>
                <span>{ingredient.usage}</span>
                <span>{rupiah(ingredient.unitCost)}</span>
                <b>{rupiah(ingredient.total)}</b>
              </div>
            ))}
          </div>
          <div className="detail-total">
            <span>Total HPP per Porsi</span>
            <strong>{rupiah(recipe.cost)}</strong>
          </div>
        </section>
        <section className="drawer-section">
          <h3>Standar Produksi</h3>
          <div className="detail-info-grid">
            <div>
              <span>Yield resep</span>
              <strong>1 porsi</strong>
            </div>
            <div>
              <span>Waktu persiapan</span>
              <strong>
                {recipe.category === "Beverage" ? "6 menit" : "18 menit"}
              </strong>
            </div>
            <div>
              <span>Toleransi waste</span>
              <strong>3%</strong>
            </div>
            <div>
              <span>Area produksi</span>
              <strong>
                {recipe.category === "Beverage" ? "Bar" : "Main Kitchen"}
              </strong>
            </div>
            <div>
              <span>Porsi tersedia</span>
              <strong>{recipe.portions} porsi</strong>
            </div>
            <div>
              <span>Terjual bulan ini</span>
              <strong>{recipe.sold} porsi</strong>
            </div>
          </div>
        </section>
        <section className="drawer-section simulation-section">
          <div className="section-title-row">
            <h3>Simulasi Harga Jual</h3>
            <Badge status={simulatedStatus} />
          </div>
          <p>
            Geser harga untuk melihat dampaknya terhadap food cost dan margin.
          </p>
          <div className="simulated-price">
            <span>Harga simulasi</span>
            <strong>{rupiah(simulatedPrice)}</strong>
          </div>
          <input
            className="price-slider"
            type="range"
            min={Math.max(20000, recipe.price - 20000)}
            max={recipe.price + 30000}
            step="1000"
            value={simulatedPrice}
            onChange={(event) => setSimulatedPrice(Number(event.target.value))}
          />
          <div className="simulation-results">
            <div>
              <span>Food cost baru</span>
              <strong
                className={
                  simulatedFoodCost > 35
                    ? "cost-high"
                    : simulatedFoodCost > 32
                      ? "cost-watch"
                      : "cost-good"
                }
              >
                {simulatedFoodCost.toFixed(1)}%
              </strong>
              <small>
                {(simulatedFoodCost - recipe.foodCost).toFixed(1)} poin dari
                saat ini
              </small>
            </div>
            <div>
              <span>Margin baru</span>
              <strong>{rupiah(simulatedMargin)}</strong>
              <small>{rupiah(simulatedMargin - recipe.margin)} per porsi</small>
            </div>
          </div>
        </section>
        <section className="drawer-section">
          <h3>Dampak Perubahan Bahan</h3>
          <p className="detail-note">
            Harga bahan utama berubah dalam 7 hari terakhir. HPP resep meningkat
            sekitar 4,8%. Sistem merekomendasikan evaluasi harga jual atau
            penyesuaian porsi.
          </p>
        </section>
      </div>
      <div className="drawer-footer">
        <button className="ghost-button" onClick={onClose}>
          Tutup
        </button>
        <button
          className="secondary-button"
          onClick={() => setSimulatedPrice(recipe.price)}
        >
          Reset
        </button>
        <button
          className="primary-button"
          onClick={() =>
            onAction(
              `Simulasi ${recipe.name} tersimpan pada harga ${rupiah(simulatedPrice)}.`,
            )
          }
        >
          Simpan Simulasi
        </button>
      </div>
    </>
  );
}

function KdsOrderDetail({
  order,
  onClose,
  onAction,
}: {
  order: (typeof kitchenOrdersSeed)[number];
  onClose: () => void;
  onAction: (message: string) => void;
}) {
  const statusLabel =
    order.status === "new"
      ? "Pesanan Baru"
      : order.status === "preparing"
        ? "Sedang Diproses"
        : "Siap Disajikan";
  return (
    <>
      <DrawerHeading
        eyebrow="KITCHEN ORDER"
        title={order.id}
        subtitle={`${order.table} • Masuk pukul ${order.created}`}
        status={statusLabel}
        onClose={onClose}
      />
      <div className="drawer-scroll">
        <div className={`kds-detail-timer ${order.priority}`}>
          <div>
            <Icon name="bell" size={19} />
            <span>Waktu berjalan</span>
          </div>
          <strong>{order.elapsed}:00</strong>
          <small>Target penyelesaian maksimal 15 menit</small>
        </div>
        <section className="drawer-section">
          <h3>Informasi Pesanan</h3>
          <div className="detail-info-grid">
            <div>
              <span>Pelanggan</span>
              <strong>{order.customer}</strong>
            </div>
            <div>
              <span>Tipe pesanan</span>
              <strong>{order.source}</strong>
            </div>
            <div>
              <span>Meja / Kanal</span>
              <strong>{order.table}</strong>
            </div>
            <div>
              <span>Kasir</span>
              <strong>Salsa • POS 01</strong>
            </div>
            <div>
              <span>Jumlah menu</span>
              <strong>
                {order.items.reduce((sum, item) => sum + item.qty, 0)} item
              </strong>
            </div>
            <div>
              <span>Prioritas</span>
              <strong>
                {order.priority === "rush"
                  ? "RUSH"
                  : order.priority === "overdue"
                    ? "Terlambat"
                    : "Normal"}
              </strong>
            </div>
          </div>
        </section>
        <section className="drawer-section">
          <div className="section-title-row">
            <h3>Rincian Produksi</h3>
            <span>{order.items.length} jenis menu</span>
          </div>
          <div className="kds-detail-items">
            {order.items.map((item, index) => (
              <div key={`${item.name}-${index}`}>
                <span className="detail-item-qty">{item.qty}×</span>
                <div>
                  <strong>{item.name}</strong>
                  <small>{item.modifier}</small>
                  <em>{item.station}</em>
                </div>
                <Badge
                  status={
                    order.status === "ready"
                      ? "Selesai"
                      : order.status === "preparing"
                        ? "Diproses"
                        : "Menunggu"
                  }
                />
              </div>
            ))}
          </div>
        </section>
        <section className="drawer-section">
          <h3>Alur Pesanan</h3>
          <div className="timeline">
            <div className="done">
              <i>
                <Icon name="check" size={13} />
              </i>
              <div>
                <strong>Pesanan diterima dari POS</strong>
                <span>{order.created} • Salsa, POS 01</span>
              </div>
            </div>
            <div className={order.status !== "new" ? "done" : "current"}>
              <i>
                {order.status !== "new" ? <Icon name="check" size={13} /> : "2"}
              </i>
              <div>
                <strong>Produksi dimulai</strong>
                <span>
                  {order.status === "new"
                    ? "Menunggu konfirmasi dapur"
                    : "Dikerjakan oleh kitchen crew"}
                </span>
              </div>
            </div>
            <div className={order.status === "ready" ? "done" : ""}>
              <i>
                {order.status === "ready" ? (
                  <Icon name="check" size={13} />
                ) : (
                  "3"
                )}
              </i>
              <div>
                <strong>Siap disajikan</strong>
                <span>
                  {order.status === "ready"
                    ? "Menunggu pengantaran waiter"
                    : "Belum selesai"}
                </span>
              </div>
            </div>
            <div>
              <i>4</i>
              <div>
                <strong>Disajikan ke pelanggan</strong>
                <span>Status akan dikirim kembali ke POS</span>
              </div>
            </div>
          </div>
        </section>
        <section className="drawer-section">
          <h3>Integrasi Stok</h3>
          <p className="detail-note">
            Ketika pesanan diselesaikan, bahan akan dikurangi otomatis
            berdasarkan resep aktif dan tercatat sebagai pemakaian produksi.
          </p>
        </section>
      </div>
      <div className="drawer-footer">
        <button className="ghost-button" onClick={onClose}>
          Tutup
        </button>
        <button
          className="secondary-button"
          onClick={() =>
            onAction(`${order.id} ditandai sebagai prioritas dapur.`)
          }
        >
          Tandai Prioritas
        </button>
        <button
          className="primary-button"
          onClick={() =>
            onAction(`${order.id} diperbarui ke tahap berikutnya.`)
          }
        >
          {order.status === "new"
            ? "Mulai Proses"
            : order.status === "preparing"
              ? "Siap Disajikan"
              : "Sudah Diantar"}
          <Icon name="arrow" size={14} />
        </button>
      </div>
    </>
  );
}

function InventoryDetail({
  item,
  onClose,
  onAction,
}: {
  item: (typeof inventoryItems)[number];
  onClose: () => void;
  onAction: (message: string) => void;
}) {
  const available = item.onHand - item.reserved;
  const coverage = available / item.averageUse;
  const itemValue = item.onHand * item.unitCost;
  const level = Math.min(
    100,
    (item.onHand / Math.max(item.minimum * 2, item.onHand)) * 100,
  );
  return (
    <>
      <DrawerHeading
        eyebrow="INVENTORY ITEM"
        title={item.name}
        subtitle={`${item.id} • ${item.category}`}
        status={item.status}
        onClose={onClose}
      />
      <div className="drawer-scroll">
        <div
          className={`inventory-detail-hero ${item.status === "Stok Kritis" ? "critical" : item.status === "Menipis" ? "warning" : "safe"}`}
        >
          <div>
            <span>Stok tersedia</span>
            <strong>
              {available.toLocaleString("id-ID")} {item.unit}
            </strong>
            <small>
              Setelah reservasi {item.reserved.toLocaleString("id-ID")}{" "}
              {item.unit}
            </small>
          </div>
          <div className="stock-gauge">
            <span style={{ height: `${level}%` }} />
            <i />
          </div>
          <div>
            <span>Estimasi bertahan</span>
            <strong>{coverage.toFixed(1)} hari</strong>
            <small>
              Rata-rata pakai {item.averageUse.toLocaleString("id-ID")}{" "}
              {item.unit}/hari
            </small>
          </div>
        </div>
        <section className="drawer-section">
          <h3>Posisi Persediaan</h3>
          <div className="inventory-position-grid">
            <div>
              <span>Stok fisik</span>
              <strong>
                {item.onHand.toLocaleString("id-ID")} {item.unit}
              </strong>
            </div>
            <div>
              <span>Reservasi produksi</span>
              <strong>
                {item.reserved.toLocaleString("id-ID")} {item.unit}
              </strong>
            </div>
            <div>
              <span>Minimum stok</span>
              <strong>
                {item.minimum.toLocaleString("id-ID")} {item.unit}
              </strong>
            </div>
            <div>
              <span>Nilai persediaan</span>
              <strong>{rupiah(itemValue)}</strong>
            </div>
          </div>
        </section>
        <section className="drawer-section">
          <h3>Informasi Penyimpanan</h3>
          <div className="detail-info-grid">
            <div>
              <span>Lokasi utama</span>
              <strong>{item.location}</strong>
            </div>
            <div>
              <span>Satuan stok</span>
              <strong>{item.unit}</strong>
            </div>
            <div>
              <span>Kedaluwarsa terdekat</span>
              <strong>{item.expiry}</strong>
            </div>
            <div>
              <span>Terakhir diperbarui</span>
              <strong>{item.lastUpdate}</strong>
            </div>
            <div className="full">
              <span>Supplier utama</span>
              <strong>{item.supplier}</strong>
            </div>
          </div>
        </section>
        <section className="drawer-section">
          <div className="section-title-row">
            <h3>Pergerakan Terakhir</h3>
            <span>Hari ini</span>
          </div>
          <div className="inventory-detail-movements">
            <div>
              <span className="movement-symbol out">−</span>
              <div>
                <strong>Pemakaian produksi</strong>
                <small>KDS-ORD-1045 • 19:18</small>
              </div>
              <b>−0,30 {item.unit}</b>
            </div>
            <div>
              <span className="movement-symbol in">+</span>
              <div>
                <strong>Penerimaan barang</strong>
                <small>GR-240824-006 • 10:42</small>
              </div>
              <b>+5,00 {item.unit}</b>
            </div>
            <div>
              <span className="movement-symbol adjust">±</span>
              <div>
                <strong>Stock adjustment</strong>
                <small>ADJ-230824-014 • Kemarin</small>
              </div>
              <b>−0,20 {item.unit}</b>
            </div>
          </div>
        </section>
        <section className="drawer-section">
          <h3>Rekomendasi Sistem</h3>
          <p className="detail-note">
            {item.status === "Stok Kritis"
              ? `Stok tersedia berada di bawah batas minimum. Buat purchase order minimal ${(item.minimum * 2 - available).toFixed(1)} ${item.unit} agar kebutuhan 5 hari operasional tetap aman.`
              : item.status === "Menipis"
                ? "Stok diperkirakan mencapai batas minimum dalam 2–3 hari. Jadwalkan pembelian pada pengiriman supplier berikutnya."
                : "Ketersediaan stok masih sehat. Pertahankan pola pembelian dan monitor masa simpan secara berkala."}
          </p>
        </section>
        <section className="drawer-section">
          <h3>Integrasi Sistem</h3>
          <div className="integration-chips">
            <span>
              <Icon name="box" size={14} /> Goods Receipt
            </span>
            <span>
              <Icon name="recipe" size={14} /> Recipe Cost
            </span>
            <span>
              <Icon name="kitchen" size={14} /> KDS Usage
            </span>
            <span>
              <Icon name="grid" size={14} /> Stock Opname
            </span>
          </div>
        </section>
      </div>
      <div className="drawer-footer">
        <button className="ghost-button" onClick={onClose}>
          Tutup
        </button>
        <button
          className="secondary-button"
          onClick={() =>
            onAction(`Stock adjustment untuk ${item.name} siap dicatat.`)
          }
        >
          Adjustment
        </button>
        <button
          className="primary-button"
          onClick={() =>
            onAction(`Draft purchase order ${item.name} berhasil dibuat.`)
          }
        >
          <Icon name="cart" size={14} /> Buat Purchase Order
        </button>
      </div>
    </>
  );
}

function SalesTransactionDetail({
  transaction,
  onClose,
  onAction,
}: {
  transaction: (typeof salesTransactions)[number];
  onClose: () => void;
  onAction: (message: string) => void;
}) {
  const subtotal = transaction.items.reduce(
    (sum, item) => sum + item.price * item.qty,
    0,
  );
  const adjustment = transaction.total - subtotal;
  return (
    <>
      <DrawerHeading
        eyebrow="SALES TRANSACTION"
        title={transaction.id}
        subtitle={`${transaction.orderId} • ${transaction.time} • ${transaction.table}`}
        status={transaction.status}
        onClose={onClose}
      />
      <div className="drawer-scroll">
        <div className="sales-detail-total">
          <span>Total Pembayaran</span>
          <strong>{rupiah(transaction.total)}</strong>
          <small>{transaction.payment} • Berhasil dibayar</small>
        </div>
        <section className="drawer-section">
          <h3>Informasi Transaksi</h3>
          <div className="detail-info-grid">
            <div>
              <span>Pelanggan</span>
              <strong>{transaction.customer}</strong>
            </div>
            <div>
              <span>Jenis pesanan</span>
              <strong>{transaction.type}</strong>
            </div>
            <div>
              <span>Meja / Kanal</span>
              <strong>{transaction.table}</strong>
            </div>
            <div>
              <span>Kasir</span>
              <strong>{transaction.cashier} • POS 01</strong>
            </div>
            <div>
              <span>Tanggal</span>
              <strong>24 Agustus 2026</strong>
            </div>
            <div>
              <span>Metode pembayaran</span>
              <strong>{transaction.payment}</strong>
            </div>
          </div>
        </section>
        <section className="drawer-section">
          <div className="section-title-row">
            <h3>Rincian Pesanan</h3>
            <span>
              {transaction.items.reduce((sum, item) => sum + item.qty, 0)} item
            </span>
          </div>
          <div className="sales-detail-items">
            {transaction.items.map((item) => (
              <div key={item.name}>
                <span>{item.qty}×</span>
                <div>
                  <strong>{item.name}</strong>
                  <small>{rupiah(item.price)} / item</small>
                </div>
                <b>{rupiah(item.price * item.qty)}</b>
              </div>
            ))}
          </div>
          <div className="sales-detail-calculation">
            <div>
              <span>Subtotal</span>
              <b>{rupiah(subtotal)}</b>
            </div>
            <div>
              <span>Pajak, service & penyesuaian</span>
              <b>
                {adjustment >= 0 ? "+ " : "− "}
                {rupiah(Math.abs(adjustment))}
              </b>
            </div>
            <div>
              <span>Total</span>
              <strong>{rupiah(transaction.total)}</strong>
            </div>
          </div>
        </section>
        <section className="drawer-section">
          <h3>Alur Operasional</h3>
          <div className="timeline">
            <div className="done">
              <i>
                <Icon name="check" size={13} />
              </i>
              <div>
                <strong>Pesanan dibuat di POS</strong>
                <span>
                  {transaction.time} • {transaction.cashier}
                </span>
              </div>
            </div>
            <div className="done">
              <i>
                <Icon name="check" size={13} />
              </i>
              <div>
                <strong>Dikirim ke Kitchen Display</strong>
                <span>Produksi diterima seluruh station</span>
              </div>
            </div>
            <div className="done">
              <i>
                <Icon name="check" size={13} />
              </i>
              <div>
                <strong>Pembayaran berhasil</strong>
                <span>{transaction.payment} • Terekonsiliasi</span>
              </div>
            </div>
            <div className="done">
              <i>
                <Icon name="check" size={13} />
              </i>
              <div>
                <strong>Stok bahan berkurang</strong>
                <span>Berdasarkan resep aktif setiap menu</span>
              </div>
            </div>
          </div>
        </section>
        <section className="drawer-section">
          <h3>Dokumen & Kontrol</h3>
          <div className="integration-chips">
            <span>
              <Icon name="pos" size={14} /> E-Receipt
            </span>
            <span>
              <Icon name="kitchen" size={14} /> KDS Record
            </span>
            <span>
              <Icon name="inventory" size={14} /> Stock Usage
            </span>
            <span>
              <Icon name="budget" size={14} /> Sales Ledger
            </span>
          </div>
        </section>
      </div>
      <div className="drawer-footer">
        <button className="ghost-button" onClick={onClose}>
          Tutup
        </button>
        <button
          className="secondary-button"
          onClick={() =>
            onAction(`Struk ${transaction.id} siap dicetak ulang.`)
          }
        >
          Cetak Ulang
        </button>
        <button
          className="primary-button"
          onClick={() =>
            onAction(
              `Permintaan refund ${transaction.id} diteruskan untuk persetujuan supervisor.`,
            )
          }
        >
          Ajukan Refund
        </button>
      </div>
    </>
  );
}
