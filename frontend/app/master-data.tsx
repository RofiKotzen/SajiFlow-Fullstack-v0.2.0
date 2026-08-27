"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import type { ApiClient, AuthSession } from "./sajiflow-api";
import "./master-data.css";

type Unit = { id: string; code: string; name: string; dimension: "mass" | "volume" | "count" | "length"; isBase: boolean; decimalScale: number; isActive: boolean };
type Ingredient = { id: string; sku: string; name: string; categoryId: string | null; categoryName: string | null; baseUnitId: string; baseUnitCode: string; baseUnitName: string; valuationMethod: "weighted_average" | "fifo"; isPerishable: boolean; shelfLifeDays: number | null; barcode: string | null; isActive: boolean; outletCount: number; supplierCount: number };
type Lookup = { categories: { id: string; name: string }[]; units: { id: string; code: string; name: string; dimension: string }[]; outlets: { id: string; code: string; name: string }[]; storageLocations: { id: string; outletId: string; code: string; name: string }[] };
type OutletSetting = { outletId: string; minimumStock: number; reorderPoint: number; parStock: number; defaultStorageLocationId: string; isAvailable: boolean };
type IngredientDetail = Ingredient & { outletSettings: (OutletSetting & { outletName: string })[] };

const DIMENSIONS: Record<Unit["dimension"], string> = { mass: "Massa", volume: "Volume", count: "Jumlah", length: "Panjang" };
const emptyUnit = { code: "", name: "", dimension: "mass" as Unit["dimension"], isBase: false, decimalScale: 3 };
const emptyIngredient = { sku: "", name: "", categoryId: "", baseUnitId: "", valuationMethod: "weighted_average" as Ingredient["valuationMethod"], isPerishable: false, shelfLifeDays: "", barcode: "" };

export function ConnectedMasterData({ session, api, onNotify }: { session: AuthSession; api: ApiClient; onNotify: (message: string) => void }) {
  const [tab, setTab] = useState<"ingredients" | "units">("ingredients");
  const [units, setUnits] = useState<Unit[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [lookups, setLookups] = useState<Lookup>({ categories: [], units: [], outlets: [], storageLocations: [] });
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("active");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [unitForm, setUnitForm] = useState<typeof emptyUnit | null>(null);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [ingredientForm, setIngredientForm] = useState<typeof emptyIngredient | null>(null);
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null);
  const [settings, setSettings] = useState<OutletSetting[]>([]);
  const [saving, setSaving] = useState(false);
  const can = (permission: string) => session.user.permissions.includes(permission);
  const canReadIngredients = session.user.permissions.includes("ingredients.read");
  const canReadUnits = session.user.permissions.includes("units.read");

  const load = useCallback(async () => {
    if (!canReadIngredients && !canReadUnits) return;
    setLoading(true); setError("");
    try {
      const [unitRows, ingredientRows, lookupRows] = await Promise.all([
        canReadUnits ? api<Unit[]>("/units") : Promise.resolve([]),
        canReadIngredients ? api<Ingredient[]>("/ingredients") : Promise.resolve([]),
        canReadIngredients ? api<Lookup>("/ingredients/lookups") : Promise.resolve({ categories: [], units: [], outlets: [], storageLocations: [] }),
      ]);
      setUnits(unitRows); setIngredients(ingredientRows); setLookups(lookupRows);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Master data gagal dimuat."); }
    finally { setLoading(false); }
  }, [api, canReadIngredients, canReadUnits]);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);

  const visibleUnits = useMemo(() => units.filter((unit) => matchStatus(unit.isActive, status) && `${unit.code} ${unit.name}`.toLowerCase().includes(query.toLowerCase())), [units, query, status]);
  const visibleIngredients = useMemo(() => ingredients.filter((item) => matchStatus(item.isActive, status) && `${item.sku} ${item.name} ${item.categoryName ?? ""}`.toLowerCase().includes(query.toLowerCase())), [ingredients, query, status]);

  function openUnit(unit?: Unit) { setEditingUnit(unit ?? null); setUnitForm(unit ? { code: unit.code, name: unit.name, dimension: unit.dimension, isBase: unit.isBase, decimalScale: unit.decimalScale } : { ...emptyUnit }); }
  async function openIngredient(item?: Ingredient) {
    setEditingIngredient(item ?? null);
    setIngredientForm(item ? { sku: item.sku, name: item.name, categoryId: item.categoryId ?? "", baseUnitId: item.baseUnitId, valuationMethod: item.valuationMethod, isPerishable: item.isPerishable, shelfLifeDays: item.shelfLifeDays?.toString() ?? "", barcode: item.barcode ?? "" } : { ...emptyIngredient });
    if (item) {
      try { const detail = await api<IngredientDetail>(`/ingredients/${item.id}`); setSettings(makeSettings(lookups, detail.outletSettings)); }
      catch (cause) { setError(cause instanceof Error ? cause.message : "Detail bahan gagal dimuat."); }
    } else setSettings(makeSettings(lookups, []));
  }

  async function saveUnit(event: FormEvent) {
    event.preventDefault(); if (!unitForm) return; setSaving(true); setError("");
    try {
      await api(editingUnit ? `/units/${editingUnit.id}` : "/units", { method: editingUnit ? "PATCH" : "POST", body: JSON.stringify(unitForm) });
      setUnitForm(null); onNotify(editingUnit ? "Satuan berhasil diperbarui." : "Satuan berhasil dibuat."); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Satuan gagal disimpan."); }
    finally { setSaving(false); }
  }

  async function saveIngredient(event: FormEvent) {
    event.preventDefault(); if (!ingredientForm) return; setSaving(true); setError("");
    const body = { ...ingredientForm, categoryId: ingredientForm.categoryId || null, shelfLifeDays: ingredientForm.isPerishable ? Number(ingredientForm.shelfLifeDays) : null, barcode: ingredientForm.barcode || null, outletSettings: settings.map((setting) => ({ ...setting, defaultStorageLocationId: setting.defaultStorageLocationId || null })) };
    try {
      await api(editingIngredient ? `/ingredients/${editingIngredient.id}` : "/ingredients", { method: editingIngredient ? "PATCH" : "POST", body: JSON.stringify(body) });
      setIngredientForm(null); onNotify(editingIngredient ? "Bahan berhasil diperbarui." : "Bahan berhasil dibuat."); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Bahan gagal disimpan."); }
    finally { setSaving(false); }
  }

  async function toggle(kind: "unit" | "ingredient", item: Unit | Ingredient) {
    const active = !item.isActive;
    if (!window.confirm(`${active ? "Aktifkan" : "Arsipkan"} ${item.name}? Histori transaksi tidak akan berubah.`)) return;
    try { await api(`/${kind === "unit" ? "units" : "ingredients"}/${item.id}`, { method: "PATCH", body: JSON.stringify({ isActive: active }) }); onNotify(`${item.name} ${active ? "diaktifkan" : "diarsipkan"}.`); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Status gagal diperbarui."); }
  }

  if (!can("ingredients.read") && !can("units.read")) return <section className="panel md-denied"><h2>Akses master data diperlukan</h2><p>Hubungi administrator untuk permission bahan atau satuan.</p></section>;
  return <div className="md-connected">
    {error && <div className="io-error" role="alert"><div><strong>MASTER DATA</strong><span>{error}</span></div><button onClick={() => setError("")}>×</button></div>}
    <section className="panel md-panel">
      <div className="md-tabs">
        {can("ingredients.read") && <button className={tab === "ingredients" ? "active" : ""} onClick={() => setTab("ingredients")}>Bahan <span>{ingredients.length}</span></button>}
        {can("units.read") && <button className={tab === "units" ? "active" : ""} onClick={() => setTab("units")}>Satuan <span>{units.length}</span></button>}
      </div>
      <div className="md-toolbar"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Cari ${tab === "ingredients" ? "SKU, bahan, kategori" : "kode atau nama satuan"}…`} /><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">Semua status</option><option value="active">Aktif</option><option value="archived">Diarsipkan</option></select><button className="primary-button" disabled={tab === "ingredients" ? !can("ingredients.create") : !can("units.create")} onClick={() => tab === "ingredients" ? void openIngredient() : openUnit()}>+ Tambah {tab === "ingredients" ? "Bahan" : "Satuan"}</button></div>
      {loading ? <div className="io-loading"><span /><p>Memuat master data…</p></div> : tab === "ingredients" ? <IngredientTable rows={visibleIngredients} canUpdate={can("ingredients.update")} onEdit={(item) => void openIngredient(item)} onToggle={(item) => void toggle("ingredient", item)} /> : <UnitTable rows={visibleUnits} canUpdate={can("units.update")} onEdit={openUnit} onToggle={(item) => void toggle("unit", item)} />}
    </section>
    {unitForm && <Modal title={editingUnit ? "Ubah Satuan" : "Satuan Baru"} onClose={() => setUnitForm(null)}><form className="md-form" onSubmit={saveUnit}><label>Kode<input value={unitForm.code} onChange={(e) => setUnitForm({ ...unitForm, code: e.target.value.toUpperCase() })} required maxLength={20} /></label><label>Nama<input value={unitForm.name} onChange={(e) => setUnitForm({ ...unitForm, name: e.target.value })} required /></label><label>Dimensi<select value={unitForm.dimension} onChange={(e) => setUnitForm({ ...unitForm, dimension: e.target.value as Unit["dimension"] })}>{Object.entries(DIMENSIONS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>Presisi desimal<input type="number" min="0" max="6" value={unitForm.decimalScale} onChange={(e) => setUnitForm({ ...unitForm, decimalScale: Number(e.target.value) })} /></label><label className="md-check"><input type="checkbox" checked={unitForm.isBase} onChange={(e) => setUnitForm({ ...unitForm, isBase: e.target.checked })} /> Dapat digunakan sebagai base unit</label><FormActions saving={saving} onCancel={() => setUnitForm(null)} /></form></Modal>}
    {ingredientForm && <Modal title={editingIngredient ? "Ubah Bahan" : "Bahan Baru"} wide onClose={() => setIngredientForm(null)}><form className="md-form md-form-wide" onSubmit={saveIngredient}><label>SKU<input value={ingredientForm.sku} onChange={(e) => setIngredientForm({ ...ingredientForm, sku: e.target.value.toUpperCase() })} required /></label><label>Nama bahan<input value={ingredientForm.name} onChange={(e) => setIngredientForm({ ...ingredientForm, name: e.target.value })} required /></label><label>Kategori<select value={ingredientForm.categoryId} onChange={(e) => setIngredientForm({ ...ingredientForm, categoryId: e.target.value })}><option value="">Tanpa kategori</option>{lookups.categories.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label><label>Base unit<select value={ingredientForm.baseUnitId} onChange={(e) => setIngredientForm({ ...ingredientForm, baseUnitId: e.target.value })} required><option value="">Pilih satuan</option>{lookups.units.map((row) => <option key={row.id} value={row.id}>{row.code} — {row.name}</option>)}</select></label><label>Metode valuasi<select value={ingredientForm.valuationMethod} onChange={(e) => setIngredientForm({ ...ingredientForm, valuationMethod: e.target.value as Ingredient["valuationMethod"] })}><option value="weighted_average">Weighted Average</option><option value="fifo">FIFO</option></select></label><label>Barcode<input value={ingredientForm.barcode} onChange={(e) => setIngredientForm({ ...ingredientForm, barcode: e.target.value })} /></label><label className="md-check"><input type="checkbox" checked={ingredientForm.isPerishable} onChange={(e) => setIngredientForm({ ...ingredientForm, isPerishable: e.target.checked })} /> Mudah rusak</label>{ingredientForm.isPerishable && <label>Shelf life (hari)<input type="number" min="1" max="3650" value={ingredientForm.shelfLifeDays} onChange={(e) => setIngredientForm({ ...ingredientForm, shelfLifeDays: e.target.value })} required /></label>}<fieldset className="md-settings"><legend>Pengaturan per outlet</legend>{settings.map((setting, index) => { const outlet = lookups.outlets.find((row) => row.id === setting.outletId)!; const change = (patch: Partial<OutletSetting>) => setSettings(settings.map((row, i) => i === index ? { ...row, ...patch } : row)); return <div className="md-setting" key={setting.outletId}><strong>{outlet?.name}</strong><label>Minimum<input type="number" min="0" step="0.001" value={setting.minimumStock} onChange={(e) => change({ minimumStock: Number(e.target.value) })} /></label><label>Reorder<input type="number" min="0" step="0.001" value={setting.reorderPoint} onChange={(e) => change({ reorderPoint: Number(e.target.value) })} /></label><label>Par<input type="number" min="0" step="0.001" value={setting.parStock} onChange={(e) => change({ parStock: Number(e.target.value) })} /></label><label>Lokasi default<select value={setting.defaultStorageLocationId} onChange={(e) => change({ defaultStorageLocationId: e.target.value })}><option value="">Belum ditentukan</option>{lookups.storageLocations.filter((location) => location.outletId === setting.outletId).map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select></label><label className="md-check"><input type="checkbox" checked={setting.isAvailable} onChange={(e) => change({ isAvailable: e.target.checked })} /> Tersedia</label></div>; })}</fieldset><FormActions saving={saving} onCancel={() => setIngredientForm(null)} /></form></Modal>}
  </div>;
}

function IngredientTable({ rows, canUpdate, onEdit, onToggle }: { rows: Ingredient[]; canUpdate: boolean; onEdit: (row: Ingredient) => void; onToggle: (row: Ingredient) => void }) { return <div className="table-wrap"><table className="data-table md-table"><thead><tr><th>Bahan</th><th>Kategori</th><th>Base unit</th><th>Karakteristik</th><th>Cakupan</th><th>Status</th><th>Aksi</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td><strong>{row.name}</strong><small>{row.sku}{row.barcode ? ` • ${row.barcode}` : ""}</small></td><td>{row.categoryName ?? "—"}</td><td><strong>{row.baseUnitCode}</strong><small>{row.baseUnitName}</small></td><td>{row.isPerishable ? `Perishable • ${row.shelfLifeDays} hari` : "Non-perishable"}<small>{row.valuationMethod === "fifo" ? "FIFO" : "Weighted Average"}</small></td><td>{row.outletCount} outlet<small>{row.supplierCount} supplier</small></td><td><Status active={row.isActive} /></td><td><button disabled={!canUpdate} onClick={() => onEdit(row)}>Ubah</button><button className="md-archive" disabled={!canUpdate} onClick={() => onToggle(row)}>{row.isActive ? "Arsipkan" : "Aktifkan"}</button></td></tr>)}</tbody></table>{!rows.length && <Empty />}</div>; }
function UnitTable({ rows, canUpdate, onEdit, onToggle }: { rows: Unit[]; canUpdate: boolean; onEdit: (row: Unit) => void; onToggle: (row: Unit) => void }) { return <div className="table-wrap"><table className="data-table md-table"><thead><tr><th>Kode</th><th>Nama</th><th>Dimensi</th><th>Presisi</th><th>Base unit</th><th>Status</th><th>Aksi</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td><strong>{row.code}</strong></td><td>{row.name}</td><td>{DIMENSIONS[row.dimension]}</td><td>{row.decimalScale} digit</td><td>{row.isBase ? "Ya" : "Tidak"}</td><td><Status active={row.isActive} /></td><td><button disabled={!canUpdate} onClick={() => onEdit(row)}>Ubah</button><button className="md-archive" disabled={!canUpdate} onClick={() => onToggle(row)}>{row.isActive ? "Arsipkan" : "Aktifkan"}</button></td></tr>)}</tbody></table>{!rows.length && <Empty />}</div>; }
function Status({ active }: { active: boolean }) { return <span className={`md-status ${active ? "active" : "archived"}`}><i />{active ? "Aktif" : "Diarsipkan"}</span>; }
function Empty() { return <div className="io-empty"><strong>Data tidak ditemukan</strong><span>Ubah pencarian atau filter status.</span></div>; }
function Modal({ title, wide, onClose, children }: { title: string; wide?: boolean; onClose: () => void; children: React.ReactNode }) { return <div className="md-modal" role="dialog" aria-modal="true"><div className={wide ? "wide" : ""}><header><h2>{title}</h2><button onClick={onClose} aria-label="Tutup">×</button></header>{children}</div></div>; }
function FormActions({ saving, onCancel }: { saving: boolean; onCancel: () => void }) { return <div className="md-actions"><button type="button" className="secondary-button" onClick={onCancel}>Batal</button><button className="primary-button" disabled={saving}>{saving ? "Menyimpan…" : "Simpan"}</button></div>; }
function matchStatus(active: boolean, status: string) { return status === "all" || (status === "active" ? active : !active); }
function makeSettings(lookups: Lookup, existing: IngredientDetail["outletSettings"]): OutletSetting[] { return lookups.outlets.map((outlet) => { const value = existing.find((row) => row.outletId === outlet.id); return { outletId: outlet.id, minimumStock: Number(value?.minimumStock ?? 0), reorderPoint: Number(value?.reorderPoint ?? 0), parStock: Number(value?.parStock ?? 0), defaultStorageLocationId: value?.defaultStorageLocationId ?? "", isAvailable: value?.isAvailable ?? true }; }); }
