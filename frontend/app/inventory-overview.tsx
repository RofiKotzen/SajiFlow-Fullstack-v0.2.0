"use client";

import { useEffect, useMemo, useState } from "react";
import type { ApiClient, AuthSession } from "./sajiflow-api";
import "./inventory-overview.css";

type StockStatus = "out" | "critical" | "low" | "safe";
type InventoryItem = {
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
  lastUpdatedAt: string;
  status: StockStatus;
  expiryDays: number | null;
};
type Overview = {
  summary: { skuCount: number; totalQuantity: number; stockValue: number; attentionCount: number; expiringBatchCount: number; expiredBatchCount: number };
  categories: Array<{ categoryId: string | null; categoryName: string; stockValue: number }>;
  items: InventoryItem[];
  generatedAt: string;
};
type Lookup = {
  outlets: Array<{ id: string; code: string; name: string }>;
  storageLocations: Array<{ id: string; outletId: string; code: string; name: string; locationType: string }>;
  categories: Array<{ id: string; name: string }>;
};
type Movement = {
  id: string;
  movementNo: string;
  movementType: string;
  movementAt: string;
  status: "posted" | "reversed";
  referenceNo: string;
  reason: string | null;
  ingredientId: string;
  ingredientSku: string;
  ingredientName: string;
  unitCode: string;
  outletId: string;
  outletName: string;
  storageLocationId: string;
  storageLocationName: string;
  batchNo: string | null;
  quantityDelta: number;
  unitCost: number;
  valueDelta: number;
  balanceAfter: number | null;
  actorName: string | null;
};
type InventoryDetail = InventoryItem & {
  locations: Array<{ id: string; code: string; name: string; quantityOnHand: number; stockValue: number; batchCount: number }>;
  batches: Array<{ id: string; batchNo: string | null; receivedDate: string; expiryDate: string | null; quantityOnHand: number; unitCost: number; stockValue: number; storageLocationCode: string; storageLocationName: string; sourceReceiptNo: string | null; updatedAt: string; expiryDays: number | null }>;
  movements: Movement[];
};

const STATUS: Record<StockStatus, { label: string; note: string }> = {
  out: { label: "Stok Habis", note: "Saldo tidak tersedia" },
  critical: { label: "Kritis", note: "Di bawah minimum" },
  low: { label: "Menipis", note: "Mencapai reorder point" },
  safe: { label: "Aman", note: "Di atas reorder point" },
};
const MOVEMENT_LABEL: Record<string, string> = {
  receipt: "Penerimaan Barang",
  reversal: "Reversal Penerimaan",
  sale_consumption: "Pemakaian Penjualan",
  transfer_out: "Transfer Keluar",
  transfer_in: "Transfer Masuk",
  waste: "Waste",
  opname_adjustment: "Penyesuaian Opname",
};

function rupiah(value: number) { return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(value) || 0); }
function number(value: number) { return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 3 }).format(Number(value) || 0); }
function date(value: string) { return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(new Date(`${value}T00:00:00`)); }
function dateTime(value: string) { return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)); }
function statusChip(status: StockStatus) { return <span className={`io-status io-${status}`}><i/>{STATUS[status].label}</span>; }
function expiryText(days: number | null) {
  if (days === null) return "Tanpa expiry";
  if (days < 0) return `Kedaluwarsa ${Math.abs(days)} hari lalu`;
  if (days === 0) return "Kedaluwarsa hari ini";
  return `${days} hari lagi`;
}

export function ConnectedInventoryOverview({ session, api }: { session: AuthSession; api: ApiClient }) {
  const allowed = session.user.permissions.includes("inventory.read");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [lookups, setLookups] = useState<Lookup>({ outlets: [], storageLocations: [], categories: [] });
  const [movements, setMovements] = useState<Movement[]>([]);
  const [detail, setDetail] = useState<InventoryDetail | null>(null);
  const [mode, setMode] = useState<"overview" | "movements" | "detail">("overview");
  const [search, setSearch] = useState("");
  const [outletId, setOutletId] = useState("all");
  const [locationId, setLocationId] = useState("all");
  const [categoryId, setCategoryId] = useState("all");
  const [stockStatus, setStockStatus] = useState("all");
  const [movementType, setMovementType] = useState("all");
  const [loading, setLoading] = useState(allowed);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!allowed) return;
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const [stock, lookup, ledger] = await Promise.all([
          api<Overview>("/inventory"),
          api<Lookup>("/inventory/lookups"),
          api<Movement[]>("/inventory/movements"),
        ]);
        if (!active) return;
        setOverview(normalizeOverview(stock));
        setLookups(lookup);
        setMovements(ledger.map(normalizeMovement));
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "Data inventory gagal dimuat.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [allowed, api]);

  const visibleItems = useMemo(() => (overview?.items ?? []).filter((item) => {
    const matched = `${item.ingredientName} ${item.sku} ${item.categoryName ?? ""} ${item.locationNames}`.toLowerCase().includes(search.toLowerCase());
    return matched && (outletId === "all" || item.outletId === outletId) && (categoryId === "all" || item.categoryId === categoryId) && (stockStatus === "all" || item.status === stockStatus) && (locationId === "all" || item.locationNames.includes(lookups.storageLocations.find((entry) => entry.id === locationId)?.name ?? "\u0000"));
  }), [overview, search, outletId, categoryId, stockStatus, locationId, lookups.storageLocations]);
  const visibleMovements = useMemo(() => movements.filter((item) => {
    const matched = `${item.movementNo} ${item.referenceNo} ${item.ingredientName} ${item.ingredientSku} ${item.storageLocationName}`.toLowerCase().includes(search.toLowerCase());
    return matched && (outletId === "all" || item.outletId === outletId) && (locationId === "all" || item.storageLocationId === locationId) && (movementType === "all" || item.movementType === movementType);
  }), [movements, search, outletId, locationId, movementType]);
  const visibleValue = visibleItems.reduce((sum, item) => sum + item.stockValue, 0);
  const visibleAttention = visibleItems.filter((item) => item.status !== "safe" || (item.expiryDays !== null && item.expiryDays <= 7)).length;
  const categoryValues = useMemo(() => {
    const values = new Map<string, number>();
    for (const item of visibleItems) values.set(item.categoryName ?? "Tanpa Kategori", (values.get(item.categoryName ?? "Tanpa Kategori") ?? 0) + item.stockValue);
    return [...values.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [visibleItems]);
  const maxCategoryValue = Math.max(...categoryValues.map((item) => item.value), 1);

  async function openDetail(item: InventoryItem) {
    setLoading(true); setError("");
    try {
      const value = await api<InventoryDetail>(`/inventory/${item.ingredientId}?outletId=${item.outletId}`);
      setDetail(normalizeDetail(value));
      setMode("detail");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Detail stok gagal dimuat."); }
    finally { setLoading(false); }
  }

  if (!allowed) return <div className="io-empty"><strong>Akses Inventory belum diberikan</strong><span>Role ini memerlukan permission inventory.read.</span></div>;
  if (loading && !overview) return <div className="io-loading"><span/><strong>Menghitung saldo inventory…</strong></div>;

  return <div className="inventory-connected">
    {error && <div className="io-error" role="alert"><div><strong>Inventory belum dapat ditampilkan</strong><span>{error}</span></div><button onClick={() => setError("")}>×</button></div>}

    {mode === "detail" && detail ? <InventoryDetailView item={detail} onBack={() => { setMode("overview"); setDetail(null); }}/> : <>
      <div className="io-sync"><div><span>✓</span><div><strong>Saldo terhubung ke stock ledger</strong><small>Goods Receipt menambah stok dan Void membuat reversal otomatis</small></div></div><b>READ ONLY</b></div>
      <div className="stats-grid io-stats">
        <article className="stat-card"><div className="stat-icon green">Rp</div><div><span>Nilai persediaan</span><strong>{rupiah(visibleValue)}</strong><small>{visibleItems.length} posisi bahan</small></div></article>
        <article className="stat-card"><div className="stat-icon blue">SKU</div><div><span>Bahan tersimpan</span><strong>{visibleItems.length}</strong><small>{visibleItems.reduce((sum, item) => sum + item.batchCount, 0)} batch aktif</small></div></article>
        <article className="stat-card"><div className="stat-icon gold">!</div><div><span>Perlu perhatian</span><strong>{visibleAttention}</strong><small>Stok minimum atau expiry</small></div></article>
        <article className="stat-card"><div className="stat-icon purple">↕</div><div><span>Baris ledger</span><strong>{visibleMovements.length}</strong><small>{movements.filter((item) => item.movementType === "receipt").length} dari penerimaan</small></div></article>
      </div>

      <section className="panel io-workspace">
        <div className="io-tabs"><button className={mode === "overview" ? "active" : ""} onClick={() => setMode("overview")}>Posisi Stok <span>{visibleItems.length}</span></button><button className={mode === "movements" ? "active" : ""} onClick={() => setMode("movements")}>Kartu Stok <span>{visibleMovements.length}</span></button></div>
        <div className="io-toolbar"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={mode === "overview" ? "Cari bahan, SKU, kategori, atau lokasi…" : "Cari nomor ledger, referensi, atau bahan…"}/><select value={outletId} onChange={(event) => { setOutletId(event.target.value); setLocationId("all"); }}><option value="all">Semua outlet</option>{lookups.outlets.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select><select value={locationId} onChange={(event) => setLocationId(event.target.value)}><option value="all">Semua lokasi</option>{lookups.storageLocations.filter((item) => outletId === "all" || item.outletId === outletId).map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select>{mode === "overview" ? <><select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}><option value="all">Semua kategori</option>{lookups.categories.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select><select value={stockStatus} onChange={(event) => setStockStatus(event.target.value)}><option value="all">Semua status</option>{Object.entries(STATUS).map(([value, item]) => <option value={value} key={value}>{item.label}</option>)}</select></> : <select value={movementType} onChange={(event) => setMovementType(event.target.value)}><option value="all">Semua pergerakan</option>{Object.entries(MOVEMENT_LABEL).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select>}</div>

        {mode === "overview" && <><div className="io-overview-grid"><section><div className="io-subheading"><div><h2>Nilai Stok per Kategori</h2><p>Komposisi persediaan dari batch aktif</p></div><strong>{rupiah(visibleValue)}</strong></div><div className="io-category-bars">{categoryValues.map((item) => <div key={item.name}><div><span>{item.name}</span><b>{rupiah(item.value)}</b></div><i><span style={{ width: `${(item.value / maxCategoryValue) * 100}%` }}/></i></div>)}</div>{!categoryValues.length && <p className="io-muted">Belum ada nilai stok pada filter ini.</p>}</section><section><div className="io-subheading"><div><h2>Prioritas Stok</h2><p>Bahan yang membutuhkan pemeriksaan</p></div><strong>{visibleAttention} item</strong></div><div className="io-priorities">{visibleItems.filter((item) => item.status !== "safe" || (item.expiryDays !== null && item.expiryDays <= 7)).slice(0, 4).map((item) => <button key={`${item.ingredientId}-${item.outletId}`} onClick={() => void openDetail(item)}><span className={`io-priority-icon io-${item.status}`}>{item.expiryDays !== null && item.expiryDays <= 7 ? `${Math.max(0, item.expiryDays)}d` : "!"}</span><div><strong>{item.ingredientName}</strong><small>{item.status !== "safe" ? STATUS[item.status].note : expiryText(item.expiryDays)}</small></div><b>→</b></button>)}{!visibleAttention && <p className="io-muted">Seluruh stok pada filter ini dalam kondisi aman.</p>}</div></section></div>
          <div className="table-wrap"><table className="io-table"><thead><tr><th>Bahan Baku</th><th>Outlet</th><th>Lokasi</th><th>Stok Fisik</th><th>Batas Stok</th><th>Batch / Expiry</th><th>Nilai</th><th>Status</th><th/></tr></thead><tbody>{visibleItems.map((item) => <tr key={`${item.ingredientId}-${item.outletId}`} onClick={() => void openDetail(item)}><td><strong>{item.ingredientName}</strong><small>{item.sku} • {item.categoryName ?? "Tanpa kategori"}</small></td><td>{item.outletName}</td><td><strong>{item.locationNames || "–"}</strong><small>{item.locationCount} lokasi aktif</small></td><td><strong>{number(item.onHand)} {item.unitCode}</strong><small>{rupiah(item.weightedUnitCost)} / {item.unitCode}</small></td><td><span>Min {number(item.minimumStock)}</span><small>Reorder {number(item.reorderPoint)} {item.unitCode}</small></td><td><strong>{item.batchCount} batch</strong><small className={item.expiryDays !== null && item.expiryDays <= 7 ? "io-expiry-warning" : ""}>{item.nearestExpiry ? `${date(item.nearestExpiry)} • ${expiryText(item.expiryDays)}` : "Tanpa expiry"}</small></td><td><strong>{rupiah(item.stockValue)}</strong></td><td>{statusChip(item.status)}</td><td><button aria-label={`Detail ${item.ingredientName}`}>→</button></td></tr>)}</tbody></table>{!visibleItems.length && <div className="io-empty"><strong>Posisi stok tidak ditemukan</strong><span>Ubah kata kunci atau filter yang digunakan.</span></div>}</div><div className="io-footer">Saldo dihitung dari {visibleItems.reduce((sum, item) => sum + item.batchCount, 0)} batch aktif • Pembaruan {overview ? dateTime(overview.generatedAt) : "–"}</div></>}

        {mode === "movements" && <div className="io-ledger"><div className="io-ledger-head"><span>Ledger & Referensi</span><span>Bahan / Lokasi</span><span>Jenis</span><span>Perubahan</span><span>Saldo Setelah</span><span>Status</span></div>{visibleMovements.map((item) => <article key={item.id}><div><strong>{item.movementNo}</strong><small>{item.referenceNo} • {dateTime(item.movementAt)}</small></div><div><strong>{item.ingredientName}</strong><small>{item.storageLocationName}{item.batchNo ? ` • ${item.batchNo}` : ""}</small></div><span className={`io-movement-type ${item.quantityDelta >= 0 ? "in" : "out"}`}>{MOVEMENT_LABEL[item.movementType] ?? item.movementType}</span><b className={item.quantityDelta >= 0 ? "positive" : "negative"}>{item.quantityDelta >= 0 ? "+" : ""}{number(item.quantityDelta)} {item.unitCode}<small>{item.valueDelta >= 0 ? "+" : ""}{rupiah(item.valueDelta)}</small></b><strong>{item.balanceAfter === null ? "–" : `${number(item.balanceAfter)} ${item.unitCode}`}</strong><span className={`io-ledger-status ${item.status}`}>{item.status}</span></article>)}{!visibleMovements.length && <div className="io-empty"><strong>Ledger tidak ditemukan</strong><span>Belum ada pergerakan yang sesuai filter.</span></div>}</div>}
      </section>
    </>}
  </div>;
}

function InventoryDetailView({ item, onBack }: { item: InventoryDetail; onBack: () => void }) {
  return <div className="io-detail"><div className="io-backbar"><button onClick={onBack}>← Posisi Stok</button><div><span>DETAIL INVENTORY</span><h2>{item.ingredientName}</h2><p>{item.sku} • {item.categoryName ?? "Tanpa kategori"} • {item.outletName}</p></div>{statusChip(item.status)}</div>
    <div className="io-detail-hero"><div><span>Stok fisik</span><strong>{number(item.onHand)} {item.unitCode}</strong><small>{item.locations.length} lokasi • {item.batchCount} batch aktif</small></div><div><span>Nilai persediaan</span><strong>{rupiah(item.stockValue)}</strong><small>Rata-rata {rupiah(item.weightedUnitCost)} / {item.unitCode}</small></div><div><span>Batas pengendalian</span><strong>{number(item.minimumStock)} / {number(item.reorderPoint)}</strong><small>Minimum / reorder point</small></div><div><span>Expiry terdekat</span><strong>{item.nearestExpiry ? date(item.nearestExpiry) : "Tidak ada"}</strong><small>{expiryText(item.expiryDays)}</small></div></div>
    <div className="io-detail-grid"><section className="panel"><div className="io-panel-heading"><div><h2>Posisi per Lokasi</h2><p>Saldo batch dikelompokkan berdasarkan area penyimpanan.</p></div></div><div className="io-location-list">{item.locations.map((location) => <article key={location.id}><span>{location.code}</span><div><strong>{location.name}</strong><small>{location.batchCount} batch aktif</small></div><b>{number(location.quantityOnHand)} {item.unitCode}<small>{rupiah(location.stockValue)}</small></b></article>)}</div></section><section className="panel"><div className="io-panel-heading"><div><h2>Kontrol Stok</h2><p>Parameter outlet untuk pembelian dan penyimpanan.</p></div></div><div className="io-control-grid"><div><span>Minimum</span><strong>{number(item.minimumStock)} {item.unitCode}</strong></div><div><span>Reorder point</span><strong>{number(item.reorderPoint)} {item.unitCode}</strong></div><div><span>Par stock</span><strong>{number(item.parStock)} {item.unitCode}</strong></div><div><span>Status</span><strong>{STATUS[item.status].label}</strong></div></div><p className="io-readonly-note">Posisi ini hanya dapat berubah melalui transaksi stok yang tercatat pada ledger.</p></section></div>
    <section className="panel io-batches"><div className="io-panel-heading"><div><h2>Batch & Masa Simpan</h2><p>Urutan FEFO menampilkan expiry terdekat lebih dahulu.</p></div><span>{item.batches.filter((batch) => batch.quantityOnHand > 0).length} batch aktif</span></div><div className="table-wrap"><table><thead><tr><th>Batch</th><th>Lokasi</th><th>Diterima</th><th>Expiry</th><th>Saldo</th><th>Biaya Unit</th><th>Nilai</th><th>Sumber</th></tr></thead><tbody>{item.batches.map((batch) => <tr key={batch.id} className={batch.quantityOnHand <= 0 ? "depleted" : ""}><td><strong>{batch.batchNo ?? "Tanpa nomor batch"}</strong></td><td>{batch.storageLocationName}<small>{batch.storageLocationCode}</small></td><td>{date(batch.receivedDate)}</td><td><strong className={batch.expiryDays !== null && batch.expiryDays <= 7 ? "io-expiry-warning" : ""}>{batch.expiryDate ? date(batch.expiryDate) : "–"}</strong><small>{expiryText(batch.expiryDays)}</small></td><td><strong>{number(batch.quantityOnHand)} {item.unitCode}</strong></td><td>{rupiah(batch.unitCost)}</td><td><strong>{rupiah(batch.stockValue)}</strong></td><td>{batch.sourceReceiptNo ?? "–"}</td></tr>)}</tbody></table></div></section>
    <section className="panel io-detail-ledger"><div className="io-panel-heading"><div><h2>Pergerakan Terakhir</h2><p>Jejak debit dan kredit untuk bahan ini.</p></div><span>{item.movements.length} baris</span></div><div className="io-ledger">{item.movements.map((movement) => <article key={movement.id}><div><strong>{movement.movementNo}</strong><small>{movement.referenceNo} • {dateTime(movement.movementAt)}</small></div><div><strong>{movement.storageLocationName}</strong><small>{movement.batchNo ?? "Tanpa batch"}</small></div><span className={`io-movement-type ${movement.quantityDelta >= 0 ? "in" : "out"}`}>{MOVEMENT_LABEL[movement.movementType] ?? movement.movementType}</span><b className={movement.quantityDelta >= 0 ? "positive" : "negative"}>{movement.quantityDelta >= 0 ? "+" : ""}{number(movement.quantityDelta)} {movement.unitCode}</b><strong>{movement.balanceAfter === null ? "–" : `${number(movement.balanceAfter)} ${movement.unitCode}`}</strong><span className={`io-ledger-status ${movement.status}`}>{movement.status}</span></article>)}</div></section>
  </div>;
}

function normalizeOverview(value: Overview): Overview { return { ...value, summary: { ...value.summary, skuCount: Number(value.summary.skuCount), totalQuantity: Number(value.summary.totalQuantity), stockValue: Number(value.summary.stockValue), attentionCount: Number(value.summary.attentionCount), expiringBatchCount: Number(value.summary.expiringBatchCount), expiredBatchCount: Number(value.summary.expiredBatchCount) }, categories: value.categories.map((item) => ({ ...item, stockValue: Number(item.stockValue) })), items: value.items.map((item) => ({ ...item, onHand: Number(item.onHand), stockValue: Number(item.stockValue), weightedUnitCost: Number(item.weightedUnitCost), minimumStock: Number(item.minimumStock), reorderPoint: Number(item.reorderPoint), parStock: Number(item.parStock), batchCount: Number(item.batchCount), locationCount: Number(item.locationCount), expiryDays: item.expiryDays === null ? null : Number(item.expiryDays) })) }; }
function normalizeMovement(value: Movement): Movement { return { ...value, quantityDelta: Number(value.quantityDelta), unitCost: Number(value.unitCost), valueDelta: Number(value.valueDelta), balanceAfter: value.balanceAfter === null ? null : Number(value.balanceAfter) }; }
function normalizeDetail(value: InventoryDetail): InventoryDetail { return { ...normalizeOverview({ summary: { skuCount: 1, totalQuantity: value.onHand, stockValue: value.stockValue, attentionCount: 0, expiringBatchCount: 0, expiredBatchCount: 0 }, categories: [], items: [value], generatedAt: new Date().toISOString() }).items[0], locations: value.locations.map((item) => ({ ...item, quantityOnHand: Number(item.quantityOnHand), stockValue: Number(item.stockValue), batchCount: Number(item.batchCount) })), batches: value.batches.map((item) => ({ ...item, quantityOnHand: Number(item.quantityOnHand), unitCost: Number(item.unitCost), stockValue: Number(item.stockValue), expiryDays: item.expiryDays === null ? null : Number(item.expiryDays) })), movements: value.movements.map(normalizeMovement) }; }
