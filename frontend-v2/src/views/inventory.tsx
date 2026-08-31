import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Card, CardHeader, DataTable, Row, Cell, Drawer, SelectInput, TextInput, StatusBadge, Tabs, Badge, Progress } from "@/components/ui";
import { INGREDIENTS, MOVEMENTS, OUTLETS, idr, type Ingredient } from "@/lib/mock-data";

const LOCATIONS = ["Semua lokasi", "Chiller A", "Chiller B", "Freezer 1", "Gudang Kering"];
const CATEGORIES = ["Semua kategori", "Protein", "Karbo", "Dairy", "Minyak", "Minuman", "Bumbu"];
const MOV_TYPES = ["Semua tipe", "purchase", "usage", "waste", "adjustment", "reversal"];

export function InventoryView() {
  const [tab, setTab] = useState("saldo");
  const [q, setQ] = useState("");
  const [outlet, setOutlet] = useState("all");
  const [location, setLocation] = useState(LOCATIONS[0]);
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [movType, setMovType] = useState(MOV_TYPES[0]);
  const [selected, setSelected] = useState<Ingredient | null>(null);

  const rows = useMemo(
    () =>
      INGREDIENTS.filter((i) => {
        const hay = `${i.sku} ${i.name} ${i.category}`.toLowerCase();
        return (
          hay.includes(q.toLowerCase()) &&
          (location === LOCATIONS[0] || i.location === location) &&
          (category === CATEGORIES[0] || i.category === category) &&
          (statusFilter === "all" || i.status === statusFilter)
        );
      }),
    [q, location, category, statusFilter]
  );

  const movs = useMemo(
    () =>
      MOVEMENTS.filter((m) => {
        const hay = `${m.no} ${m.sku} ${m.ref}`.toLowerCase();
        return hay.includes(q.toLowerCase()) && (movType === MOV_TYPES[0] || m.type === movType);
      }),
    [q, movType]
  );

  const stockValue = INGREDIENTS.reduce((s, i) => s + i.stock * 42000, 0);
  const critical = INGREDIENTS.filter((i) => i.status === "critical" || i.status === "out");

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Ringkasan Stok</h1>
          <p className="mt-1 text-[13px] text-mute">Saldo bahan, batch, dan ledger pergerakan (read-only)</p>
        </div>
        <Tabs value={tab} onChange={setTab} tabs={[{ id: "saldo", label: "Ringkasan Stok" }, { id: "pergerakan", label: "Pergerakan", count: movs.length }]} />
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[
          { l: "Nilai Stok", v: idr(stockValue) },
          { l: "Jumlah Bahan", v: String(INGREDIENTS.length) },
          { l: "Stok Kritis", v: String(critical.length) },
          { l: "Pergerakan Bulan Ini", v: String(MOVEMENTS.length) },
        ].map((k) => (
          <Card key={k.l} className="p-3.5">
            <p className="text-[12px] font-medium text-mute">{k.l}</p>
            <p className="mono mt-1.5 text-[20px] font-semibold">{k.v}</p>
          </Card>
        ))}
      </div>

      {tab === "saldo" && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[2fr_1fr]">
          <Card className="overflow-hidden">
            <CardHeader
              title="Saldo Bahan"
              sub={`${rows.length} bahan`}
              action={
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-mute/70" />
                    <TextInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nama, SKU, kategori…" className="w-44 pl-8" />
                  </div>
                  <SelectInput value={outlet} onChange={(e) => setOutlet(e.target.value)} className="w-28">
                    <option value="all">Semua outlet</option>
                    {OUTLETS.map((o) => <option key={o.code} value={o.code}>{o.code}</option>)}
                  </SelectInput>
                  <SelectInput value={location} onChange={(e) => setLocation(e.target.value)} className="w-32">
                    {LOCATIONS.map((l) => <option key={l}>{l}</option>)}
                  </SelectInput>
                  <SelectInput value={category} onChange={(e) => setCategory(e.target.value)} className="w-32">
                    {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                  </SelectInput>
                  <SelectInput value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-28">
                    <option value="all">Semua status</option>
                    <option value="out">Habis</option><option value="critical">Kritis</option><option value="low">Rendah</option><option value="safe">Aman</option>
                  </SelectInput>
                </div>
              }
            />
            <DataTable head={["SKU", "Bahan", "Kategori", "Lokasi", "Saldo", "Min", "ROP", "Status"]} wide>
              {rows.map((i) => (
                <Row key={i.sku} onClick={() => setSelected(i)}>
                  <Cell className="mono text-ink/90">{i.sku}</Cell>
                  <Cell className="font-medium">{i.name}</Cell>
                  <Cell className="text-mute">{i.category}</Cell>
                  <Cell className="text-mute">{i.location}</Cell>
                  <Cell className="mono text-right">{i.stock.toLocaleString("id-ID")} {i.baseUnit}</Cell>
                  <Cell className="mono text-right text-mute">{i.minStock}</Cell>
                  <Cell className="mono text-right text-mute">{i.reorderPoint}</Cell>
                  <Cell><StatusBadge label={i.status} /></Cell>
                </Row>
              ))}
            </DataTable>
          </Card>

          <div className="space-y-4">
            <Card className="p-4">
              <h2 className="text-[14px] font-semibold tracking-tight">Stok per Kategori</h2>
              <ul className="mt-3 space-y-3">
                {["Protein", "Karbo", "Dairy", "Minuman"].map((c) => {
                  const inCat = INGREDIENTS.filter((i) => i.category === c);
                  const pct = Math.round((inCat.filter((i) => i.status === "safe").length / Math.max(1, inCat.length)) * 100);
                  return (
                    <li key={c}>
                      <div className="flex justify-between text-[12.5px]"><span className="font-medium">{c}</span><span className="mono text-mute">{pct}% aman</span></div>
                      <div className="mt-1.5"><Progress value={pct} warn={pct < 60} /></div>
                    </li>
                  );
                })}
              </ul>
            </Card>
            <Card className="p-4">
              <h2 className="text-[14px] font-semibold tracking-tight">Prioritas Perhatian</h2>
              <ul className="mt-3 space-y-2.5">
                {critical.map((i) => (
                  <li key={i.sku} className="flex items-start gap-2.5">
                    <span className={`mt-1.5 size-1.5 shrink-0 rounded-full ${i.status === "out" ? "bg-terra" : "bg-[oklch(0.52_0.11_70)]"}`} />
                    <div className="text-[12.5px] leading-snug">
                      <p className="font-medium">{i.name}</p>
                      <p className="mt-0.5 text-mute">{i.status === "out" ? "Stok habis" : `Sisa ${i.stock} ${i.baseUnit}`} · ROP {i.reorderPoint}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>
      )}

      {tab === "pergerakan" && (
        <Card className="overflow-hidden">
          <CardHeader
            title="Ledger Pergerakan Stok"
            sub={`${movs.length} movement`}
            action={
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-mute/70" />
                  <TextInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nomor movement, referensi…" className="w-52 pl-8" />
                </div>
                <SelectInput value={movType} onChange={(e) => setMovType(e.target.value)} className="w-36">
                  {MOV_TYPES.map((t) => <option key={t}>{t}</option>)}
                </SelectInput>
              </div>
            }
          />
          <DataTable head={["No. Movement", "Tanggal", "Bahan", "Tipe", "Qty", "Referensi", "Status"]} wide>
            {movs.map((m) => (
              <Row key={m.no}>
                <Cell className="mono text-ink/90">{m.no}</Cell>
                <Cell className="text-mute">{m.date}</Cell>
                <Cell>{INGREDIENTS.find((i) => i.sku === m.sku)?.name ?? m.sku}</Cell>
                <Cell className="capitalize">{m.type}</Cell>
                <Cell className={`mono text-right ${m.qty < 0 ? "text-terra" : "text-olive-deep"}`}>{m.qty > 0 ? "+" : ""}{m.qty}</Cell>
                <Cell className="mono text-mute">{m.ref}</Cell>
                <Cell><Badge tone={m.status === "reversed" ? "terra" : "olive"}>{m.status}</Badge></Cell>
              </Row>
            ))}
          </DataTable>
        </Card>
      )}

      {/* Detail bahan */}
      <Drawer open={!!selected} onClose={() => setSelected(null)} title={selected?.name ?? ""} sub={selected ? `${selected.sku} · ${selected.category} · ${selected.location}` : undefined}>
        {selected && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <StatusBadge label={selected.status} />
              <span className="mono text-[16px] font-semibold">{selected.stock.toLocaleString("id-ID")} {selected.baseUnit}</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-[12.5px]">
              <div><p className="text-mute">Minimum stock</p><p className="mono mt-0.5 font-medium">{selected.minStock} {selected.baseUnit}</p></div>
              <div><p className="text-mute">Reorder point</p><p className="mono mt-0.5 font-medium">{selected.reorderPoint} {selected.baseUnit}</p></div>
              <div><p className="text-mute">Shelf life</p><p className="mt-0.5 font-medium">{selected.shelfLifeDays ? `${selected.shelfLifeDays} hari` : "—"}</p></div>
              <div><p className="text-mute">Perishable</p><p className="mt-0.5 font-medium">{selected.perishable ? "Ya" : "Tidak"}</p></div>
            </div>
            <div>
              <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-mute">Batch aktif</p>
              {selected.batches.length === 0 && <p className="text-[12.5px] text-mute">Tidak ada batch — stok habis.</p>}
              <ul className="space-y-2">
                {selected.batches.map((b) => (
                  <li key={b.batch} className="flex justify-between rounded-lg bg-cream px-3 py-2 text-[12.5px] ring-1 ring-black/5">
                    <span className="mono">{b.batch}</span>
                    <span className="mono">{b.qty} {selected.baseUnit}</span>
                    <span className="text-mute">exp {b.expiry}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-mute">Ledger terbaru</p>
              <ul className="space-y-2">
                {MOVEMENTS.filter((m) => m.sku === selected.sku).map((m) => (
                  <li key={m.no} className="flex justify-between text-[12.5px]">
                    <span className="capitalize">{m.type} <span className="text-mute">· {m.date}</span></span>
                    <span className={`mono ${m.qty < 0 ? "text-terra" : "text-olive-deep"}`}>{m.qty > 0 ? "+" : ""}{m.qty}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
