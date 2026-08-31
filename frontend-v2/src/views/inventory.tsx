import { AlertTriangle, ArrowDownLeft, ArrowUpRight, RefreshCw, Search } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Card,
  CardHeader,
  DataTable,
  Row,
  Cell,
  Drawer,
  SelectInput,
  TextInput,
  Tabs,
  Badge,
  Progress,
} from "@/components/ui";
import { useAuth } from "@/contexts/auth-context";

type StockStatus = "out" | "critical" | "low" | "safe";
interface InventoryItem {
  ingredientId: string;
  sku: string;
  ingredientName: string;
  categoryId: string | null;
  categoryName: string | null;
  isPerishable: boolean;
  unitCode: string;
  unitName: string;
  outletId: string;
  outletName: string;
  onHand: number;
  stockValue: number;
  weightedUnitCost: number;
  minimumStock: number;
  reorderPoint: number;
  parStock: number;
  batchCount: number;
  locationCount: number;
  locationNames: string;
  nearestExpiry: string | null;
  expiryDays: number | null;
  lastUpdatedAt: string;
  status: StockStatus;
}
interface Overview {
  summary: {
    skuCount: number;
    totalQuantity: number;
    stockValue: number;
    attentionCount: number;
    expiringBatchCount: number;
    expiredBatchCount: number;
  };
  categories: Array<{ categoryId: string | null; categoryName: string; stockValue: number }>;
  items: InventoryItem[];
  generatedAt: string;
}
interface InventoryLookup {
  outlets: Array<{ id: string; code: string; name: string }>;
  storageLocations: Array<{
    id: string;
    outletId: string;
    code: string;
    name: string;
    locationType: string;
  }>;
  categories: Array<{ id: string; name: string }>;
}
interface Movement {
  id: string;
  movementId: string;
  movementNo: string;
  movementType: string;
  movementAt: string;
  businessDate: string;
  status: string;
  referenceType: string | null;
  referenceId: string | null;
  referenceNo: string;
  reason: string | null;
  ingredientId: string;
  ingredientSku: string;
  ingredientName: string;
  unitCode: string;
  outletId: string;
  outletName: string;
  storageLocationId: string;
  storageLocationCode: string;
  storageLocationName: string;
  batchId: string | null;
  batchNo: string | null;
  quantityDelta: number;
  unitCost: number;
  valueDelta: number;
  balanceAfter: number | null;
  actorName: string | null;
}
interface InventoryDetail extends InventoryItem {
  locations: Array<{
    id: string;
    code: string;
    name: string;
    quantityOnHand: number;
    stockValue: number;
    batchCount: number;
  }>;
  batches: Array<{
    id: string;
    batchNo: string | null;
    receivedDate: string;
    expiryDate: string | null;
    quantityOnHand: number;
    unitCost: number;
    storageLocationId: string;
    storageLocationCode: string;
    storageLocationName: string;
    sourceReceiptNo: string | null;
    updatedAt: string;
    stockValue: number;
    expiryDays: number | null;
  }>;
  movements: Movement[];
}

const STATUS: Record<StockStatus, { label: string; tone: "terra" | "gold" | "olive" | "neutral" }> =
  {
    out: { label: "Habis", tone: "terra" },
    critical: { label: "Kritis", tone: "terra" },
    low: { label: "Menipis", tone: "gold" },
    safe: { label: "Aman", tone: "olive" },
  };
const MOVEMENT_TYPES = [
  "receipt",
  "sale_consumption",
  "transfer_out",
  "transfer_in",
  "waste",
  "opname_adjustment",
  "reversal",
];
const MOVEMENT_LABEL: Record<string, string> = {
  receipt: "Penerimaan",
  sale_consumption: "Pemakaian penjualan",
  transfer_out: "Transfer keluar",
  transfer_in: "Transfer masuk",
  waste: "Waste",
  opname_adjustment: "Penyesuaian opname",
  reversal: "Reversal",
};

export function InventoryView() {
  const auth = useAuth();
  const { api, activeOutletId, session } = auth;
  const allowed = Boolean(session?.user.permissions.includes("inventory.read"));
  const [tab, setTab] = useState("saldo"),
    [search, setSearch] = useState(""),
    [debouncedSearch, setDebouncedSearch] = useState("");
  const [outletId, setOutletId] = useState(activeOutletId),
    [locationId, setLocationId] = useState(""),
    [categoryId, setCategoryId] = useState(""),
    [status, setStatus] = useState(""),
    [movementType, setMovementType] = useState("");
  const [lookup, setLookup] = useState<InventoryLookup | null>(null),
    [overview, setOverview] = useState<Overview | null>(null),
    [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true),
    [refreshing, setRefreshing] = useState(false),
    [error, setError] = useState(""),
    [reloadKey, setReloadKey] = useState(0);
  const [selected, setSelected] = useState<InventoryItem | null>(null),
    [detail, setDetail] = useState<InventoryDetail | null>(null),
    [detailLoading, setDetailLoading] = useState(false),
    [detailError, setDetailError] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    if (activeOutletId) setOutletId(activeOutletId);
  }, [activeOutletId]);
  useEffect(() => {
    if (!allowed) {
      setLoading(false);
      return;
    }
    let active = true;
    api<InventoryLookup>("/inventory/lookups")
      .then((v) => {
        if (active) setLookup(v);
      })
      .catch((e) => {
        if (active) setError(errorMessage(e));
      });
    return () => {
      active = false;
    };
  }, [allowed, api]);
  useEffect(() => {
    if (!lookup || !locationId) return;
    if (
      !lookup.storageLocations.some(
        (l) => l.id === locationId && (!outletId || l.outletId === outletId),
      )
    )
      setLocationId("");
  }, [lookup, locationId, outletId]);
  useEffect(() => {
    if (!allowed) return;
    let active = true;
    setRefreshing(true);
    setError("");
    const p = new URLSearchParams();
    if (outletId) p.set("outletId", outletId);
    if (locationId) p.set("locationId", locationId);
    if (categoryId) p.set("categoryId", categoryId);
    if (status) p.set("status", status);
    if (debouncedSearch) p.set("search", debouncedSearch);
    api<Overview>(`/inventory${p.size ? `?${p}` : ""}`)
      .then((v) => {
        if (active) setOverview(normalizeOverview(v));
      })
      .catch((e) => {
        if (active) setError(errorMessage(e));
      })
      .finally(() => {
        if (active) {
          setLoading(false);
          setRefreshing(false);
        }
      });
    return () => {
      active = false;
    };
  }, [allowed, api, outletId, locationId, categoryId, status, debouncedSearch, reloadKey]);
  useEffect(() => {
    if (!allowed) return;
    let active = true;
    const p = new URLSearchParams();
    if (outletId) p.set("outletId", outletId);
    if (locationId) p.set("locationId", locationId);
    if (movementType) p.set("movementType", movementType);
    api<Movement[]>(`/inventory/movements${p.size ? `?${p}` : ""}`)
      .then((v) => {
        if (active) setMovements(v.map(normalizeMovement));
      })
      .catch((e) => {
        if (active) setError(errorMessage(e));
      });
    return () => {
      active = false;
    };
  }, [allowed, api, outletId, locationId, movementType, reloadKey]);
  useEffect(() => {
    if (!selected) {
      setDetail(null);
      setDetailError("");
      return;
    }
    let active = true;
    setDetailLoading(true);
    setDetailError("");
    setDetail(null);
    api<InventoryDetail>(
      `/inventory/${selected.ingredientId}?outletId=${encodeURIComponent(selected.outletId)}`,
    )
      .then((v) => {
        if (active) setDetail(normalizeDetail(v));
      })
      .catch((e) => {
        if (active) setDetailError(errorMessage(e));
      })
      .finally(() => {
        if (active) setDetailLoading(false);
      });
    return () => {
      active = false;
    };
  }, [api, selected]);

  const locations = (lookup?.storageLocations ?? []).filter(
    (l) => !outletId || l.outletId === outletId,
  );
  const visibleMovements = useMemo(() => {
    const term = search.trim().toLowerCase();
    return term
      ? movements.filter((m) =>
          `${m.movementNo} ${m.referenceNo} ${m.ingredientSku} ${m.ingredientName} ${m.batchNo ?? ""}`
            .toLowerCase()
            .includes(term),
        )
      : movements;
  }, [movements, search]);
  const attention = (overview?.items ?? [])
    .filter((i) => i.status !== "safe" || (i.expiryDays !== null && i.expiryDays <= 7))
    .slice(0, 6);
  const categoryTotal = (overview?.categories ?? []).reduce((sum, c) => sum + c.stockValue, 0),
    hasFilters = Boolean(debouncedSearch || locationId || categoryId || status);
  if (!allowed)
    return (
      <InventoryState
        kind="forbidden"
        title="Akses Inventory dibatasi"
        message="Permission inventory.read diperlukan untuk melihat saldo dan ledger stok."
      />
    );
  if (loading && !overview)
    return (
      <InventoryState
        kind="loading"
        title="Memuat Inventory"
        message="Saldo batch dan ledger sedang diambil dari backend."
      />
    );
  if (!overview && error)
    return (
      <InventoryState
        kind="error"
        title="Inventory tidak dapat dimuat"
        message={error}
        action="Coba lagi"
        onAction={() => setReloadKey((v) => v + 1)}
      />
    );
  const summary = overview?.summary ?? {
    skuCount: 0,
    totalQuantity: 0,
    stockValue: 0,
    attentionCount: 0,
    expiringBatchCount: 0,
    expiredBatchCount: 0,
  };
  return (
    <div className="min-w-0">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Ringkasan Stok</h1>
          <p className="mt-1 text-[13px] text-mute">
            Saldo bahan, batch, expiry, dan ledger pergerakan · read-only
          </p>
        </div>
        <div className="flex items-center gap-2">
          {refreshing && (
            <span className="text-xs text-mute" role="status">
              Memperbarui…
            </span>
          )}
          <button
            className="rounded-lg p-2 text-mute ring-1 ring-black/10 hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-olive"
            title="Muat ulang Inventory"
            onClick={() => setReloadKey((v) => v + 1)}
          >
            <RefreshCw className="size-4" />
          </button>
          <Tabs
            value={tab}
            onChange={setTab}
            tabs={[
              { id: "saldo", label: "Ringkasan Stok" },
              { id: "pergerakan", label: "Pergerakan", count: movements.length },
            ]}
          />
        </div>
      </div>
      {error && overview && (
        <div className="mb-4 rounded-xl bg-terra/10 px-4 py-3 text-sm text-terra" role="alert">
          {error}
        </div>
      )}
      <div className="mb-4 grid grid-cols-1 gap-3 min-[375px]:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Nilai Stok",
            value: idr(summary.stockValue),
            note: `${summary.skuCount} posisi bahan`,
          },
          {
            label: "Jumlah Bahan",
            value: number(summary.skuCount),
            note: `${number(summary.totalQuantity)} total kuantitas`,
          },
          {
            label: "Perlu Perhatian",
            value: number(summary.attentionCount),
            note: `${summary.expiringBatchCount} mendekati expiry`,
          },
          {
            label: "Baris Ledger",
            value: number(movements.length),
            note: "Maksimal 250 baris terbaru",
          },
        ].map((k) => (
          <Card key={k.label} className="p-3.5">
            <p className="text-[12px] font-medium text-mute">{k.label}</p>
            <p className="mono mt-1.5 text-[20px] font-semibold">{k.value}</p>
            <p className="mt-1 text-[11px] text-mute">{k.note}</p>
          </Card>
        ))}
      </div>
      <Toolbar
        search={search}
        onSearch={setSearch}
        outletId={outletId}
        onOutlet={setOutletId}
        locationId={locationId}
        onLocation={setLocationId}
        categoryId={categoryId}
        onCategory={setCategoryId}
        status={status}
        onStatus={setStatus}
        movementType={movementType}
        onMovementType={setMovementType}
        lookup={lookup}
        locations={locations}
        movementMode={tab === "pergerakan"}
      />
      {tab === "saldo" && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[2fr_1fr]">
          <Card className="min-w-0 overflow-hidden">
            <CardHeader title="Saldo Bahan" sub={`${overview?.items.length ?? 0} posisi stok`} />
            {!overview?.items.length ? (
              <InventoryState
                kind="empty"
                title={hasFilters ? "Tidak ada hasil" : "Belum ada saldo Inventory"}
                message={
                  hasFilters
                    ? "Tidak ada posisi stok yang sesuai dengan filter aktif."
                    : "Saldo akan muncul setelah Goods Receipt diposting ke Inventory."
                }
              />
            ) : (
              <DataTable
                head={[
                  "SKU",
                  "Bahan",
                  "Kategori",
                  "Outlet / Lokasi",
                  "Saldo",
                  "Min / ROP",
                  "Nilai",
                  "Status",
                ]}
                wide
              >
                {overview.items.map((i) => (
                  <Row key={`${i.ingredientId}-${i.outletId}`} onClick={() => setSelected(i)}>
                    <Cell className="mono text-ink/90">{i.sku}</Cell>
                    <Cell>
                      <span className="font-medium">{i.ingredientName}</span>
                      <small className="mt-0.5 block text-[11px] text-mute">
                        {i.batchCount} batch · {i.unitCode}
                      </small>
                    </Cell>
                    <Cell className="text-mute">{i.categoryName ?? "Tanpa kategori"}</Cell>
                    <Cell>
                      <span>{i.outletName}</span>
                      <small className="mt-0.5 block text-[11px] text-mute">
                        {i.locationNames || "Tanpa lokasi aktif"}
                      </small>
                    </Cell>
                    <Cell className="mono text-right">
                      {number(i.onHand)} {i.unitCode}
                    </Cell>
                    <Cell className="mono text-right text-mute">
                      {number(i.minimumStock)} / {number(i.reorderPoint)}
                    </Cell>
                    <Cell className="mono text-right">
                      <span>{idr(i.stockValue)}</span>
                      <small className="mt-0.5 block text-[11px] text-mute">
                        {idr(i.weightedUnitCost)}/{i.unitCode}
                      </small>
                    </Cell>
                    <Cell>
                      <StockBadge status={i.status} />
                    </Cell>
                  </Row>
                ))}
              </DataTable>
            )}
          </Card>
          <div className="space-y-4">
            <Card className="p-4">
              <h2 className="text-[14px] font-semibold tracking-tight">Stok per Kategori</h2>
              {overview?.categories.length ? (
                <ul className="mt-3 space-y-3">
                  {overview.categories.slice(0, 6).map((c) => {
                    const pct =
                      categoryTotal > 0 ? Math.round((c.stockValue / categoryTotal) * 100) : 0;
                    return (
                      <li key={c.categoryId ?? "uncategorized"}>
                        <div className="flex justify-between gap-3 text-[12.5px]">
                          <span className="truncate font-medium">{c.categoryName}</span>
                          <span className="mono whitespace-nowrap text-mute">
                            {idr(c.stockValue)}
                          </span>
                        </div>
                        <div className="mt-1.5">
                          <Progress value={pct} />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-mute">Belum ada valuation kategori.</p>
              )}
            </Card>
            <Card className="p-4">
              <h2 className="text-[14px] font-semibold tracking-tight">Prioritas Perhatian</h2>
              {attention.length ? (
                <ul className="mt-3 space-y-2.5">
                  {attention.map((i) => (
                    <li key={`${i.ingredientId}-${i.outletId}`}>
                      <button
                        className="flex w-full items-start gap-2.5 rounded-lg p-1 text-left hover:bg-black/[0.025] focus-visible:outline-2 focus-visible:outline-olive"
                        onClick={() => setSelected(i)}
                      >
                        <AlertTriangle
                          className={`mt-0.5 size-3.5 shrink-0 ${i.status === "out" || i.status === "critical" ? "text-terra" : "text-[oklch(0.52_0.11_70)]"}`}
                        />
                        <span className="text-[12.5px] leading-snug">
                          <span className="block font-medium">{i.ingredientName}</span>
                          <span className="mt-0.5 block text-mute">
                            {STATUS[i.status].label} · {number(i.onHand)} {i.unitCode}
                            {i.expiryDays !== null && i.expiryDays <= 7
                              ? ` · expiry ${i.expiryDays} hari`
                              : ""}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-mute">Tidak ada stok yang memerlukan perhatian.</p>
              )}
            </Card>
          </div>
        </div>
      )}
      {tab === "pergerakan" && (
        <Card className="min-w-0 overflow-hidden">
          <CardHeader title="Ledger Pergerakan Stok" sub={`${visibleMovements.length} baris`} />
          {!visibleMovements.length ? (
            <InventoryState
              kind="empty"
              title={
                search || movementType || locationId
                  ? "Tidak ada hasil ledger"
                  : "Belum ada pergerakan stok"
              }
              message="Tidak ada baris ledger yang sesuai dengan filter aktif."
            />
          ) : (
            <DataTable
              head={[
                "Movement / Waktu",
                "Bahan",
                "Lokasi / Batch",
                "Tipe",
                "Kuantitas",
                "Nilai",
                "Referensi",
                "Status",
              ]}
              wide
            >
              {visibleMovements.map((m) => (
                <Row key={m.id}>
                  <Cell>
                    <span className="mono text-ink/90">{m.movementNo}</span>
                    <small className="mt-0.5 block text-[11px] text-mute">
                      {dateTime(m.movementAt)}
                    </small>
                  </Cell>
                  <Cell>
                    <span className="font-medium">{m.ingredientName}</span>
                    <small className="mono mt-0.5 block text-[11px] text-mute">
                      {m.ingredientSku}
                    </small>
                  </Cell>
                  <Cell>
                    <span>{m.storageLocationName}</span>
                    <small className="mt-0.5 block text-[11px] text-mute">
                      {m.outletName} · {m.batchNo ?? "Tanpa batch"}
                    </small>
                  </Cell>
                  <Cell>
                    <span className="inline-flex items-center gap-1.5">
                      {m.quantityDelta >= 0 ? (
                        <ArrowDownLeft className="size-3.5 text-olive" />
                      ) : (
                        <ArrowUpRight className="size-3.5 text-terra" />
                      )}
                      {MOVEMENT_LABEL[m.movementType] ?? m.movementType}
                    </span>
                  </Cell>
                  <Cell
                    className={`mono text-right ${m.quantityDelta < 0 ? "text-terra" : "text-olive-deep"}`}
                  >
                    {m.quantityDelta > 0 ? "+" : ""}
                    {number(m.quantityDelta)} {m.unitCode}
                    <small className="mt-0.5 block text-[11px] text-mute">
                      saldo {m.balanceAfter === null ? "–" : number(m.balanceAfter)}
                    </small>
                  </Cell>
                  <Cell className="mono text-right">
                    {m.valueDelta > 0 ? "+" : ""}
                    {idr(m.valueDelta)}
                    <small className="mt-0.5 block text-[11px] text-mute">
                      {idr(m.unitCost)}/{m.unitCode}
                    </small>
                  </Cell>
                  <Cell>
                    <span className="mono">{m.referenceNo}</span>
                    {m.reason && (
                      <small
                        className="mt-0.5 block max-w-48 truncate text-[11px] text-mute"
                        title={m.reason}
                      >
                        {m.reason}
                      </small>
                    )}
                  </Cell>
                  <Cell>
                    <Badge tone={m.movementType === "reversal" ? "terra" : "olive"}>
                      {m.status}
                    </Badge>
                  </Cell>
                </Row>
              ))}
            </DataTable>
          )}
        </Card>
      )}
      <Drawer
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected?.ingredientName ?? "Detail Inventory"}
        sub={selected ? `${selected.sku} · ${selected.outletName}` : undefined}
      >
        {detailLoading && (
          <InventoryState
            kind="loading"
            title="Memuat detail"
            message="Batch, lokasi, dan ledger sedang diambil."
          />
        )}
        {detailError && !detailLoading && (
          <InventoryState
            kind="error"
            title="Detail tidak dapat dimuat"
            message={detailError}
            action="Coba lagi"
            onAction={() => {
              const current = selected;
              setSelected(null);
              window.setTimeout(() => setSelected(current), 0);
            }}
          />
        )}
        {detail && !detailLoading && <Detail detail={detail} />}
      </Drawer>
    </div>
  );
}

function Toolbar(p: {
  search: string;
  onSearch: (v: string) => void;
  outletId: string;
  onOutlet: (v: string) => void;
  locationId: string;
  onLocation: (v: string) => void;
  categoryId: string;
  onCategory: (v: string) => void;
  status: string;
  onStatus: (v: string) => void;
  movementType: string;
  onMovementType: (v: string) => void;
  lookup: InventoryLookup | null;
  locations: InventoryLookup["storageLocations"];
  movementMode: boolean;
}) {
  return (
    <Card className="mb-4 p-3">
      <div className="flex flex-wrap items-end gap-2">
        <label className="min-w-52 flex-1 text-[11px] font-medium text-mute">
          Cari
          <div className="relative mt-1">
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2" />
            <TextInput
              value={p.search}
              onChange={(e) => p.onSearch(e.target.value)}
              placeholder={
                p.movementMode
                  ? "Movement, referensi, bahan, batch…"
                  : "Nama bahan, SKU, kategori, lokasi…"
              }
              className="w-full pl-8"
            />
          </div>
        </label>
        <Filter label="Outlet">
          <SelectInput
            aria-label="Filter outlet Inventory"
            value={p.outletId}
            onChange={(e) => p.onOutlet(e.target.value)}
            className="mt-1 min-w-36"
          >
            <option value="">Semua outlet akses</option>
            {p.lookup?.outlets.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </SelectInput>
        </Filter>
        <Filter label="Lokasi">
          <SelectInput
            aria-label="Filter lokasi Inventory"
            value={p.locationId}
            onChange={(e) => p.onLocation(e.target.value)}
            className="mt-1 min-w-36"
          >
            <option value="">Semua lokasi</option>
            {p.locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </SelectInput>
        </Filter>
        {p.movementMode ? (
          <Filter label="Tipe movement">
            <SelectInput
              aria-label="Filter tipe movement"
              value={p.movementType}
              onChange={(e) => p.onMovementType(e.target.value)}
              className="mt-1 min-w-40"
            >
              <option value="">Semua tipe</option>
              {MOVEMENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {MOVEMENT_LABEL[t]}
                </option>
              ))}
            </SelectInput>
          </Filter>
        ) : (
          <>
            <Filter label="Kategori">
              <SelectInput
                aria-label="Filter kategori Inventory"
                value={p.categoryId}
                onChange={(e) => p.onCategory(e.target.value)}
                className="mt-1 min-w-36"
              >
                <option value="">Semua kategori</option>
                {p.lookup?.categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </SelectInput>
            </Filter>
            <Filter label="Status">
              <SelectInput
                aria-label="Filter status Inventory"
                value={p.status}
                onChange={(e) => p.onStatus(e.target.value)}
                className="mt-1 min-w-32"
              >
                <option value="">Semua status</option>
                {Object.entries(STATUS).map(([v, i]) => (
                  <option key={v} value={v}>
                    {i.label}
                  </option>
                ))}
              </SelectInput>
            </Filter>
          </>
        )}
      </div>
    </Card>
  );
}
function Filter({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="text-[11px] font-medium text-mute">
      {label}
      {children}
    </label>
  );
}
function Detail({ detail: d }: { detail: InventoryDetail }) {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <StockBadge status={d.status} />
        <span className="mono text-[16px] font-semibold">
          {number(d.onHand)} {d.unitCode}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 text-[12.5px]">
        <Metric label="Nilai stok" value={idr(d.stockValue)} />
        <Metric label="Biaya rata-rata" value={`${idr(d.weightedUnitCost)}/${d.unitCode}`} />
        <Metric
          label="Minimum / ROP"
          value={`${number(d.minimumStock)} / ${number(d.reorderPoint)}`}
        />
        <Metric
          label="Expiry terdekat"
          value={
            d.nearestExpiry
              ? `${date(d.nearestExpiry)} · ${expiryText(d.expiryDays)}`
              : "Tanpa expiry"
          }
        />
      </div>
      <section>
        <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-mute">
          Posisi per lokasi
        </h3>
        <ul className="space-y-2">
          {d.locations.map((l) => (
            <li
              key={l.id}
              className="flex justify-between gap-3 rounded-lg bg-cream px-3 py-2 text-[12.5px] ring-1 ring-black/5"
            >
              <span>
                <strong className="block">{l.name}</strong>
                <small className="text-mute">
                  {l.code} · {l.batchCount} batch aktif
                </small>
              </span>
              <span className="text-right">
                <strong className="mono block">
                  {number(l.quantityOnHand)} {d.unitCode}
                </strong>
                <small className="text-mute">{idr(l.stockValue)}</small>
              </span>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-mute">
          Batch · urutan FEFO
        </h3>
        <div className="max-w-full overflow-x-auto rounded-lg ring-1 ring-black/5">
          <table className="w-full min-w-[620px] text-[12px]">
            <thead className="bg-cream text-left text-mute">
              <tr>
                <th className="p-2">Batch</th>
                <th className="p-2">Lokasi</th>
                <th className="p-2">Diterima</th>
                <th className="p-2">Expiry</th>
                <th className="p-2 text-right">Saldo</th>
                <th className="p-2 text-right">Biaya/Nilai</th>
                <th className="p-2">Sumber</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {d.batches.map((b) => (
                <tr key={b.id} className={b.quantityOnHand <= 0 ? "opacity-55" : ""}>
                  <td className="p-2 mono">
                    {b.batchNo ?? "Tanpa batch"}
                    {b.quantityOnHand <= 0 && <small className="block text-terra">Depleted</small>}
                  </td>
                  <td className="p-2">{b.storageLocationName}</td>
                  <td className="p-2">{date(b.receivedDate)}</td>
                  <td className="p-2">
                    {b.expiryDate ? date(b.expiryDate) : "–"}
                    <small className="block text-mute">{expiryText(b.expiryDays)}</small>
                  </td>
                  <td className="p-2 text-right mono">
                    {number(b.quantityOnHand)} {d.unitCode}
                  </td>
                  <td className="p-2 text-right mono">
                    {idr(b.unitCost)}
                    <small className="block text-mute">{idr(b.stockValue)}</small>
                  </td>
                  <td className="p-2 mono">{b.sourceReceiptNo ?? "–"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section>
        <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-mute">
          Ledger terbaru
        </h3>
        {d.movements.length ? (
          <ul className="space-y-2">
            {d.movements.map((m) => (
              <li
                key={m.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-cream px-3 py-2 text-[12px] ring-1 ring-black/5"
              >
                <span>
                  <strong className="mono block">{m.movementNo}</strong>
                  <small className="text-mute">
                    {MOVEMENT_LABEL[m.movementType] ?? m.movementType} · {dateTime(m.movementAt)}
                  </small>
                </span>
                <span className={m.quantityDelta >= 0 ? "mono text-olive-deep" : "mono text-terra"}>
                  {m.quantityDelta > 0 ? "+" : ""}
                  {number(m.quantityDelta)} {m.unitCode}
                </span>
                <Badge tone={m.movementType === "reversal" ? "terra" : "olive"}>{m.status}</Badge>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-mute">Belum ada ledger untuk posisi ini.</p>
        )}
      </section>
      <p className="rounded-lg bg-olive-soft px-3 py-2 text-xs leading-relaxed text-olive-deep">
        Inventory Overview bersifat read-only. Saldo hanya berubah melalui transaksi stok yang
        tercatat pada ledger.
      </p>
    </div>
  );
}
function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-cream p-3 ring-1 ring-black/5">
      <p className="text-mute">{label}</p>
      <p className="mono mt-1 font-medium">{value}</p>
    </div>
  );
}
function StockBadge({ status }: { status: StockStatus }) {
  const i = STATUS[status];
  return (
    <Badge tone={i.tone}>
      <span aria-hidden="true">●</span> {i.label}
    </Badge>
  );
}
function InventoryState({
  kind,
  title,
  message,
  action,
  onAction,
}: {
  kind: "loading" | "empty" | "forbidden" | "error";
  title: string;
  message: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div
      className="grid min-h-48 place-items-center px-5 py-8 text-center"
      role={kind === "error" ? "alert" : kind === "loading" ? "status" : undefined}
      aria-live={kind === "loading" ? "polite" : undefined}
    >
      <div>
        {kind === "loading" && (
          <span className="mx-auto mb-3 block size-7 animate-spin rounded-full border-2 border-olive/20 border-t-olive" />
        )}
        <strong className="block text-sm">{title}</strong>
        <p className="mx-auto mt-1 max-w-lg text-[12.5px] leading-relaxed text-mute">{message}</p>
        {action && (
          <button
            className="mt-4 rounded-lg bg-olive px-3 py-2 text-xs font-semibold text-cream focus-visible:outline-2 focus-visible:outline-olive"
            onClick={onAction}
          >
            {action}
          </button>
        )}
      </div>
    </div>
  );
}
function normalizeOverview(v: Overview): Overview {
  return {
    ...v,
    summary: {
      ...v.summary,
      skuCount: Number(v.summary.skuCount),
      totalQuantity: Number(v.summary.totalQuantity),
      stockValue: Number(v.summary.stockValue),
      attentionCount: Number(v.summary.attentionCount),
      expiringBatchCount: Number(v.summary.expiringBatchCount),
      expiredBatchCount: Number(v.summary.expiredBatchCount),
    },
    categories: v.categories.map((i) => ({ ...i, stockValue: Number(i.stockValue) })),
    items: v.items.map((i) => ({
      ...i,
      onHand: Number(i.onHand),
      stockValue: Number(i.stockValue),
      weightedUnitCost: Number(i.weightedUnitCost),
      minimumStock: Number(i.minimumStock),
      reorderPoint: Number(i.reorderPoint),
      parStock: Number(i.parStock),
      batchCount: Number(i.batchCount),
      locationCount: Number(i.locationCount),
      expiryDays: i.expiryDays === null ? null : Number(i.expiryDays),
    })),
  };
}
function normalizeMovement(v: Movement): Movement {
  return {
    ...v,
    quantityDelta: Number(v.quantityDelta),
    unitCost: Number(v.unitCost),
    valueDelta: Number(v.valueDelta),
    balanceAfter: v.balanceAfter === null ? null : Number(v.balanceAfter),
  };
}
function normalizeDetail(v: InventoryDetail): InventoryDetail {
  const base = normalizeOverview({
    summary: {
      skuCount: 1,
      totalQuantity: v.onHand,
      stockValue: v.stockValue,
      attentionCount: 0,
      expiringBatchCount: 0,
      expiredBatchCount: 0,
    },
    categories: [],
    items: [v],
    generatedAt: "",
  }).items[0]!;
  return {
    ...v,
    ...base,
    locations: v.locations.map((i) => ({
      ...i,
      quantityOnHand: Number(i.quantityOnHand),
      stockValue: Number(i.stockValue),
      batchCount: Number(i.batchCount),
    })),
    batches: v.batches.map((i) => ({
      ...i,
      quantityOnHand: Number(i.quantityOnHand),
      unitCost: Number(i.unitCost),
      stockValue: Number(i.stockValue),
      expiryDays: i.expiryDays === null ? null : Number(i.expiryDays),
    })),
    movements: v.movements.map(normalizeMovement),
  };
}
function idr(v: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(v);
}
function number(v: number) {
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 4 }).format(v);
}
function date(v: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${v.slice(0, 10)}T00:00:00`));
}
function dateTime(v: string) {
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(v),
  );
}
function expiryText(d: number | null) {
  if (d === null) return "Tanpa expiry";
  if (d < 0) return `Lewat ${Math.abs(d)} hari`;
  if (d === 0) return "Hari ini";
  return `${d} hari lagi`;
}
function errorMessage(e: unknown) {
  return e instanceof Error ? e.message : "Data Inventory tidak dapat dimuat.";
}
