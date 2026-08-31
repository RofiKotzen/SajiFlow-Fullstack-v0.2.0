import { Plus, Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Btn, Card, CardHeader, DataTable, Row, Cell, Drawer, Field, TextInput, SelectInput, TextArea, StatusBadge, Badge, Modal } from "@/components/ui";
import { RECIPES, MENUS, INGREDIENTS, UNITS, OUTLETS, ingredientName, idr, type Recipe, type RecipeItem } from "@/lib/mock-data";

// harga base per unit dasar (mock) untuk kalkulasi food cost presentasional
const UNIT_COST: Record<string, number> = { "BHN-001": 42, "BHN-002": 12.5, "BHN-003": 137, "BHN-004": 0.0145, "BHN-005": 180, "BHN-006": 135, "BHN-007": 15, "BHN-008": 28, "BHN-009": 11, "BHN-010": 98 };

const costOf = (r: Recipe) =>
  r.items.reduce((s, it) => {
    const per = UNIT_COST[it.sku] ?? 0;
    return s + it.qty * per * (1 + it.waste / 100);
  }, 0);

export function RecipesView() {
  const [recipes, setRecipes] = useState<Recipe[]>(RECIPES);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [outlet, setOutlet] = useState("all");
  const [selected, setSelected] = useState<Recipe | null>(null);
  const [creating, setCreating] = useState(false);
  const [fOutlet, setFOutlet] = useState("KMG");
  const [items, setItems] = useState<RecipeItem[]>([{ sku: "BHN-001", unit: "G", qty: 100, waste: 0 }]);

  const rows = recipes.filter((r) => `${r.name} ${r.menuVariant}`.toLowerCase().includes(q.toLowerCase()) && (statusFilter === "all" || r.status === statusFilter) && (outlet === "all" || r.outlet === outlet));

  const allVariants = MENUS.flatMap((m) => m.variants.map((v) => ({ ...v, menuName: m.name, menuActive: m.active })));
  const candidates = allVariants.map((v) => {
    const taken = recipes.some((r) => r.menuVariant === v.sku && r.status !== "archived");
    const availableHere = v.availability[fOutlet];
    return {
      sku: v.sku, label: `${v.menuName} — ${v.name}`,
      eligible: v.menuActive && availableHere && !taken,
      reason: !v.menuActive ? "menu diarsipkan" : !availableHere ? "tidak tersedia di outlet" : taken ? "sudah memiliki resep" : "",
    };
  });

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Resep & Food Cost</h1>
          <p className="mt-1 text-[13px] text-mute">Komposisi bahan, food cost, dan margin per menu</p>
        </div>
        <Btn onClick={() => setCreating(true)}><Plus className="size-3.5" /> Buat Resep</Btn>
      </div>

      <Card className="overflow-hidden">
        <CardHeader
          title="Daftar Resep"
          sub={`${rows.length} resep`}
          action={
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-mute/70" />
                <TextInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nama resep / menu…" className="w-44 pl-8" />
              </div>
              <SelectInput value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-32">
                <option value="all">Semua status</option><option value="draft">Draft</option><option value="approved">Approved</option><option value="archived">Archived</option>
              </SelectInput>
              <SelectInput value={outlet} onChange={(e) => setOutlet(e.target.value)} className="w-28">
                <option value="all">Semua outlet</option>
                {OUTLETS.map((o) => <option key={o.code} value={o.code}>{o.code}</option>)}
              </SelectInput>
            </div>
          }
        />
        <DataTable head={["Kode", "Nama Resep", "Outlet", "Harga Jual", "Food Cost", "Cost %", "Margin", "Status"]} wide>
          {rows.map((r) => {
            const cost = costOf(r) / r.yieldQty;
            const pct = r.sellingPrice > 0 ? (cost / r.sellingPrice) * 100 : 0;
            return (
              <Row key={r.code} onClick={() => setSelected(r)}>
                <Cell className="mono text-ink/90">{r.code}</Cell>
                <Cell className="font-medium">{r.name}</Cell>
                <Cell className="text-mute">{r.outlet}</Cell>
                <Cell className="mono text-right">{idr(r.sellingPrice)}</Cell>
                <Cell className="mono text-right">{idr(cost)}</Cell>
                <Cell className="text-right"><Badge tone={pct > 40 ? "terra" : pct > 32 ? "amber" : "olive"}>{pct.toFixed(1)}%</Badge></Cell>
                <Cell className="mono text-right">{idr(r.sellingPrice - cost)}</Cell>
                <Cell><StatusBadge label={r.status} /></Cell>
              </Row>
            );
          })}
        </DataTable>
      </Card>

      <Drawer open={!!selected} onClose={() => setSelected(null)} title={selected?.name ?? ""} sub={selected ? `${selected.code} · outlet ${selected.outlet} · ${selected.menuVariant}` : undefined}>
        {selected && (() => {
          const cost = costOf(selected) / selected.yieldQty;
          const pct = (cost / selected.sellingPrice) * 100;
          return (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <StatusBadge label={selected.status} />
                <Badge tone={pct > 40 ? "terra" : pct > 32 ? "amber" : "olive"}>Food cost {pct.toFixed(1)}%</Badge>
              </div>
              <div className="grid grid-cols-2 gap-3 text-[12.5px]">
                <div><p className="text-mute">Harga jual</p><p className="mono mt-0.5 font-medium">{idr(selected.sellingPrice)}</p></div>
                <div><p className="text-mute">Cost per serving</p><p className="mono mt-0.5 font-medium">{idr(cost)}</p></div>
                <div><p className="text-mute">Yield</p><p className="mono mt-0.5 font-medium">{selected.yieldQty} porsi</p></div>
                <div><p className="text-mute">Margin</p><p className="mono mt-0.5 font-medium text-olive-deep">{idr(selected.sellingPrice - cost)}</p></div>
              </div>
              <div>
                <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-mute">Bahan</p>
                <ul className="space-y-2">
                  {selected.items.map((it) => (
                    <li key={it.sku} className="flex items-center justify-between rounded-lg bg-cream px-3 py-2 text-[12.5px] ring-1 ring-black/5">
                      <span>{ingredientName(it.sku)}</span>
                      <span className="mono text-mute">{it.qty} {it.unit}{it.waste > 0 && ` · waste ${it.waste}%`}</span>
                    </li>
                  ))}
                </ul>
              </div>
              {selected.note && <p className="rounded-lg bg-olive-soft px-3 py-2 text-[12.5px] text-olive-deep">{selected.note}</p>}
              <div className="flex flex-wrap gap-2">
                {selected.status === "draft" && (
                  <Btn onClick={() => { setRecipes((p) => p.map((r) => (r.code === selected.code ? { ...r, status: "approved" } : r))); setSelected({ ...selected, status: "approved" }); toast.success("Resep disetujui"); }}>Approve Resep</Btn>
                )}
                {selected.status !== "archived" ? (
                  <Btn variant="outline" onClick={() => { setRecipes((p) => p.map((r) => (r.code === selected.code ? { ...r, status: "archived" } : r))); setSelected({ ...selected, status: "archived" }); toast.success("Resep diarsipkan"); }}>Arsipkan</Btn>
                ) : (
                  <Btn variant="outline" onClick={() => { setRecipes((p) => p.map((r) => (r.code === selected.code ? { ...r, status: "draft" } : r))); setSelected({ ...selected, status: "draft" }); toast.success("Resep diaktifkan sebagai draft"); }}>Aktifkan</Btn>
                )}
              </div>
            </div>
          );
        })()}
      </Drawer>

      <Modal open={creating} onClose={() => setCreating(false)} title="Buat Resep" wide>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            if (items.some((i) => i.qty <= 0)) { toast.error("Quantity bahan harus lebih dari nol"); return; }
            const code = String(fd.get("code"));
            setRecipes((p) => [...p, { code, name: String(fd.get("name")), outlet: fOutlet, menuVariant: String(fd.get("variant")), status: "draft", yieldQty: Number(fd.get("yield")), sellingPrice: Number(fd.get("price")), items, note: String(fd.get("note") || "") || undefined }]);
            setCreating(false);
            toast.success(`Draft ${code} disimpan`);
          }}
        >
          <div className="grid grid-cols-2 gap-3">
            <Field label="Kode resep" required><TextInput name="code" required defaultValue={`RCP-00${recipes.length + 1}`} /></Field>
            <Field label="Nama resep" required><TextInput name="name" required /></Field>
            <Field label="Outlet" required>
              <SelectInput value={fOutlet} onChange={(e) => setFOutlet(e.target.value)}>
                {OUTLETS.filter((o) => o.active).map((o) => <option key={o.code} value={o.code}>{o.name}</option>)}
              </SelectInput>
            </Field>
            <Field label="Menu product / variant" required hint="Kandidat outlet-aware">
              <SelectInput name="variant" required>
                {candidates.map((c) => (
                  <option key={c.sku} value={c.sku} disabled={!c.eligible}>
                    {c.label}{c.eligible ? "" : ` — tidak eligible (${c.reason})`}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Yield quantity" required><TextInput name="yield" type="number" min={0.01} step={0.01} defaultValue={1} required /></Field>
            <Field label="Selling price" required><TextInput name="price" type="number" min={0} step={0.01} required /></Field>
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[12px] font-medium text-ink/80">Bahan <span className="text-terra">*</span></p>
              <Btn type="button" variant="outline" className="px-2 py-1 text-[12px]" onClick={() => setItems((p) => [...p, { sku: "BHN-002", unit: "G", qty: 100, waste: 0 }])}><Plus className="size-3" /> Tambah bahan</Btn>
            </div>
            <div className="space-y-2">
              {items.map((it, idx) => {
                const baseDim = UNITS.find((u) => u.code === INGREDIENTS.find((i) => i.sku === it.sku)?.baseUnit)?.dimension;
                return (
                  <div key={idx} className="flex items-center gap-2">
                    <SelectInput className="flex-1" value={it.sku} onChange={(e) => setItems((p) => p.map((x, i) => (i === idx ? { ...x, sku: e.target.value } : x)))}>
                      {INGREDIENTS.filter((i) => i.active).map((i) => <option key={i.sku} value={i.sku}>{i.name}</option>)}
                    </SelectInput>
                    <SelectInput className="w-24" value={it.unit} onChange={(e) => setItems((p) => p.map((x, i) => (i === idx ? { ...x, unit: e.target.value } : x)))}>
                      {UNITS.filter((u) => u.active && u.dimension === baseDim).map((u) => <option key={u.code}>{u.code}</option>)}
                    </SelectInput>
                    <TextInput type="number" min={0.01} step={0.01} className="w-24" placeholder="Qty" value={it.qty || ""} onChange={(e) => setItems((p) => p.map((x, i) => (i === idx ? { ...x, qty: Number(e.target.value) } : x)))} />
                    <TextInput type="number" min={0} className="w-20" placeholder="Waste %" value={it.waste} onChange={(e) => setItems((p) => p.map((x, i) => (i === idx ? { ...x, waste: Number(e.target.value) } : x)))} />
                    <Btn type="button" variant="ghost" className="px-2" disabled={items.length === 1} onClick={() => setItems((p) => p.filter((_, i) => i !== idx))}>✕</Btn>
                  </div>
                );
              })}
            </div>
          </div>
          <Field label="Catatan / instruksi"><TextArea name="note" /></Field>
          <div className="flex justify-end gap-2 border-t border-black/5 pt-3">
            <Btn type="button" variant="ghost" onClick={() => setCreating(false)}>Batal</Btn>
            <Btn type="submit">Simpan Draft</Btn>
          </div>
        </form>
      </Modal>
    </div>
  );
}
