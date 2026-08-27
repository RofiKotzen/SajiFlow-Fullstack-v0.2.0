"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import type { ApiClient, AuthSession } from "./sajiflow-api";
import "./master-data.css";
import "./supplier-management.css";

type Supplier = {
  id: string;
  code: string;
  name: string;
  taxId: string | null;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  paymentTermDays: number;
  leadTimeDays: number;
  isActive: boolean;
  activeCatalogCount: number;
  purchaseOrderCount: number;
};
type Catalog = {
  id: string;
  ingredientId: string;
  ingredientSku: string;
  ingredientName: string;
  purchaseUnitId: string;
  purchaseUnitCode: string;
  purchaseUnitName: string;
  supplierSku: string | null;
  conversionToBase: number;
  lastPrice: number | null;
  unitCostBase: number | null;
  minimumOrderQty: number;
  isPreferred: boolean;
  isActive: boolean;
};
type Lookups = {
  ingredients: {
    id: string;
    sku: string;
    name: string;
    baseUnitId: string;
    baseUnitCode: string;
    dimension: string;
  }[];
  units: { id: string; code: string; name: string; dimension: string }[];
};
const emptySupplier = {
  code: "",
  name: "",
  taxId: "",
  contactName: "",
  phone: "",
  email: "",
  address: "",
  paymentTermDays: 0,
  leadTimeDays: 0,
};
const emptyCatalog = {
  ingredientId: "",
  purchaseUnitId: "",
  supplierSku: "",
  conversionToBase: 1,
  lastPrice: "",
  minimumOrderQty: 1,
  isPreferred: false,
};

export function ConnectedSupplierManagement({
  session,
  api,
  onNotify,
}: {
  session: AuthSession;
  api: ApiClient;
  onNotify: (message: string) => void;
}) {
  const can = (permission: string) =>
    session.user.permissions.includes(permission);
  const canRead = session.user.permissions.includes("suppliers.read");
  const [rows, setRows] = useState<Supplier[]>([]),
    [query, setQuery] = useState(""),
    [status, setStatus] = useState("active"),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<Supplier | null>(null),
    [catalog, setCatalog] = useState<Catalog[]>([]),
    [lookups, setLookups] = useState<Lookups>({ ingredients: [], units: [] });
  const [supplierForm, setSupplierForm] = useState<typeof emptySupplier | null>(
      null,
    ),
    [catalogForm, setCatalogForm] = useState<typeof emptyCatalog | null>(null),
    [editingCatalog, setEditingCatalog] = useState<Catalog | null>(null);
  const load = useCallback(async () => {
    if (!canRead) return;
    setLoading(true);
    try {
      const suffix = status === "all" ? "" : `?isActive=${status === "active"}`;
      setRows(await api<Supplier[]>(`/suppliers${suffix}`));
    } catch (cause) {
      setError(message(cause));
    } finally {
      setLoading(false);
    }
  }, [api, status, canRead]);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  async function open(row?: Supplier) {
    setSelected(row ?? null);
    setSupplierForm(
      row
        ? {
            code: row.code,
            name: row.name,
            taxId: row.taxId ?? "",
            contactName: row.contactName ?? "",
            phone: row.phone ?? "",
            email: row.email ?? "",
            address: row.address ?? "",
            paymentTermDays: row.paymentTermDays,
            leadTimeDays: row.leadTimeDays,
          }
        : { ...emptySupplier },
    );
  }
  async function openCatalog(row: Supplier) {
    try {
      const [items, refs] = await Promise.all([
        api<Catalog[]>(`/suppliers/${row.id}/catalog`),
        api<Lookups>("/suppliers/lookups"),
      ]);
      setSelected(row);
      setCatalog(items);
      setLookups(refs);
    } catch (cause) {
      setError(message(cause));
    }
  }
  async function saveSupplier(event: FormEvent) {
    event.preventDefault();
    if (!supplierForm) return;
    setSaving(true);
    try {
      await api(selected ? `/suppliers/${selected.id}` : "/suppliers", {
        method: selected ? "PATCH" : "POST",
        body: JSON.stringify(supplierForm),
      });
      setSupplierForm(null);
      setSelected(null);
      onNotify("Supplier berhasil disimpan.");
      await load();
    } catch (cause) {
      setError(message(cause));
    } finally {
      setSaving(false);
    }
  }
  async function saveCatalog(event: FormEvent) {
    event.preventDefault();
    if (!selected || !catalogForm) return;
    setSaving(true);
    const body = {
      ...catalogForm,
      lastPrice: Number(catalogForm.lastPrice),
      conversionToBase: Number(catalogForm.conversionToBase),
      minimumOrderQty: Number(catalogForm.minimumOrderQty),
    };
    try {
      await api(
        editingCatalog
          ? `/suppliers/${selected.id}/catalog/${editingCatalog.id}`
          : `/suppliers/${selected.id}/catalog`,
        {
          method: editingCatalog ? "PATCH" : "POST",
          body: JSON.stringify(body),
        },
      );
      setCatalogForm(null);
      setEditingCatalog(null);
      onNotify("Katalog supplier berhasil disimpan.");
      await openCatalog(selected);
    } catch (cause) {
      setError(message(cause));
    } finally {
      setSaving(false);
    }
  }
  async function toggleSupplier(row: Supplier) {
    if (!confirm(`${row.isActive ? "Arsipkan" : "Aktifkan"} ${row.name}?`))
      return;
    try {
      await api(
        `/suppliers/${row.id}/${row.isActive ? "archive" : "activate"}`,
        { method: "POST" },
      );
      await load();
      onNotify(
        `Supplier berhasil ${row.isActive ? "diarsipkan" : "diaktifkan"}.`,
      );
    } catch (cause) {
      setError(message(cause));
    }
  }
  async function toggleCatalog(row: Catalog) {
    if (!selected) return;
    try {
      await api(
        `/suppliers/${selected.id}/catalog/${row.id}/${row.isActive ? "archive" : "activate"}`,
        { method: "POST" },
      );
      await openCatalog(selected);
    } catch (cause) {
      setError(message(cause));
    }
  }
  if (!can("suppliers.read"))
    return (
      <section className="panel md-denied">
        <h2>Akses supplier diperlukan</h2>
        <p>Hubungi administrator untuk permission suppliers.read.</p>
      </section>
    );
  const visible = rows.filter((row) =>
    `${row.code} ${row.name} ${row.contactName ?? ""}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return (
    <div className="md-connected sm-connected">
      {error && (
        <div className="io-error" role="alert">
          <span>{error}</span>
          <button onClick={() => setError("")}>×</button>
        </div>
      )}
      <section className="panel md-panel">
        <div className="md-toolbar">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari kode, supplier, atau kontak…"
          />
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="active">Aktif</option>
            <option value="archived">Diarsipkan</option>
            <option value="all">Semua status</option>
          </select>
          <button
            className="primary-button"
            disabled={!can("suppliers.create")}
            onClick={() => void open()}
          >
            + Tambah Supplier
          </button>
        </div>
        {loading ? (
          <div className="io-loading">
            <p>Memuat supplier…</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table md-table sm-table">
              <thead>
                <tr>
                  <th>Supplier</th>
                  <th>Kontak</th>
                  <th>Termin / Lead time</th>
                  <th>Katalog</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <strong>{row.name}</strong>
                      <small>{row.code}</small>
                    </td>
                    <td>
                      {row.contactName ?? "—"}
                      <small>
                        {row.phone ?? row.email ?? "Kontak belum diisi"}
                      </small>
                    </td>
                    <td>
                      {row.paymentTermDays} hari
                      <small>Lead {row.leadTimeDays} hari</small>
                    </td>
                    <td>
                      {row.activeCatalogCount} aktif
                      <small>{row.purchaseOrderCount} PO</small>
                    </td>
                    <td>
                      <Status active={row.isActive} />
                    </td>
                    <td>
                      <button onClick={() => void openCatalog(row)}>
                        Katalog
                      </button>
                      <button
                        disabled={!can("suppliers.update")}
                        onClick={() => void open(row)}
                      >
                        Ubah
                      </button>
                      <button
                        className="md-archive"
                        disabled={!can("suppliers.update")}
                        onClick={() => void toggleSupplier(row)}
                      >
                        {row.isActive ? "Arsipkan" : "Aktifkan"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!visible.length && (
              <div className="io-empty">
                <strong>Supplier tidak ditemukan</strong>
              </div>
            )}
          </div>
        )}
      </section>
      {supplierForm && (
      <Modal
        title={selected ? "Ubah Supplier" : "Supplier Baru"}
        onClose={() => {
          setSupplierForm(null);
          setSelected(null);
        }}
        >
          <form className="md-form" onSubmit={saveSupplier}>
            <label>
              Kode
              <input
                required
                maxLength={40}
                value={supplierForm.code}
                onChange={(e) =>
                  setSupplierForm({
                    ...supplierForm,
                    code: e.target.value.toUpperCase(),
                  })
                }
              />
            </label>
            <label>
              Nama
              <input
                required
                value={supplierForm.name}
                onChange={(e) =>
                  setSupplierForm({ ...supplierForm, name: e.target.value })
                }
              />
            </label>
            <label>
              NPWP / Tax ID
              <input
                value={supplierForm.taxId}
                onChange={(e) =>
                  setSupplierForm({ ...supplierForm, taxId: e.target.value })
                }
              />
            </label>
            <label>
              Nama kontak
              <input
                value={supplierForm.contactName}
                onChange={(e) =>
                  setSupplierForm({
                    ...supplierForm,
                    contactName: e.target.value,
                  })
                }
              />
            </label>
            <label>
              Telepon
              <input
                value={supplierForm.phone}
                onChange={(e) =>
                  setSupplierForm({ ...supplierForm, phone: e.target.value })
                }
              />
            </label>
            <label>
              Email
              <input
                type="email"
                value={supplierForm.email}
                onChange={(e) =>
                  setSupplierForm({ ...supplierForm, email: e.target.value })
                }
              />
            </label>
            <label>
              Termin pembayaran (hari)
              <input
                type="number"
                min="0"
                value={supplierForm.paymentTermDays}
                onChange={(e) =>
                  setSupplierForm({
                    ...supplierForm,
                    paymentTermDays: Number(e.target.value),
                  })
                }
              />
            </label>
            <label>
              Lead time (hari)
              <input
                type="number"
                min="0"
                value={supplierForm.leadTimeDays}
                onChange={(e) =>
                  setSupplierForm({
                    ...supplierForm,
                    leadTimeDays: Number(e.target.value),
                  })
                }
              />
            </label>
            <label className="sm-full">
              Alamat
              <textarea
                value={supplierForm.address}
                onChange={(e) =>
                  setSupplierForm({ ...supplierForm, address: e.target.value })
                }
              />
            </label>
          <Actions
            saving={saving}
            close={() => {
              setSupplierForm(null);
              setSelected(null);
            }}
          />
          </form>
        </Modal>
      )}
      {selected && !supplierForm && catalog.length >= 0 && (
        <Modal
          wide
          title={`Katalog — ${selected.name}`}
          onClose={() => setSelected(null)}
        >
          <div className="sm-catalog-head">
            <span>
              Harga per purchase unit; unit cost base dihitung server dari
              conversion.
            </span>
            <button
              className="primary-button"
              disabled={!selected.isActive || !can("suppliers.catalog.manage")}
              onClick={() => {
                setEditingCatalog(null);
                setCatalogForm({ ...emptyCatalog });
              }}
            >
              + Item Katalog
            </button>
          </div>
          <div className="table-wrap">
            <table className="data-table md-table sm-table">
              <thead>
                <tr>
                  <th>Bahan</th>
                  <th>Purchase unit</th>
                  <th>Harga</th>
                  <th>Cost base</th>
                  <th>MOQ</th>
                  <th>Conversion</th>
                  <th>Preferred</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {catalog.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <strong>{row.ingredientName}</strong>
                      <small>
                        {row.ingredientSku}
                        {row.supplierSku ? ` • ${row.supplierSku}` : ""}
                      </small>
                    </td>
                    <td>
                      {row.purchaseUnitCode}
                      <small>{row.purchaseUnitName}</small>
                    </td>
                    <td>{money(row.lastPrice)}</td>
                    <td>{money(row.unitCostBase)}</td>
                    <td>{row.minimumOrderQty}</td>
                    <td>{row.conversionToBase}</td>
                    <td>
                      <Status active={row.isPreferred} />
                    </td>
                    <td>
                      <button
                        disabled={
                          !row.isActive || !can("suppliers.catalog.manage")
                        }
                        onClick={() => {
                          setEditingCatalog(row);
                          setCatalogForm({
                            ingredientId: row.ingredientId,
                            purchaseUnitId: row.purchaseUnitId,
                            supplierSku: row.supplierSku ?? "",
                            conversionToBase: row.conversionToBase,
                            lastPrice: String(row.lastPrice ?? ""),
                            minimumOrderQty: row.minimumOrderQty,
                            isPreferred: row.isPreferred,
                          });
                        }}
                      >
                        Ubah
                      </button>
                      <button
                        disabled={!can("suppliers.catalog.manage")}
                        onClick={() => void toggleCatalog(row)}
                      >
                        {row.isActive ? "Arsipkan" : "Aktifkan"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {catalogForm && (
            <form className="md-form sm-catalog-form" onSubmit={saveCatalog}>
              <label>
                Bahan
                <select
                  required
                  value={catalogForm.ingredientId}
                  onChange={(e) =>
                    setCatalogForm({
                      ...catalogForm,
                      ingredientId: e.target.value,
                      purchaseUnitId: "",
                    })
                  }
                >
                  <option value="">Pilih bahan</option>
                  {lookups.ingredients.map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.sku} — {row.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Purchase unit
                <select
                  required
                  value={catalogForm.purchaseUnitId}
                  onChange={(e) =>
                    setCatalogForm({
                      ...catalogForm,
                      purchaseUnitId: e.target.value,
                    })
                  }
                >
                  <option value="">Pilih satuan</option>
                  {lookups.units
                    .filter(
                      (unit) =>
                        unit.dimension ===
                        lookups.ingredients.find(
                          (i) => i.id === catalogForm.ingredientId,
                        )?.dimension,
                    )
                    .map((row) => (
                      <option key={row.id} value={row.id}>
                        {row.code} — {row.name}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                Supplier SKU
                <input
                  value={catalogForm.supplierSku}
                  onChange={(e) =>
                    setCatalogForm({
                      ...catalogForm,
                      supplierSku: e.target.value,
                    })
                  }
                />
              </label>
              <label>
                Harga / purchase unit
                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  value={catalogForm.lastPrice}
                  onChange={(e) =>
                    setCatalogForm({
                      ...catalogForm,
                      lastPrice: e.target.value,
                    })
                  }
                />
              </label>
              <label>
                MOQ
                <input
                  required
                  type="number"
                  min="0.001"
                  step="0.001"
                  value={catalogForm.minimumOrderQty}
                  onChange={(e) =>
                    setCatalogForm({
                      ...catalogForm,
                      minimumOrderQty: Number(e.target.value),
                    })
                  }
                />
              </label>
              <label>
                Conversion ke base
                <input
                  required
                  type="number"
                  min="0.000001"
                  step="0.000001"
                  value={catalogForm.conversionToBase}
                  onChange={(e) =>
                    setCatalogForm({
                      ...catalogForm,
                      conversionToBase: Number(e.target.value),
                    })
                  }
                />
              </label>
              <label className="md-check">
                <input
                  type="checkbox"
                  checked={catalogForm.isPreferred}
                  onChange={(e) =>
                    setCatalogForm({
                      ...catalogForm,
                      isPreferred: e.target.checked,
                    })
                  }
                />{" "}
                Preferred lintas supplier
              </label>
              <Actions saving={saving} close={() => setCatalogForm(null)} />
            </form>
          )}
        </Modal>
      )}
    </div>
  );
}
function Status({ active }: { active: boolean }) {
  return (
    <span className={`md-status ${active ? "active" : "archived"}`}>
      <i />
      {active ? "Ya" : "Tidak"}
    </span>
  );
}
function Modal({
  title,
  wide,
  onClose,
  children,
}: {
  title: string;
  wide?: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="md-modal" role="dialog" aria-modal="true">
      <div className={wide ? "wide" : ""}>
        <header>
          <h2>{title}</h2>
          <button onClick={onClose}>×</button>
        </header>
        {children}
      </div>
    </div>
  );
}
function Actions({ saving, close }: { saving: boolean; close: () => void }) {
  return (
    <div className="md-actions">
      <button type="button" className="secondary-button" onClick={close}>
        Batal
      </button>
      <button className="primary-button" disabled={saving}>
        {saving ? "Menyimpan…" : "Simpan"}
      </button>
    </div>
  );
}
function message(cause: unknown) {
  return cause instanceof Error ? cause.message : "Operasi supplier gagal.";
}
function money(value: number | null) {
  return value === null
    ? "Belum diisi"
    : new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 2,
      }).format(value);
}
