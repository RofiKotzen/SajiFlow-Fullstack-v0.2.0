import { ArrowRight, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Badge,
  Btn,
  Card,
  CardHeader,
  Cell,
  DataTable,
  Progress,
  Row,
  StatusBadge,
} from "@/components/ui";
import { useAuth } from "@/contexts/auth-context";
type Source<T> = { loading: boolean; data: T | null; error: string };
type PO = {
  id: string;
  outletId: string;
  outletName: string;
  poNo: string;
  supplierName: string;
  orderDate: string;
  expectedDate: string | null;
  status: string;
  grandTotal: number;
  currencyCode: string;
  itemCount: number;
};
type GR = { id: string; status: string; stockValue: number };
type Inventory = {
  summary: {
    skuCount: number;
    stockValue: number;
    attentionCount: number;
    expiringBatchCount: number;
    expiredBatchCount: number;
  };
  items: {
    ingredientId: string;
    sku: string;
    ingredientName: string;
    outletName: string;
    onHand: number;
    unitCode: string;
    status: string;
    nearestExpiry: string | null;
  }[];
  generatedAt: string;
};
type Supplier = { id: string; name: string; isActive: boolean; activeCatalogCount: number };
type Budget = { id: string; status: string; totalAmount: number };
type MenuSummary = { menus: number; active: number; archived: number; variants: number };
type Recipe = { id: string; status: string | null; costingComplete: boolean | null };
const source = <T,>(): Source<T> => ({ loading: true, data: null, error: "" });
export function DashboardView({ goTo }: { goTo: (v: string) => void }) {
  const { api, session, activeOutletId } = useAuth(),
    can = useCallback((p: string) => (session?.user.permissions ?? []).includes(p), [session]);
  const [po, setPo] = useState<Source<PO[]>>(source),
    [gr, setGr] = useState<Source<GR[]>>(source),
    [inventory, setInventory] = useState<Source<Inventory>>(source),
    [suppliers, setSuppliers] = useState<Source<Supplier[]>>(source),
    [budgets, setBudgets] = useState<Source<Budget[]>>(source),
    [menus, setMenus] = useState<Source<MenuSummary>>(source),
    [recipes, setRecipes] = useState<Source<Recipe[]>>(source),
    [reload, setReload] = useState(0);
  useEffect(() => {
    let live = true;
    const scope = (path: string) =>
      `${path}${activeOutletId ? `${path.includes("?") ? "&" : "?"}outletId=${encodeURIComponent(activeOutletId)}` : ""}`;
    const request = <T,>(allowed: boolean, path: string, set: (x: Source<T>) => void) => {
      if (!allowed) {
        set({ loading: false, data: null, error: "forbidden" });
        return;
      }
      set(source<T>());
      api<T>(path)
        .then((data) => {
          if (live) set({ loading: false, data, error: "" });
        })
        .catch((e) => {
          if (live)
            set({
              loading: false,
              data: null,
              error: e instanceof Error ? e.message : "Sumber tidak tersedia",
            });
        });
    };
    request(can("purchase_orders.read"), scope("/purchase-orders"), setPo);
    request(can("goods_receipts.read"), scope("/goods-receipts"), setGr);
    request(can("inventory.read") && Boolean(activeOutletId), scope("/inventory"), setInventory);
    request(can("suppliers.read"), "/suppliers", setSuppliers);
    request(can("budgets.read"), scope("/budgets"), setBudgets);
    request(can("menus.read"), "/menu-products/summary", setMenus);
    request(can("recipes.read"), scope("/recipes"), setRecipes);
    return () => {
      live = false;
    };
  }, [activeOutletId, api, can, reload]);
  const recent = useMemo(
    () => [...(po.data ?? [])].sort((a, b) => b.orderDate.localeCompare(a.orderDate)).slice(0, 5),
    [po.data],
  );
  const activePo = (po.data ?? []).filter((x) => !["cancelled", "closed"].includes(x.status));
  const poValue = activePo.reduce((s, x) => s + Number(x.grandTotal), 0);
  const pendingGr = (po.data ?? []).filter((x) =>
    ["sent", "partially_received"].includes(x.status),
  ).length;
  const activeSuppliers = (suppliers.data ?? []).filter((x) => x.isActive);
  const noCatalog = activeSuppliers.filter((x) => Number(x.activeCatalogCount) === 0).length;
  const attention = (inventory.data?.items ?? []).filter((x) => x.status !== "safe").slice(0, 4);
  const activeBudgets = (budgets.data ?? []).filter((x) =>
    ["draft", "submitted", "approved", "rejected"].includes(x.status),
  );
  const limited = [po, gr, inventory, suppliers, budgets, menus, recipes].every(
    (x) => x.error === "forbidden",
  );
  const currency = po.data?.[0]?.currencyCode ?? "IDR";
  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-balance">Dasbor Pembelian</h1>
          <p className="mt-1 text-[13px] text-mute">
            Ringkasan server ·{" "}
            {activeOutletId ? "outlet aktif" : "semua outlet yang dapat diakses"}
          </p>
        </div>
        <div className="flex gap-2">
          <Btn variant="outline" onClick={() => setReload((x) => x + 1)}>
            <RefreshCw className="size-3.5" />
            Muat ulang
          </Btn>
          {can("purchase_orders.create") && <Btn onClick={() => goTo("orders")}>Buat PO Baru</Btn>}
        </div>
      </div>
      {limited && (
        <Card className="mb-4 p-5 text-center">
          <strong>Akses dasbor terbatas</strong>
          <p className="text-xs text-mute">
            Tidak ada izin baca untuk sumber operasional dasbor.
          </p>
        </Card>
      )}
      <div className="mb-5 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Kpi
          label="Nilai PO Aktif"
          value={po.loading ? "…" : po.data ? money(poValue, currency) : "Belum tersedia"}
          sub={po.data ? `${activePo.length} PO belum ditutup atau dibatalkan` : labelError(po)}
          tone="text-olive"
        />
        <Kpi
          label="PO Menunggu Penerimaan"
          value={po.loading ? "…" : po.data ? String(pendingGr) : "—"}
          sub="Status dikirim atau diterima sebagian"
          tone="text-terra"
        />
        <Kpi
          label="Nilai Persediaan"
          value={
            inventory.loading
              ? "…"
              : inventory.data
                ? money(inventory.data.summary.stockValue, currency)
                : "Belum tersedia"
          }
          sub={
            inventory.data
              ? `${inventory.data.summary.attentionCount} item perlu perhatian`
              : activeOutletId
                ? labelError(inventory)
                : "Pilih outlet aktif"
          }
          tone="text-mute"
        />
        <Kpi
          label="Pemasok Aktif"
          value={suppliers.loading ? "…" : suppliers.data ? String(activeSuppliers.length) : "—"}
          sub={suppliers.data ? `${noCatalog} tanpa katalog aktif` : labelError(suppliers)}
          tone="text-olive"
        />
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.9fr_1fr]">
        <Card className="overflow-hidden">
          <CardHeader
            title="Pesanan Pembelian Terbaru"
            sub={po.data ? `${po.data.length} dokumen dalam cakupan server` : labelError(po)}
            action={
              can("purchase_orders.read") ? (
                <button
                  onClick={() => goTo("orders")}
                  className="flex items-center gap-1 text-[12px] font-medium text-olive"
                >
                  Lihat semua <ArrowRight className="size-3" />
                </button>
              ) : undefined
            }
          />
          {po.loading ? (
            <Panel text="Memuat pesanan pembelian…" />
          ) : po.error ? (
            <Panel text={labelError(po)} retry={() => setReload((x) => x + 1)} />
          ) : recent.length ? (
            <DataTable head={["No. PO", "Pemasok / Outlet", "Tanggal", "Nilai", "Status"]} wide>
              {recent.map((x) => (
                <Row key={x.id} onClick={() => goTo("orders")}>
                  <Cell className="mono">{x.poNo}</Cell>
                  <Cell>
                    <strong>{x.supplierName}</strong>
                    <p className="text-xs text-mute">{x.outletName}</p>
                  </Cell>
                  <Cell>{date(x.orderDate)}</Cell>
                  <Cell className="mono text-right">{money(x.grandTotal, x.currencyCode)}</Cell>
                  <Cell>
                    <StatusBadge label={x.status} />
                  </Cell>
                </Row>
              ))}
            </DataTable>
          ) : (
            <Panel text="Belum ada pesanan pembelian." />
          )}
        </Card>
        <div className="space-y-4">
          <Card className="p-4">
            <div className="flex items-baseline justify-between">
              <h2 className="text-[14px] font-semibold">Anggaran Aktif</h2>
              <span className="text-[12px] text-mute">Cakupan outlet</span>
            </div>
            {budgets.loading ? (
              <p className="mt-3 text-xs text-mute">Memuat…</p>
            ) : budgets.data ? (
              <>
                <p className="mt-2 text-[13px] text-mute">
                  <span className="mono font-semibold text-ink">
                    {money(
                      activeBudgets.reduce((s, x) => s + Number(x.totalAmount), 0),
                      currency,
                    )}
                  </span>{" "}
                  dari {activeBudgets.length} anggaran aktif
                </p>
                <div className="mt-2">
                  <Progress value={0} />
                </div>
                <p className="mt-1.5 text-[11px] text-mute">
                  Pemakaian tidak tersedia pada endpoint daftar; nilainya tidak diperkirakan.
                </p>
              </>
            ) : (
              <Unavailable value={budgets} />
            )}
          </Card>
          <Card className="p-4">
            <h2 className="text-[14px] font-semibold">Item Perhatian</h2>
            {inventory.loading ? (
              <p className="mt-3 text-xs text-mute">Memuat persediaan…</p>
            ) : attention.length ? (
              <ul className="mt-3 space-y-2.5">
                {attention.map((x) => (
                  <li
                    key={`${x.ingredientId}-${x.outletName}`}
                    className="flex items-start gap-2.5"
                  >
                    <span
                      className={`mt-1.5 size-1.5 rounded-full ${x.status === "out" || x.status === "critical" ? "bg-terra" : "bg-amber-500"}`}
                    />
                    <div className="text-[12.5px]">
                      <p className="font-medium">{x.ingredientName}</p>
                      <p className="text-mute">
                        {x.sku} · {num(x.onHand)} {x.unitCode} · {x.outletName} · {x.status}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <Unavailable value={inventory} empty="Tidak ada item kritis pada scope ini." />
            )}
          </Card>
          <Card className="p-4">
            <h2 className="text-[14px] font-semibold">Cakupan Master</h2>
            <ul className="mt-3 space-y-3">
              <Coverage
                label="Pemasok aktif"
                value={suppliers.data ? `${activeSuppliers.length}` : labelError(suppliers)}
                warn={noCatalog > 0}
              />
              <Coverage
                label="Menu aktif"
                value={menus.data ? `${menus.data.active}` : labelError(menus)}
              />
              <Coverage
                label="Resep draf / disetujui"
                value={
                  recipes.data
                    ? `${recipes.data.filter((x) => x.status === "draft").length} / ${recipes.data.filter((x) => x.status === "approved").length}`
                    : labelError(recipes)
                }
              />
              <Coverage
                label="Penerimaan barang dibukukan"
                value={
                  gr.data
                    ? `${gr.data.filter((x) => x.status === "posted").length}`
                    : labelError(gr)
                }
              />
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
function Kpi({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub: string;
  tone: string;
}) {
  return (
    <Card className="p-4">
      <p className="text-[12px] font-medium text-mute">{label}</p>
      <p className="mono mt-2 text-[26px] font-semibold tracking-tight">{value}</p>
      <p className={`mt-1 text-[11px] font-medium ${tone}`}>{sub}</p>
    </Card>
  );
}
function Panel({ text, retry }: { text: string; retry?: () => void }) {
  return (
    <div className="grid min-h-40 place-items-center p-6 text-center">
      <div>
        <p className="text-xs text-mute">{text}</p>
        {retry && (
          <Btn className="mt-3" variant="outline" onClick={retry}>
            Coba lagi
          </Btn>
        )}
      </div>
    </div>
  );
}
function Unavailable<T>({
  value,
  empty = "Belum tersedia.",
}: {
  value: Source<T>;
  empty?: string;
}) {
  return <p className="mt-3 text-xs text-mute">{value.error ? labelError(value) : empty}</p>;
}
function Coverage({
  label,
  value,
  warn = false,
}: {
  label: string;
  value: string;
  warn?: boolean;
}) {
  return (
    <li>
      <div className="flex justify-between text-[12.5px]">
        <span>{label}</span>
        <Badge tone={warn ? "amber" : "neutral"}>{value}</Badge>
      </div>
    </li>
  );
}
function labelError<T>(x: Source<T>) {
  return x.error === "forbidden" ? "Tidak diizinkan" : x.error || "Belum tersedia";
}
function money(v: number, c = "IDR") {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: c,
    maximumFractionDigits: 2,
  }).format(Number(v) || 0);
}
function num(v: number) {
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 3 }).format(Number(v) || 0);
}
function date(v: string) {
  return new Date(`${v}T00:00:00`).toLocaleDateString("id-ID");
}
export { Badge };
