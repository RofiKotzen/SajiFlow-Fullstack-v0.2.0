import { Plus, Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Btn, Card, CardHeader, DataTable, Row, Cell, Field, TextInput, SelectInput, StatusBadge, Tabs, Badge, Modal } from "@/components/ui";
import { INGREDIENTS, UNITS, SUPPLIERS, type Ingredient, type Unit } from "@/lib/mock-data";

export function MastersView() {
  const [tab, setTab] = useState("bahan");
  const [ingredients, setIngredients] = useState<Ingredient[]>(INGREDIENTS);
  const [units, setUnits] = useState<Unit[]>(UNITS);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [modal, setModal] = useState<null | { kind: "ingredient" | "unit"; edit?: Ingredient | Unit }>(null);

  const ingRows = ingredients.filter((i) => `${i.sku} ${i.name}`.toLowerCase().includes(q.toLowerCase()) && (statusFilter === "all" || (statusFilter === "active") === i.active));
  const unitRows = units.filter((u) => `${u.code} ${u.name}`.toLowerCase().includes(q.toLowerCase()) && (statusFilter === "all" || (statusFilter === "active") === u.active));

  const saveIngredient = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const sku = String(fd.get("sku"));
    if (modal?.edit) {
      setIngredients((p) => p.map((i) => (i.sku === (modal.edit as Ingredient).sku ? { ...i, name: String(fd.get("name")), category: String(fd.get("category")), baseUnit: String(fd.get("baseUnit")), minStock: Number(fd.get("minStock")), reorderPoint: Number(fd.get("rop")) } : i)));
      toast.success("Bahan diperbarui");
    } else {
      setIngredients((p) => [...p, { sku, name: String(fd.get("name")), category: String(fd.get("category")), baseUnit: String(fd.get("baseUnit")), valuation: "weighted_average", perishable: fd.get("perishable") === "on", active: true, stock: 0, minStock: Number(fd.get("minStock")), reorderPoint: Number(fd.get("rop")), location: "Gudang Kering", status: "out", batches: [] }]);
      toast.success("Bahan ditambahkan");
    }
    setModal(null);
  };

  const saveUnit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const code = String(fd.get("code")).toUpperCase();
    if (modal?.edit) {
      setUnits((p) => p.map((u) => (u.code === (modal.edit as Unit).code ? { ...u, name: String(fd.get("name")), dimension: fd.get("dimension") as Unit["dimension"], decimalScale: Number(fd.get("scale")) } : u)));
      toast.success("Satuan diperbarui");
    } else {
      setUnits((p) => [...p, { code, name: String(fd.get("name")), dimension: fd.get("dimension") as Unit["dimension"], base: fd.get("base") === "on", decimalScale: Number(fd.get("scale")), active: true }]);
      toast.success("Satuan ditambahkan");
    }
    setModal(null);
  };

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Bahan & Satuan</h1>
          <p className="mt-1 text-[13px] text-mute">Master data bahan baku dan satuan ukur</p>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={tab} onChange={setTab} tabs={[{ id: "bahan", label: "Bahan", count: ingredients.length }, { id: "satuan", label: "Satuan", count: units.length }]} />
          <Btn onClick={() => setModal({ kind: tab === "bahan" ? "ingredient" : "unit" })}><Plus className="size-3.5" /> {tab === "bahan" ? "Tambah Bahan" : "Tambah Satuan"}</Btn>
        </div>
      </div>

      <Card className="overflow-hidden">
        <CardHeader
          title={tab === "bahan" ? "Daftar Bahan" : "Daftar Satuan"}
          action={
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-mute/70" />
                <TextInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari…" className="w-44 pl-8" />
              </div>
              <SelectInput value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-32">
                <option value="active">Aktif</option><option value="archived">Diarsipkan</option><option value="all">Semua</option>
              </SelectInput>
            </div>
          }
        />
        {tab === "bahan" ? (
          <DataTable head={["SKU", "Nama", "Kategori", "Base Unit", "Min Stok", "ROP", "Shelf Life", "Status", ""]} wide>
            {ingRows.map((i) => (
              <Row key={i.sku}>
                <Cell className="mono text-ink/90">{i.sku}</Cell>
                <Cell className="font-medium">{i.name}{i.perishable && <Badge tone="amber" className="ml-2">perishable</Badge>}</Cell>
                <Cell className="text-mute">{i.category}</Cell>
                <Cell className="mono">{i.baseUnit}</Cell>
                <Cell className="mono text-right">{i.minStock}</Cell>
                <Cell className="mono text-right">{i.reorderPoint}</Cell>
                <Cell className="text-mute">{i.shelfLifeDays ? `${i.shelfLifeDays} hari` : "—"}</Cell>
                <Cell><StatusBadge label={i.active ? "active" : "archived"} /></Cell>
                <Cell>
                  <div className="flex gap-1">
                    <Btn variant="ghost" className="px-2 py-1 text-[12px]" onClick={() => setModal({ kind: "ingredient", edit: i })}>Ubah</Btn>
                    <Btn variant="ghost" className="px-2 py-1 text-[12px]" onClick={() => { setIngredients((p) => p.map((x) => (x.sku === i.sku ? { ...x, active: !x.active } : x))); toast.success(i.active ? "Bahan diarsipkan" : "Bahan diaktifkan"); }}>
                      {i.active ? "Arsipkan" : "Aktifkan"}
                    </Btn>
                  </div>
                </Cell>
              </Row>
            ))}
          </DataTable>
        ) : (
          <DataTable head={["Code", "Nama", "Dimension", "Base", "Decimal Scale", "Status", ""]}>
            {unitRows.map((u) => (
              <Row key={u.code}>
                <Cell className="mono font-medium">{u.code}</Cell>
                <Cell>{u.name}</Cell>
                <Cell className="capitalize text-mute">{u.dimension}</Cell>
                <Cell>{u.base ? <Badge tone="olive">base</Badge> : <span className="text-mute">—</span>}</Cell>
                <Cell className="mono text-right">{u.decimalScale}</Cell>
                <Cell><StatusBadge label={u.active ? "active" : "archived"} /></Cell>
                <Cell>
                  <div className="flex gap-1">
                    <Btn variant="ghost" className="px-2 py-1 text-[12px]" onClick={() => setModal({ kind: "unit", edit: u })}>Ubah</Btn>
                    <Btn variant="ghost" className="px-2 py-1 text-[12px]" onClick={() => { setUnits((p) => p.map((x) => (x.code === u.code ? { ...x, active: !x.active } : x))); toast.success(u.active ? "Satuan diarsipkan" : "Satuan diaktifkan"); }}>
                      {u.active ? "Arsipkan" : "Aktifkan"}
                    </Btn>
                  </div>
                </Cell>
              </Row>
            ))}
          </DataTable>
        )}
      </Card>

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.edit ? "Ubah Data" : tab === "bahan" ? "Tambah Bahan" : "Tambah Satuan"}>
        {modal?.kind === "ingredient" && (
          <form onSubmit={saveIngredient} className="space-y-3">
            <Field label="SKU" required><TextInput name="sku" required defaultValue={(modal.edit as Ingredient)?.sku} disabled={!!modal.edit} /></Field>
            <Field label="Nama" required><TextInput name="name" required defaultValue={(modal.edit as Ingredient)?.name} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Kategori">
                <SelectInput name="category" defaultValue={(modal.edit as Ingredient)?.category ?? "Protein"}>
                  {["Protein", "Karbo", "Dairy", "Minyak", "Minuman", "Bumbu"].map((c) => <option key={c}>{c}</option>)}
                </SelectInput>
              </Field>
              <Field label="Base unit" required>
                <SelectInput name="baseUnit" defaultValue={(modal.edit as Ingredient)?.baseUnit ?? "KG"}>
                  {units.filter((u) => u.active).map((u) => <option key={u.code}>{u.code}</option>)}
                </SelectInput>
              </Field>
              <Field label="Minimum stock"><TextInput name="minStock" type="number" min={0} defaultValue={(modal.edit as Ingredient)?.minStock ?? 0} /></Field>
              <Field label="Reorder point"><TextInput name="rop" type="number" min={0} defaultValue={(modal.edit as Ingredient)?.reorderPoint ?? 0} /></Field>
            </div>
            <Field label="Preferred supplier">
              <SelectInput>{SUPPLIERS.filter((s) => s.active).map((s) => <option key={s.code}>{s.name}</option>)}</SelectInput>
            </Field>
            <label className="flex items-center gap-2 text-[13px]"><input type="checkbox" name="perishable" defaultChecked={(modal.edit as Ingredient)?.perishable} className="accent-[oklch(0.52_0.065_128)]" /> Perishable (mudah rusak)</label>
            <div className="flex justify-end gap-2 pt-2"><Btn type="button" variant="ghost" onClick={() => setModal(null)}>Batal</Btn><Btn type="submit">Simpan</Btn></div>
          </form>
        )}
        {modal?.kind === "unit" && (
          <form onSubmit={saveUnit} className="space-y-3">
            <Field label="Code" required hint="Otomatis uppercase"><TextInput name="code" required defaultValue={(modal.edit as Unit)?.code} disabled={!!modal.edit} onChange={(e) => (e.target.value = e.target.value.toUpperCase())} /></Field>
            <Field label="Nama" required><TextInput name="name" required defaultValue={(modal.edit as Unit)?.name} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Dimension" required>
                <SelectInput name="dimension" defaultValue={(modal.edit as Unit)?.dimension ?? "mass"}>
                  {["mass", "volume", "count", "length"].map((d) => <option key={d}>{d}</option>)}
                </SelectInput>
              </Field>
              <Field label="Decimal scale"><TextInput name="scale" type="number" min={0} defaultValue={(modal.edit as Unit)?.decimalScale ?? 0} /></Field>
            </div>
            <label className="flex items-center gap-2 text-[13px]"><input type="checkbox" name="base" defaultChecked={(modal.edit as Unit)?.base} className="accent-[oklch(0.52_0.065_128)]" /> Unit dasar untuk dimension ini</label>
            <div className="flex justify-end gap-2 pt-2"><Btn type="button" variant="ghost" onClick={() => setModal(null)}>Batal</Btn><Btn type="submit">Simpan</Btn></div>
          </form>
        )}
      </Modal>
    </div>
  );
}
