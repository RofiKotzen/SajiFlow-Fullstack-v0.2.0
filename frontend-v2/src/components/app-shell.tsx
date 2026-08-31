import {
  Bell, ChevronDown, ChevronsLeft, ChevronsRight, ClipboardList, ChefHat, LayoutDashboard,
  Package, ReceiptText, Search, Settings, ShoppingCart, Soup, Wallet, Menu as MenuIcon, X, Boxes, BookOpen, UtensilsCrossed, LogOut,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { OutletSummary, SessionUser, TenantSummary } from "@/lib/api/types";

export type ViewId =
  | "dashboard" | "pos" | "kds" | "inventory" | "budgets" | "orders" | "receipts"
  | "masters" | "suppliers" | "menu-products" | "recipes" | "settings";

interface NavItem { id: ViewId; label: string; icon: ReactNode; perm?: string[] }
interface NavGroup { label: string; items: NavItem[] }

const NAV: NavGroup[] = [
  { label: "Utama", items: [{ id: "dashboard", label: "Dashboard", icon: <LayoutDashboard className="size-4" /> }] },
  {
    label: "Operasional",
    items: [
      { id: "pos", label: "POS", icon: <ShoppingCart className="size-4" /> },
      { id: "kds", label: "Kitchen Display", icon: <ChefHat className="size-4" /> },
    ],
  },
  { label: "Persediaan", items: [{ id: "inventory", label: "Ringkasan Stok", icon: <Boxes className="size-4" />, perm: ["inventory.read"] }] },
  {
    label: "Pembelian",
    items: [
      { id: "budgets", label: "Budget Planning", icon: <Wallet className="size-4" />, perm: ["budgets.read"] },
      { id: "orders", label: "Purchase Order", icon: <ClipboardList className="size-4" />, perm: ["purchase_orders.read"] },
      { id: "receipts", label: "Goods Receipt", icon: <ReceiptText className="size-4" />, perm: ["goods_receipts.read"] },
    ],
  },
  {
    label: "Master Data",
    items: [
      { id: "masters", label: "Bahan & Satuan", icon: <Package className="size-4" />, perm: ["ingredients.read", "units.read"] },
      { id: "suppliers", label: "Supplier", icon: <Soup className="size-4" />, perm: ["suppliers.read"] },
      { id: "menu-products", label: "Menu & Produk", icon: <UtensilsCrossed className="size-4" />, perm: ["menus.read"] },
      { id: "recipes", label: "Resep & Food Cost", icon: <BookOpen className="size-4" />, perm: ["recipes.read"] },
    ],
  },
  {
    label: "Sistem",
    items: [{ id: "settings", label: "Pengaturan", icon: <Settings className="size-4" />, perm: ["tenant.read", "outlets.read", "users.read", "roles.read", "permissions.read"] }],
  },
];

export function AppShell({
  view, onViewChange, children, user, tenant, outlets, activeOutletId, contextLoading, onOutletChange, onLogout,
}: {
  view: ViewId;
  onViewChange: (v: ViewId) => void;
  children: ReactNode;
  user: SessionUser;
  tenant: TenantSummary | null;
  outlets: OutletSummary[];
  activeOutletId: string;
  contextLoading: boolean;
  onOutletChange: (outletId: string) => void;
  onLogout: () => Promise<void>;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const nav = useMemo(
    () => NAV.map((g) => ({ ...g, items: g.items.filter((i) => !i.perm || i.perm.some((permission) => user.permissions.includes(permission))) })).filter((g) => g.items.length > 0),
    [user.permissions]
  );

  // fallback jika view aktif tersembunyi oleh permission
  useEffect(() => {
    if (!nav.some((g) => g.items.some((i) => i.id === view))) onViewChange("dashboard");
  }, [nav, view, onViewChange]);

  const activeOutlet = outlets.find((outlet) => outlet.id === activeOutletId);
  const roleLabel = user.roles.length ? user.roles.join(", ") : "Tanpa role aktif";
  const initials = user.fullName.split(" ").filter(Boolean).map((word) => word[0]).slice(0, 2).join("").toUpperCase();

  const sidebar = (
    <div className="flex h-full flex-col bg-pine text-[oklch(0.93_0.015_140)]">
      <div className="flex h-16 shrink-0 items-center gap-2.5 border-b border-pine-line px-5">
        <div className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-pine-soft ring-1 ring-white/15">
          <span className="text-sm font-semibold text-cream">S</span>
        </div>
        {!collapsed && (
          <div className="leading-tight">
            <p className="text-[15px] font-semibold tracking-tight text-cream">Saji Flow</p>
            <p className="mono text-[11px] text-pine-mute">back-office</p>
          </div>
        )}
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4 scrollbar-thin">
        {nav.map((group) => {
          const open = collapsed ? true : (openGroups[group.label] ?? true);
          return (
            <div key={group.label}>
              {!collapsed && (
                <button
                  onClick={() => setOpenGroups((s) => ({ ...s, [group.label]: !open }))}
                  className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-pine-mute/90 transition-colors hover:text-cream"
                >
                  {group.label}
                  <ChevronDown className={cn("size-3.5 transition-transform", !open && "-rotate-90")} />
                </button>
              )}
              {open && (
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const active = view === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => { onViewChange(item.id); setMobileOpen(false); }}
                        title={collapsed ? item.label : undefined}
                        className={cn(
                          "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors",
                          active ? "bg-pine-soft text-cream ring-1 ring-white/10" : "text-pine-mute hover:bg-white/5 hover:text-cream",
                          collapsed && "justify-center"
                        )}
                      >
                        <span className={cn("shrink-0", active ? "text-cream" : "text-pine-mute/80")}>{item.icon}</span>
                        {!collapsed && item.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
      {!collapsed && <div className="border-t border-pine-line p-3"><div className="rounded-xl bg-pine-deep p-3 ring-1 ring-white/10"><p className="text-[11px] font-medium text-pine-mute">Tenant aktif</p><p className="mt-1 truncate text-[12px] font-semibold text-cream">{tenant?.name ?? user.tenantId}</p></div></div>}
    </div>
  );

  return (
    <div className="flex min-h-screen bg-cream text-ink">
      {/* Sidebar desktop */}
      <aside className={cn("hidden shrink-0 bg-pine transition-[width] lg:block", collapsed ? "w-[68px]" : "w-60")}>
        {sidebar}
      </aside>
      {/* Drawer mobile */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-ink/30" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 bg-pine ring-1 ring-white/10">
            <button className="absolute right-3 top-4 z-10 rounded-lg p-1.5 text-pine-mute hover:bg-white/10" onClick={() => setMobileOpen(false)}>
              <X className="size-4" />
            </button>
            {sidebar}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <header className="flex h-16 shrink-0 items-center gap-3 border-b border-black/5 bg-card px-4 lg:px-6">
          <button className="rounded-lg p-2 text-mute hover:bg-black/5 lg:hidden" onClick={() => setMobileOpen(true)}>
            <MenuIcon className="size-4" />
          </button>
          <button
            className="hidden rounded-lg p-2 text-mute hover:bg-black/5 lg:block"
            onClick={() => setCollapsed((c) => !c)}
            title={collapsed ? "Perluas sidebar" : "Ciutkan sidebar"}
          >
            {collapsed ? <ChevronsRight className="size-4" /> : <ChevronsLeft className="size-4" />}
          </button>
          <select
            value={activeOutletId}
            onChange={(e) => onOutletChange(e.target.value)}
            disabled={contextLoading || outlets.length < 2}
            aria-label="Outlet aktif"
            className="chrome h-9 rounded-lg pl-3 pr-2 text-[12px] font-medium text-ink/80 ring-1 ring-black/10 focus:outline-none"
          >
            {!outlets.length && <option value="">Tidak ada outlet tersedia</option>}
            {outlets.map((outlet) => <option key={outlet.id} value={outlet.id}>{outlet.name}</option>)}
          </select>
          <div className="ml-auto flex items-center gap-3">
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-mute/70" />
              <input disabled
                className="h-9 w-56 rounded-lg bg-cream pl-9 pr-3 text-[13px] ring-1 ring-black/10 placeholder:text-mute/70 focus:outline-none focus:ring-2 focus:ring-olive/40"
                placeholder="Pencarian belum terintegrasi"
              />
            </div>
            <button className="relative rounded-lg p-2 text-mute opacity-60" title="Notifikasi belum terintegrasi" disabled>
              <Bell className="size-4" />
            </button>
            <div className="flex items-center gap-2.5 border-l border-black/5 pl-3">
              <div className="chrome grid size-9 place-items-center rounded-full text-[12px] font-semibold text-olive-deep ring-1 ring-black/10">
                {initials || "?"}
              </div>
              <div className="hidden leading-tight sm:block">
                <p className="max-w-40 truncate text-[13px] font-medium" title={user.fullName}>{user.fullName}</p>
                <p className="max-w-40 truncate text-[11px] text-mute" title={`${roleLabel} · ${activeOutlet?.name ?? "Tanpa outlet"}`}>{roleLabel} · {activeOutlet?.name ?? "Tanpa outlet"}</p>
              </div>
              <button className="rounded-lg p-2 text-mute hover:bg-black/5" title="Keluar" onClick={() => void onLogout()}><LogOut className="size-4" /></button>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
