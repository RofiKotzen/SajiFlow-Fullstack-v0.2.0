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
import { useAuth } from "@/contexts/auth-context";
import { LoginScreen } from "@/components/login-screen";

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
  const auth = useAuth();
  const [view, setView] = useState<ViewId>("dashboard");
  const goTo = (v: string) => setView(v as ViewId);

  if (auth.status === "bootstrapping") {
    return <main className="grid min-h-screen place-items-center bg-cream text-center"><div><div className="mx-auto size-8 animate-spin rounded-full border-2 border-olive/20 border-t-olive"/><p className="mt-3 text-sm text-mute">Menyiapkan sesi Saji Flow…</p></div></main>;
  }

  if (auth.status === "unauthenticated" || !auth.session) {
    return <LoginScreen onLogin={auth.login} bootstrapError={auth.bootstrapError} />;
  }

  return (
    <>
      <AppShell
        view={view}
        onViewChange={setView}
        user={auth.session.user}
        tenant={auth.tenant}
        outlets={auth.outlets}
        activeOutletId={auth.activeOutletId}
        contextLoading={auth.contextLoading}
        onOutletChange={auth.setActiveOutletId}
        onLogout={auth.logout}
      >
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
