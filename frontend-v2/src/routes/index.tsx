import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Toaster } from "sonner";
import { AppShell, type ViewId } from "@/components/app-shell";
import { DashboardView } from "@/views/dashboard";
import { PosView } from "@/views/pos";
import { KdsView } from "@/views/kds";
import { InventoryView } from "@/views/inventory";
import { BudgetsView } from "@/views/budgets";
import { OrdersView } from "@/views/orders";
import { ReceiptsView } from "@/views/receipts";
import { MastersView } from "@/views/masters";
import { SuppliersView } from "@/views/suppliers";
import { MenuProductsView } from "@/views/menu-products";
import { RecipesView } from "@/views/recipes";
import { SettingsView } from "@/views/settings";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Saji Flow — Back-Office F&B" },
      { name: "description", content: "Dashboard back-office F&B: POS, kitchen display, ringkasan stok, budget planning, purchase order, dan goods receipt dalam satu workspace." },
      { property: "og:title", content: "Saji Flow — Back-Office F&B" },
      { property: "og:description", content: "Dashboard back-office F&B: POS, kitchen display, stok, budget, dan purchasing." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: Index,
});

function Index() {
  const [view, setView] = useState<ViewId>("dashboard");
  const goTo = (v: string) => setView(v as ViewId);

  return (
    <>
      <AppShell view={view} onViewChange={setView}>
        {view === "dashboard" && <DashboardView goTo={goTo} />}
        {view === "pos" && <PosView />}
        {view === "kds" && <KdsView />}
        {view === "inventory" && <InventoryView />}
        {view === "budgets" && <BudgetsView />}
        {view === "orders" && <OrdersView />}
        {view === "receipts" && <ReceiptsView />}
        {view === "masters" && <MastersView />}
        {view === "suppliers" && <SuppliersView />}
        {view === "menu-products" && <MenuProductsView />}
        {view === "recipes" && <RecipesView />}
        {view === "settings" && <SettingsView />}
      </AppShell>
      <Toaster position="bottom-right" toastOptions={{ style: { background: "oklch(0.985 0.005 100)", color: "oklch(0.28 0.02 125)", border: "1px solid oklch(0.28 0.02 125 / 10%)" } }} />
    </>
  );
}
