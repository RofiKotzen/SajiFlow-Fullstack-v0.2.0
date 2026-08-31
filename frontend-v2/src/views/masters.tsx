import { Archive, Boxes, Plus, RefreshCw, Search, Scale } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Badge, Btn, Card, CardHeader, Cell, DataTable, Drawer, Field, Modal, Row, SelectInput, StatusBadge, Tabs, TextInput } from "@/components/ui";
import { useAuth } from "@/contexts/auth-context";
import { ApiError } from "@/lib/api/types";

type Dimension = "mass" | "volume" | "count" | "length";
type Valuation = "weighted_average" | "fifo";
type Unit = { id: string; code: string; name: string; dimension: Dimension; isBase: boolean; decimalScale: number; isActive: boolean };
type Ingredient = { id: string; sku: string; name: string; categoryId: string | null; categoryName: string | null; baseUnitId: string; baseUnitCode: string; baseUnitName: string; valuationMethod: Valuation; isPerishable: boolean; shelfLifeDays: number | null; barcode: string | null; isActive: boolean; outletCount: number; supplierCount: number };
type Setting = { outletId: string; outletName?: string; minimumStock: number; reorderPoint: number; parStock: number; defaultStorageLocationId: string | null; defaultStorageLocationName?: string | null; isAvailable: boolean };
type Detail = Ingredient & { outletSettings: Setting[] };
type Lookup = { categories: { id: string; name: string }[]; units: { id: string; code: string; name: string; dimension: Dimension }[]; outlets: { id: string; code: string; name: string }[]; storageLocations: { id: string; outletId: string; code: string; name: string }[] };
type IngredientForm = { sku: string; name: string; categoryId: string; baseUnitId: string; valuationMethod: Valuation; isPerishable: boolean; shelfLifeDays: string; barcode: string };
type UnitForm = { code: string; name: string; dimension: Dimension; isBase: boolean; decimalScale: number };

const EMPTY_LOOKUP: Lookup = { categories: [], units: [], outlets: [], storageLocations: [] };
const EMPTY_INGREDIENT: IngredientForm = { sku: "", name: "", categoryId: "", baseUnitId: "", valuationMethod: "weighted_average", isPerishable: false, shelfLifeDays: "", barcode: "" };
const EMPTY_UNIT: UnitForm = { code: "", name: "", dimension: "mass", isBase: false, decimalScale: 3 };
const DIMENSIONS: Record<Dimension, string> = { mass: "Massa", volume: "Volume", count: "Jumlah", length: "Panjang" };

export function MastersView() {
  const { api, session } = useAuth();
  const can = useCallback((permission: string) => Boolean(session?.user.permissions.includes(permission)), [session]);
  const readIngredients = can("ingredients.read"), readUnits = can("units.read");
  const [tab, setTab] = useState(readIngredients ? "bahan" : "satuan");
  const [ingredients, setIngredients] = useState<Ingredient[]>([]), [units, setUnits] = useState<Unit[]>([]), [lookup, setLookup] = useState<Lookup>(EMPTY_LOOKUP);
  const [query, setQuery] = useState(""), [status, setStatus] = useState("active"), [category, setCategory] = useState("");
  const [loading, setLoading] = useState(true), [refreshing, setRefreshing] = useState(false), [error, setError] = useState(""), [reload, setReload] = useState(0);
  const [ingredientForm, setIngredientForm] = useState<IngredientForm | null>(null), [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null);
  const [unitForm, setUnitForm] = useState<UnitForm | null>(null), [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [settings, setSettings] = useState<Setting[]>([]), [submitting, setSubmitting] = useState(false), [formError, setFormError] = useState(""), [conflict, setConflict] = useState(false);
  const [confirm, setConfirm] = useState<{ kind: "ingredient" | "unit"; item: Ingredient | Unit } | null>(null);
  const [target, setTarget] = useState<Ingredient | null>(null), [detail, setDetail] = useState<Detail | null>(null), [detailLoading, setDetailLoading] = useState(false), [detailError, setDetailError] = useState("");

  const load = useCallback(async () => {
    if (!readIngredients && !readUnits) { setLoading(false); return; }
    setRefreshing(true); setError("");
    try {
      const [ingredientRows, unitRows, lookups] = await Promise.all([
        readIngredients ? api<Ingredient[]>("/ingredients") : Promise.resolve([]),
        readUnits ? api<Unit[]>("/units") : Promise.resolve([]),
        readIngredients ? api<Lookup>("/ingredients/lookups") : Promise.resolve(EMPTY_LOOKUP),
      ]);
      setIngredients(ingredientRows.map(normalizeIngredient));
      setUnits(unitRows.map((row) => ({ ...row, decimalScale: Number(row.decimalScale) })));
      setLookup(lookups);
    } catch (cause) { setError(errorMessage(cause, "Master data tidak dapat dimuat.")); }
    finally { setLoading(false); setRefreshing(false); }
  }, [api, readIngredients, readUnits]);
  useEffect(() => { void reload; void load(); }, [load, reload]);
  useEffect(() => {
    if (!target) { setDetail(null); setDetailError(""); return; }
    let active = true; setDetailLoading(true); setDetailError("");
    api<Detail>(`/ingredients/${target.id}`).then((value) => { if (active) setDetail({ ...normalizeIngredient(value), outletSettings: value.outletSettings.map(normalizeSetting) }); })
      .catch((cause) => { if (active) setDetailError(errorMessage(cause, "Detail bahan tidak dapat dimuat.")); })
      .finally(() => { if (active) setDetailLoading(false); });
    return () => { active = false; };
  }, [api, target]);

  const ingredientRows = useMemo(() => ingredients.filter((row) => match(row.isActive, status) && (!category || row.categoryId === category) && includes(`${row.sku} ${row.name} ${row.categoryName ?? ""}`, query)), [ingredients, query, status, category]);
  const unitRows = useMemo(() => units.filter((row) => match(row.isActive, status) && includes(`${row.code} ${row.name} ${row.dimension}`, query)), [units, query, status]);
  const hasFilters = Boolean(query || category || status !== "all");

  const completeSettings = useCallback((existing: Setting[] = []) => lookup.outlets.map((outlet) => existing.find((row) => row.outletId === outlet.id) ?? { outletId: outlet.id, minimumStock: 0, reorderPoint: 0, parStock: 0, defaultStorageLocationId: null, isAvailable: true }), [lookup]);
  async function openIngredient(item?: Ingredient) {
    setFormError(""); setConflict(false); setEditingIngredient(item ?? null);
    setIngredientForm(item ? { sku: item.sku, name: item.name, categoryId: item.categoryId ?? "", baseUnitId: item.baseUnitId, valuationMethod: item.valuationMethod, isPerishable: item.isPerishable, shelfLifeDays: item.shelfLifeDays?.toString() ?? "", barcode: item.barcode ?? "" } : { ...EMPTY_INGREDIENT });
    setSettings(completeSettings());
    if (item) try { const value = await api<Detail>(`/ingredients/${item.id}`); setSettings(completeSettings(value.outletSettings.map(normalizeSetting))); }
    catch (cause) { setFormError(errorMessage(cause, "Pengaturan outlet tidak dapat dimuat.")); }
  }
  function openUnit(item?: Unit) { setFormError(""); setConflict(false); setEditingUnit(item ?? null); setUnitForm(item ? { code: item.code, name: item.name, dimension: item.dimension, isBase: item.isBase, decimalScale: item.decimalScale } : { ...EMPTY_UNIT }); }
  function closeForms(force = false) { if (submitting && !force) return; setIngredientForm(null); setUnitForm(null); setEditingIngredient(null); setEditingUnit(null); setFormError(""); }
  async function saveIngredient(event: FormEvent) {
    event.preventDefault(); if (!ingredientForm) return; setSubmitting(true); setFormError(""); setConflict(false);
    const body = { ...ingredientForm, sku: ingredientForm.sku.trim().toUpperCase(), categoryId: ingredientForm.categoryId || null, barcode: ingredientForm.barcode.trim() || null, shelfLifeDays: ingredientForm.isPerishable ? Number(ingredientForm.shelfLifeDays) : null, outletSettings: settings.map((row) => ({ outletId: row.outletId, minimumStock: Number(row.minimumStock), reorderPoint: Number(row.reorderPoint), parStock: Number(row.parStock), defaultStorageLocationId: row.defaultStorageLocationId || null, isAvailable: row.isAvailable })) };
    try { await api(editingIngredient ? `/ingredients/${editingIngredient.id}` : "/ingredients", { method: editingIngredient ? "PATCH" : "POST", body: JSON.stringify(body) }); toast.success(editingIngredient ? "Bahan berhasil diperbarui" : "Bahan berhasil ditambahkan"); closeForms(true); await load(); }
    catch (cause) { setConflict(cause instanceof ApiError && cause.status === 409); setFormError(errorMessage(cause, "Bahan gagal disimpan.")); }
    finally { setSubmitting(false); }
  }
  async function saveUnit(event: FormEvent) {
    event.preventDefault(); if (!unitForm) return; setSubmitting(true); setFormError(""); setConflict(false);
    try { await api(editingUnit ? `/units/${editingUnit.id}` : "/units", { method: editingUnit ? "PATCH" : "POST", body: JSON.stringify({ ...unitForm, code: unitForm.code.trim().toUpperCase(), decimalScale: Number(unitForm.decimalScale) }) }); toast.success(editingUnit ? "Satuan berhasil diperbarui" : "Satuan berhasil ditambahkan"); closeForms(true); await load(); }
    catch (cause) { setConflict(cause instanceof ApiError && cause.status === 409); setFormError(errorMessage(cause, "Satuan gagal disimpan.")); }
    finally { setSubmitting(false); }
  }
  async function toggle() {
    if (!confirm) return; setSubmitting(true); setFormError("");
    try { await api(`/${confirm.kind === "ingredient" ? "ingredients" : "units"}/${confirm.item.id}`, { method: "PATCH", body: JSON.stringify({ isActive: !confirm.item.isActive }) }); toast.success(`${confirm.kind === "ingredient" ? "Bahan" : "Satuan"} berhasil ${confirm.item.isActive ? "diarsipkan" : "diaktifkan"}`); setConfirm(null); await load(); }
    catch (cause) { setFormError(errorMessage(cause, "Status gagal diperbarui.")); }
    finally { setSubmitting(false); }
  }

  if (!readIngredients && !readUnits) return <State kind="forbidden" title="Akses Master Data dibatasi" text="Permission ingredients.read atau units.read diperlukan." />;
  if (loading) return <State kind="loading" title="Memuat Bahan & Satuan" text="Data tenant sedang diambil dari backend." />;
  if (error && !ingredients.length && !units.length) return <State kind="error" title="Master data tidak dapat dimuat" text={error} action="Coba lagi" onAction={() => setReload((value) => value + 1)} />;
  return <div className="min-w-0">
    <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-2xl font-semibold tracking-tight">Bahan & Satuan</h1><p className="mt-1 text-[13px] text-mute">Master bahan baku, unit ukur, dan pengaturan outlet</p></div>
      <div className="flex flex-wrap items-center gap-2">{refreshing && <span className="text-xs text-mute" role="status">Memperbarui…</span>}<Btn variant="outline" className="px-2.5" aria-label="Muat ulang" onClick={() => setReload((value) => value + 1)}><RefreshCw className="size-3.5" /></Btn><Tabs value={tab} onChange={(value) => { setTab(value); setQuery(""); setCategory(""); }} tabs={[...(readIngredients ? [{ id: "bahan", label: "Bahan", count: ingredients.length }] : []), ...(readUnits ? [{ id: "satuan", label: "Satuan", count: units.length }] : [])]} />{((tab === "bahan" && can("ingredients.create")) || (tab === "satuan" && can("units.create"))) && <Btn onClick={() => tab === "bahan" ? void openIngredient() : openUnit()}><Plus className="size-3.5" />Tambah {tab === "bahan" ? "Bahan" : "Satuan"}</Btn>}</div>
    </header>
    <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4"><Kpi icon={<Boxes />} label="Total bahan" value={ingredients.length} /><Kpi icon={<Scale />} label="Total satuan" value={units.length} /><Kpi icon={<Archive />} label="Bahan aktif" value={ingredients.filter((row) => row.isActive).length} /><Kpi icon={<Archive />} label="Satuan aktif" value={units.filter((row) => row.isActive).length} /></div>
    {error && <div className="mb-4 rounded-xl bg-terra/10 px-4 py-3 text-sm text-terra" role="alert">{error} <button className="ml-2 underline" onClick={() => setReload((value) => value + 1)}>Coba lagi</button></div>}
    <Card className="min-w-0 overflow-hidden">
      <CardHeader title={tab === "bahan" ? "Daftar Bahan" : "Daftar Satuan"} sub={`${tab === "bahan" ? ingredientRows.length : unitRows.length} data ditampilkan`} action={<div className="flex flex-wrap items-center justify-end gap-2"><div className="relative"><Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-mute" /><TextInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari…" className="w-40 pl-8 sm:w-52" /></div>{tab === "bahan" && <SelectInput aria-label="Filter kategori" value={category} onChange={(event) => setCategory(event.target.value)} className="w-36"><option value="">Semua kategori</option>{lookup.categories.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</SelectInput>}<SelectInput aria-label="Filter status" value={status} onChange={(event) => setStatus(event.target.value)} className="w-32"><option value="active">Aktif</option><option value="archived">Diarsipkan</option><option value="all">Semua</option></SelectInput></div>} />
      {tab === "bahan" ? <IngredientTable rows={ingredientRows} empty={hasFilters} canUpdate={can("ingredients.update")} onDetail={setTarget} onEdit={(row) => void openIngredient(row)} onToggle={(row) => setConfirm({ kind: "ingredient", item: row })} /> : <UnitTable rows={unitRows} empty={hasFilters} canUpdate={can("units.update")} onEdit={openUnit} onToggle={(row) => setConfirm({ kind: "unit", item: row })} />}
    </Card>
    <Modal open={Boolean(ingredientForm)} onClose={closeForms} title={editingIngredient ? "Ubah Bahan" : "Tambah Bahan"} wide>{ingredientForm && <IngredientEditor form={ingredientForm} setForm={setIngredientForm} settings={settings} setSettings={setSettings} lookup={lookup} error={formError} conflict={conflict} submitting={submitting} onSubmit={saveIngredient} onCancel={closeForms} />}</Modal>
    <Modal open={Boolean(unitForm)} onClose={closeForms} title={editingUnit ? "Ubah Satuan" : "Tambah Satuan"}>{unitForm && <UnitEditor form={unitForm} setForm={setUnitForm} error={formError} conflict={conflict} submitting={submitting} onSubmit={saveUnit} onCancel={closeForms} />}</Modal>
    <Modal open={Boolean(confirm)} onClose={() => !submitting && setConfirm(null)} title={confirm?.item.isActive ? "Arsipkan data?" : "Aktifkan kembali?"}><p className="text-sm leading-relaxed text-mute">{confirm?.item.isActive ? "Data tidak tersedia untuk transaksi baru, tetapi histori tetap dipertahankan." : "Data kembali tersedia sesuai aturan backend."}</p><FormError text={formError} conflict={false} /><div className="mt-5 flex justify-end gap-2"><Btn variant="ghost" disabled={submitting} onClick={() => setConfirm(null)}>Batal</Btn><Btn variant={confirm?.item.isActive ? "danger" : "primary"} disabled={submitting} onClick={() => void toggle()}>{submitting ? "Memproses…" : confirm?.item.isActive ? "Arsipkan" : "Aktifkan"}</Btn></div></Modal>
    <Drawer open={Boolean(target)} onClose={() => setTarget(null)} title={target?.name ?? "Detail Bahan"} sub={target?.sku}>{detailLoading ? <State kind="loading" title="Memuat detail" text="Pengaturan outlet sedang diambil." /> : detailError ? <State kind="error" title="Detail tidak dapat dimuat" text={detailError} action="Coba lagi" onAction={() => { const row = target; setTarget(null); window.setTimeout(() => setTarget(row), 0); }} /> : detail && <DetailPanel item={detail} />}</Drawer>
  </div>;
}

function IngredientTable(p: { rows: Ingredient[]; empty: boolean; canUpdate: boolean; onDetail: (row: Ingredient) => void; onEdit: (row: Ingredient) => void; onToggle: (row: Ingredient) => void }) {
  if (!p.rows.length) return <State kind="empty" title={p.empty ? "Tidak ada hasil" : "Belum ada bahan"} text={p.empty ? "Ubah pencarian atau filter aktif." : "Tambahkan bahan pertama untuk tenant ini."} />;
  return <DataTable head={["SKU", "Nama", "Kategori", "Base Unit", "Outlet", "Valuasi", "Shelf Life", "Status", ""]} wide>{p.rows.map((row) => <Row key={row.id} onClick={() => p.onDetail(row)}><Cell className="mono font-medium">{row.sku}</Cell><Cell><span className="font-medium">{row.name}</span>{row.isPerishable && <Badge tone="amber" className="ml-2">perishable</Badge>}<small className="block text-[11px] text-mute">{row.barcode ?? "Tanpa barcode"}</small></Cell><Cell className="text-mute">{row.categoryName ?? "Tanpa kategori"}</Cell><Cell className="mono">{row.baseUnitCode}</Cell><Cell className="mono text-right">{row.outletCount}</Cell><Cell>{row.valuationMethod === "weighted_average" ? "Weighted Average" : "FIFO"}</Cell><Cell>{row.shelfLifeDays ? `${row.shelfLifeDays} hari` : "—"}</Cell><Cell><StatusBadge label={row.isActive ? "active" : "archived"} /></Cell><Cell><Actions allowed={p.canUpdate} active={row.isActive} onEdit={() => p.onEdit(row)} onToggle={() => p.onToggle(row)} /></Cell></Row>)}</DataTable>;
}
function UnitTable(p: { rows: Unit[]; empty: boolean; canUpdate: boolean; onEdit: (row: Unit) => void; onToggle: (row: Unit) => void }) {
  if (!p.rows.length) return <State kind="empty" title={p.empty ? "Tidak ada hasil" : "Belum ada satuan"} text={p.empty ? "Ubah pencarian atau filter aktif." : "Tambahkan satuan pertama untuk tenant ini."} />;
  return <DataTable head={["Kode", "Nama", "Dimensi", "Base", "Presisi", "Status", ""]} wide>{p.rows.map((row) => <Row key={row.id}><Cell className="mono font-medium">{row.code}</Cell><Cell>{row.name}</Cell><Cell>{DIMENSIONS[row.dimension]}</Cell><Cell>{row.isBase ? <Badge tone="olive">base</Badge> : "—"}</Cell><Cell className="mono text-right">{row.decimalScale}</Cell><Cell><StatusBadge label={row.isActive ? "active" : "archived"} /></Cell><Cell><Actions allowed={p.canUpdate} active={row.isActive} onEdit={() => p.onEdit(row)} onToggle={() => p.onToggle(row)} /></Cell></Row>)}</DataTable>;
}
function Actions({ allowed, active, onEdit, onToggle }: { allowed: boolean; active: boolean; onEdit: () => void; onToggle: () => void }) { if (!allowed) return <span className="text-mute">—</span>; return <div className="flex gap-1" onClick={(event) => event.stopPropagation()}><Btn variant="ghost" className="px-2 py-1 text-xs" onClick={onEdit}>Ubah</Btn><Btn variant="ghost" className="px-2 py-1 text-xs" onClick={onToggle}>{active ? "Arsipkan" : "Aktifkan"}</Btn></div>; }
function Kpi({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) { return <Card className="p-3.5"><div className="flex items-center gap-2 text-mute"><span className="[&>svg]:size-3.5">{icon}</span><span className="text-[12px] font-medium">{label}</span></div><p className="mono mt-2 text-xl font-semibold">{value}</p></Card>; }
function FormError({ text, conflict }: { text: string; conflict: boolean }) { return text ? <div className="rounded-lg bg-terra/10 px-3 py-2 text-xs text-terra" role="alert"><strong>{conflict ? "Konflik data: " : ""}</strong>{text}</div> : null; }
function FormActions({ submitting, onCancel }: { submitting: boolean; onCancel: () => void }) { return <div className="flex justify-end gap-2 pt-1"><Btn type="button" variant="ghost" disabled={submitting} onClick={onCancel}>Batal</Btn><Btn type="submit" disabled={submitting}>{submitting ? "Menyimpan…" : "Simpan"}</Btn></div>; }

function UnitEditor(p: { form: UnitForm; setForm: (value: UnitForm) => void; error: string; conflict: boolean; submitting: boolean; onSubmit: (event: FormEvent) => void; onCancel: () => void }) {
  const f = p.form;
  return <form onSubmit={p.onSubmit} className="space-y-3"><FormError text={p.error} conflict={p.conflict} /><Field label="Kode" hint="Otomatis uppercase" required><TextInput required maxLength={20} pattern="[A-Za-z0-9_-]+" value={f.code} onChange={(event) => p.setForm({ ...f, code: event.target.value.toUpperCase() })} /></Field><Field label="Nama" required><TextInput required minLength={2} maxLength={80} value={f.name} onChange={(event) => p.setForm({ ...f, name: event.target.value })} /></Field><div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><Field label="Dimensi" required><SelectInput value={f.dimension} onChange={(event) => p.setForm({ ...f, dimension: event.target.value as Dimension })}>{Object.entries(DIMENSIONS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</SelectInput></Field><Field label="Presisi desimal"><TextInput type="number" min={0} max={6} required value={f.decimalScale} onChange={(event) => p.setForm({ ...f, decimalScale: Number(event.target.value) })} /></Field></div><label className="flex items-center gap-2 text-[13px]"><input type="checkbox" checked={f.isBase} onChange={(event) => p.setForm({ ...f, isBase: event.target.checked })} className="accent-[oklch(0.52_0.065_128)]" />Dapat digunakan sebagai base unit</label><p className="text-[11px] text-mute">Dimensi, presisi, dan status base dapat dikunci backend setelah digunakan.</p><FormActions submitting={p.submitting} onCancel={p.onCancel} /></form>;
}
function IngredientEditor(p: { form: IngredientForm; setForm: (value: IngredientForm) => void; settings: Setting[]; setSettings: (value: Setting[]) => void; lookup: Lookup; error: string; conflict: boolean; submitting: boolean; onSubmit: (event: FormEvent) => void; onCancel: () => void }) {
  const f = p.form, change = (index: number, patch: Partial<Setting>) => p.setSettings(p.settings.map((row, i) => i === index ? { ...row, ...patch } : row));
  return <form onSubmit={p.onSubmit} className="space-y-4"><FormError text={p.error} conflict={p.conflict} /><div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><Field label="SKU" hint="Otomatis uppercase" required><TextInput required minLength={2} maxLength={50} pattern="[A-Za-z0-9_-]+" value={f.sku} onChange={(event) => p.setForm({ ...f, sku: event.target.value.toUpperCase() })} /></Field><Field label="Nama bahan" required><TextInput required minLength={2} maxLength={150} value={f.name} onChange={(event) => p.setForm({ ...f, name: event.target.value })} /></Field><Field label="Kategori"><SelectInput value={f.categoryId} onChange={(event) => p.setForm({ ...f, categoryId: event.target.value })}><option value="">Tanpa kategori</option>{p.lookup.categories.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</SelectInput></Field><Field label="Base unit" required><SelectInput required value={f.baseUnitId} onChange={(event) => p.setForm({ ...f, baseUnitId: event.target.value })}><option value="">Pilih satuan</option>{p.lookup.units.map((row) => <option key={row.id} value={row.id}>{row.code} — {row.name}</option>)}</SelectInput></Field><Field label="Metode valuasi"><SelectInput value={f.valuationMethod} onChange={(event) => p.setForm({ ...f, valuationMethod: event.target.value as Valuation })}><option value="weighted_average">Weighted Average</option><option value="fifo">FIFO</option></SelectInput></Field><Field label="Barcode"><TextInput maxLength={100} value={f.barcode} onChange={(event) => p.setForm({ ...f, barcode: event.target.value })} /></Field></div><div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><label className="flex items-center gap-2 text-[13px]"><input type="checkbox" checked={f.isPerishable} onChange={(event) => p.setForm({ ...f, isPerishable: event.target.checked })} className="accent-[oklch(0.52_0.065_128)]" />Mudah rusak</label>{f.isPerishable && <Field label="Shelf life (hari)" required><TextInput type="number" min={1} max={3650} required value={f.shelfLifeDays} onChange={(event) => p.setForm({ ...f, shelfLifeDays: event.target.value })} /></Field>}</div><fieldset className="space-y-3 rounded-xl bg-cream p-3 ring-1 ring-black/5"><legend className="px-1 text-xs font-semibold">Pengaturan per outlet</legend>{p.settings.length ? p.settings.map((row, index) => { const outlet = p.lookup.outlets.find((item) => item.id === row.outletId); return <div key={row.outletId} className="grid grid-cols-2 gap-2 rounded-lg bg-card p-3 ring-1 ring-black/5 sm:grid-cols-5"><strong className="col-span-2 text-xs sm:col-span-5">{outlet?.name ?? row.outletName}</strong><Field label="Minimum"><TextInput type="number" min={0} step="0.001" value={row.minimumStock} onChange={(event) => change(index, { minimumStock: Number(event.target.value) })} /></Field><Field label="Reorder"><TextInput type="number" min={0} step="0.001" value={row.reorderPoint} onChange={(event) => change(index, { reorderPoint: Number(event.target.value) })} /></Field><Field label="Par stock"><TextInput type="number" min={0} step="0.001" value={row.parStock} onChange={(event) => change(index, { parStock: Number(event.target.value) })} /></Field><Field label="Lokasi default"><SelectInput value={row.defaultStorageLocationId ?? ""} onChange={(event) => change(index, { defaultStorageLocationId: event.target.value || null })}><option value="">Belum ditentukan</option>{p.lookup.storageLocations.filter((location) => location.outletId === row.outletId).map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</SelectInput></Field><label className="flex items-end gap-2 pb-2 text-xs"><input type="checkbox" checked={row.isAvailable} onChange={(event) => change(index, { isAvailable: event.target.checked })} className="accent-[oklch(0.52_0.065_128)]" />Tersedia</label></div>; }) : <p className="text-xs text-mute">Tidak ada outlet yang dapat diakses session.</p>}</fieldset><p className="text-[11px] text-mute">Minimum ≤ reorder point ≤ par stock. Backend tetap menjadi otoritas validasi.</p><FormActions submitting={p.submitting} onCancel={p.onCancel} /></form>;
}
function DetailPanel({ item }: { item: Detail }) { return <div className="space-y-5"><div className="flex items-center justify-between"><StatusBadge label={item.isActive ? "active" : "archived"} />{item.isPerishable && <Badge tone="amber">perishable</Badge>}</div><div className="grid grid-cols-2 gap-3"><Metric label="Kategori" value={item.categoryName ?? "Tanpa kategori"} /><Metric label="Base unit" value={`${item.baseUnitCode} — ${item.baseUnitName}`} /><Metric label="Valuasi" value={item.valuationMethod === "fifo" ? "FIFO" : "Weighted Average"} /><Metric label="Shelf life" value={item.shelfLifeDays ? `${item.shelfLifeDays} hari` : "Tidak ada"} /></div><section><h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-mute">Pengaturan outlet</h3>{item.outletSettings.length ? <ul className="space-y-2">{item.outletSettings.map((row) => <li key={row.outletId} className="rounded-lg bg-cream p-3 text-xs ring-1 ring-black/5"><div className="flex justify-between"><strong>{row.outletName}</strong><Badge tone={row.isAvailable ? "olive" : "terra"}>{row.isAvailable ? "Tersedia" : "Tidak tersedia"}</Badge></div><p className="mt-2 text-mute">Minimum {number(row.minimumStock)} · ROP {number(row.reorderPoint)} · Par {number(row.parStock)}</p><p className="mt-1 text-mute">Lokasi: {row.defaultStorageLocationName ?? "Belum ditentukan"}</p></li>)}</ul> : <p className="text-sm text-mute">Belum ada pengaturan outlet.</p>}</section></div>; }
function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-lg bg-cream p-3 text-xs ring-1 ring-black/5"><p className="text-mute">{label}</p><p className="mt-1 font-medium">{value}</p></div>; }
function State({ kind, title, text, action, onAction }: { kind: "loading" | "empty" | "forbidden" | "error"; title: string; text: string; action?: string; onAction?: () => void }) { return <div className="grid min-h-48 place-items-center px-5 py-8 text-center" role={kind === "error" ? "alert" : kind === "loading" ? "status" : undefined}><div>{kind === "loading" && <span className="mx-auto mb-3 block size-7 animate-spin rounded-full border-2 border-olive/20 border-t-olive" />}<strong className="block text-sm">{title}</strong><p className="mt-1 text-xs text-mute">{text}</p>{action && <Btn className="mt-4" onClick={onAction}>{action}</Btn>}</div></div>; }
function normalizeIngredient(row: Ingredient): Ingredient { return { ...row, outletCount: Number(row.outletCount), supplierCount: Number(row.supplierCount), shelfLifeDays: row.shelfLifeDays === null ? null : Number(row.shelfLifeDays) }; }
function normalizeSetting(row: Setting): Setting { return { ...row, minimumStock: Number(row.minimumStock), reorderPoint: Number(row.reorderPoint), parStock: Number(row.parStock), defaultStorageLocationId: row.defaultStorageLocationId ?? null }; }
function match(active: boolean, status: string) { return status === "all" || active === (status === "active"); }
function includes(value: string, query: string) { return value.toLowerCase().includes(query.trim().toLowerCase()); }
function number(value: number) { return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 3 }).format(value); }
function errorMessage(cause: unknown, fallback: string) { return cause instanceof Error ? cause.message : fallback; }
