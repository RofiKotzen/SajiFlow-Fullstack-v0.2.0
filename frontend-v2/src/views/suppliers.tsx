import { Plus, Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Btn, Card, CardHeader, DataTable, Row, Cell, Field, TextInput, SelectInput, TextArea, StatusBadge, Badge, Modal, Progress } from "@/components/ui";
import { SUPPLIERS, SUPPLIER_CATALOG, INGREDIENTS, UNITS, ingredientName, idr, type Supplier, type CatalogItem } from "@/lib/mock-data";

export function SuppliersView() {
  const [suppliers, setSuppliers] = useState<Supplier[]>(SUPPLIERS);
  const [catalog, setCatalog] = useState<CatalogItem[]>(SUPPLIER_CATALOG);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [modal, setModal] = useState<null | { edit?: Supplier }>(null);
  const [catalogOf, setCatalogOf] = useState<Supplier | null>(null);

  const rows = suppliers.filter((s) => `${s.code} ${s.name}`.toLowerCase().includes(q.toLowerCase()) && (statusFilter === "all" || (statusFilter === "active") === s.active));

  const save = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "");
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { toast.error("Format email tidak valid"); return; }
    const data = {
      name: String(fd.get("name")), contact: String(fd.get("contact") || "") || undefined, phone: String(fd.get("phone") || "") || undefined,
      email: email || undefined, termsDays: Number(fd.get("terms")), leadTimeDays: Number(fd.get("lead")), address: String(fd.get("address") || "") || undefined,
    };
    if (modal?.edit) {
      setSuppliers((p) => p.map((s) => (s.code === modal.edit!.code ? { ...s, ...data } : s)));
      toast.success("Supplier diperbarui");
    } else {
      const code = String(fd.get("code")).toUpperCase();
      setSuppliers((p) => [...p, { code, ...data, active: true, perf: 100 }]);
      toast.success("Supplier ditambahkan");
    }
    setModal(null);
  };

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Supplier</h1>
          <p className="mt-1 text-[13px] text-mute">Pemasok dan katalog bahan per supplier</p>
        </div>
        <Btn onClick={() => setModal({})}><Plus className="size-3.5" /> Tambah Supplier</Btn>
      </div>

      <Card className="overflow-hidden">
        <CardHeader
          title="Daftar Supplier"
          sub={`${rows.length} supplier`}
          action={
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-mute/70" />
                <TextInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari supplier…" className="w-44 pl-8" />
              </div>
              <SelectInput value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-32">
                <option value="active">Aktif</option><option value="archived">Nonaktif</option><option value="all">Semua</option>
              </SelectInput>
            </div>
          }
        />
        <DataTable head={["Kode", "Nama", "Kontak", "Termin", "Lead Time", "Performa", "Status", ""]} wide>
          {rows.map((s) => (
            <Row key={s.code}>
              <Cell className="mono text-ink/90">{s.code}</Cell>
              <Cell className="font-medium">{s.name}</Cell>
              <Cell className="text-mute">{s.contact ?? "—"}{s.phone && <span className="block text-[11px]">{s.phone}</span>}</Cell>
              <Cell className="mono text-right">{s.termsDays} hari</Cell>
              <Cell className="mono text-right">{s.leadTimeDays} hari</Cell>
              <Cell className="w-32"><div className="flex items-center gap-2"><div className="flex-1"><Progress value={s.perf} warn={s.perf < 85} /></div><span className="mono text-[11px] text-mute">{s.perf}%</span></div></Cell>
              <Cell><StatusBadge label={s.active ? "active" : "archived"} /></Cell>
              <Cell>
                <div className="flex gap-1">
                  <Btn variant="ghost" className="px-2 py-1 text-[12px]" onClick={() => setCatalogOf(s)}>Katalog</Btn>
                  <Btn variant="ghost" className="px-2 py-1 text-[12px]" onClick={() => setModal({ edit: s })}>Ubah</Btn>
                  <Btn variant="ghost" className="px-2 py-1 text-[12px]" onClick={() => { setSuppliers((p) => p.map((x) => (x.code === s.code ? { ...x, active: !x.active } : x))); toast.success(s.active ? "Supplier diarsipkan" : "Supplier diaktifkan"); }}>
                    {s.active ? "Arsipkan" : "Aktifkan"}
                  </Btn>
                </div>
              </Cell>
            </Row>
          ))}
        </DataTable>
      </Card>

      {/* Katalog supplier */}
      <Modal open={!!catalogOf} onClose={() => setCatalogOf(null)} title={`Katalog — ${catalogOf?.name ?? ""}`} wide>
        {catalogOf && (
          <div className="space-y-3">
            <DataTable head={["Bahan", "Purchase Unit", "Harga", "Konversi", "MOQ", "Preferred", "Status", ""]} wide>
              {catalog.filter((c) => c.supplierCode === catalogOf.code).map((c) => (
                <Row key={c.ingredientSku}>
                  <Cell className="font-medium">{ingredientName(c.ingredientSku)}</Cell>
                  <Cell className="mono">{c.purchaseUnit}</Cell>
                  <Cell className="mono text-right">{idr(c.price)}</Cell>
                  <Cell className="mono text-right">{c.conversion}</Cell>
                  <Cell className="mono text-right">{c.moq}</Cell>
                  <Cell>{c.preferred ? <Badge tone="olive">preferred</Badge> : <span className="text-mute">—</span>}</Cell>
                  <Cell><StatusBadge label={c.active ? "active" : "archived"} /></Cell>
                  <Cell>
                    <Btn variant="ghost" className="px-2 py-1 text-[12px]" onClick={() => { setCatalog((p) => p.map((x) => (x.supplierCode === c.supplierCode && x.ingredientSku === c.ingredientSku ? { ...x, active: !x.active } : x))); toast.success(c.active ? "Item diarsipkan" : "Item diaktifkan"); }}>
                      {c.active ? "Arsipkan" : "Aktifkan"}
                    </Btn>
                  </Cell>
                </Row>
              ))}
            </DataTable>
            {catalogOf.active ? (
              <form
                className="flex flex-wrap items-center gap-2 border-t border-black/5 pt-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  const sku = String(fd.get("ing"));
                  const ing = INGREDIENTS.find((i) => i.sku === sku)!;
                  const unit = UNITS.find((u) => u.code === String(fd.get("unit")))!;
                  const baseDim = UNITS.find((u) => u.code === ing.baseUnit)?.dimension;
                  if (unit.dimension !== baseDim) { toast.error("Purchase unit harus memiliki dimension yang sama dengan bahan"); return; }
                  setCatalog((p) => [...p, { supplierCode: catalogOf.code, ingredientSku: sku, purchaseUnit: unit.code, price: Number(fd.get("price")), conversion: Number(fd.get("conv")), moq: Number(fd.get("moq")), preferred: fd.get("pref") === "on", active: true }]);
                  (e.target as HTMLFormElement).reset();
                  toast.success("Item katalog ditambahkan");
                }}
              >
                <SelectInput name="ing" className="w-44" required>
                  {INGREDIENTS.filter((i) => i.active && !catalog.some((c) => c.supplierCode === catalogOf.code && c.ingredientSku === i.sku)).map((i) => <option key={i.sku} value={i.sku}>{i.name}</option>)}
                </SelectInput>
                <SelectInput name="unit" className="w-24">{UNITS.filter((u) => u.active).map((u) => <option key={u.code}>{u.code}</option>)}</SelectInput>
                <TextInput name="price" type="number" min={0} step={0.01} placeholder="Harga" className="w-28" required />
                <TextInput name="conv" type="number" min={0.001} step={0.001} placeholder="Konversi" className="w-24" required />
                <TextInput name="moq" type="number" min={0} placeholder="MOQ" className="w-20" required />
                <label className="flex items-center gap-1.5 text-[12px]"><input type="checkbox" name="pref" className="accent-[oklch(0.52_0.065_128)]" /> Preferred</label>
                <Btn type="submit" className="px-2.5 py-1.5 text-[12px]"><Plus className="size-3" /> Tambah</Btn>
              </form>
            ) : (
              <p className="rounded-lg bg-terra/10 px-3 py-2 text-[12.5px] text-terra">Katalog tidak dapat ditambah pada supplier nonaktif.</p>
            )}
          </div>
        )}
      </Modal>

      {/* Form supplier */}
      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.edit ? "Ubah Supplier" : "Tambah Supplier"} wide>
        <form onSubmit={save} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Kode" required hint="Maks 40 karakter, uppercase"><TextInput name="code" required maxLength={40} defaultValue={modal?.edit?.code} disabled={!!modal?.edit} onChange={(e) => (e.target.value = e.target.value.toUpperCase())} /></Field>
            <Field label="Nama" required><TextInput name="name" required defaultValue={modal?.edit?.name} /></Field>
            <Field label="NPWP / Tax ID"><TextInput name="npwp" defaultValue={modal?.edit?.npwp} /></Field>
            <Field label="Nama kontak"><TextInput name="contact" defaultValue={modal?.edit?.contact} /></Field>
            <Field label="Telepon"><TextInput name="phone" type="tel" defaultValue={modal?.edit?.phone} /></Field>
            <Field label="Email"><TextInput name="email" type="email" defaultValue={modal?.edit?.email} /></Field>
            <Field label="Termin pembayaran (hari)"><TextInput name="terms" type="number" min={0} defaultValue={modal?.edit?.termsDays ?? 14} /></Field>
            <Field label="Lead time (hari)"><TextInput name="lead" type="number" min={0} defaultValue={modal?.edit?.leadTimeDays ?? 2} /></Field>
          </div>
          <Field label="Alamat"><TextArea name="address" defaultValue={modal?.edit?.address} /></Field>
          <div className="flex justify-end gap-2 pt-2"><Btn type="button" variant="ghost" onClick={() => setModal(null)}>Batal</Btn><Btn type="submit">Simpan</Btn></div>
        </form>
      </Modal>
    </div>
  );
}
