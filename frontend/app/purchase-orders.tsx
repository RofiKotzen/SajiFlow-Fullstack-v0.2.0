"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { ApiClient, AuthSession } from "./sajiflow-api";
import "./purchase-orders.css";

type PurchaseOrderStatus = "draft" | "approved" | "sent" | "partially_received" | "received" | "closed" | "cancelled";
type Outlet = { id: string; code: string; name: string; isActive: boolean };
type Supplier = { id: string; code: string; name: string; contactName: string | null; phone: string | null; paymentTermDays: number; leadTimeDays: number };
type CatalogItem = { id: string; supplierId: string; ingredientId: string; ingredientSku: string; ingredientName: string; categoryName: string | null; purchaseUnitId: string; purchaseUnitCode: string; purchaseUnitName: string; conversionToBase: number; lastPrice: number | null; minimumOrderQty: number; isPreferred: boolean };
type PurchaseOrderSummary = { id: string; outletId: string; outletName: string; poNo: string; supplierId: string; supplierName: string; orderDate: string; expectedDate: string | null; status: PurchaseOrderStatus; subtotal: number; discountAmount: number; taxAmount: number; shippingAmount: number; grandTotal: number; currencyCode: string; itemCount: number; updatedAt: string };
type PurchaseOrderItem = { id: string; ingredientId: string; ingredientSku: string; ingredientName: string; purchaseUnitId: string; purchaseUnitCode: string; purchaseUnitName: string; quantityOrdered: number; conversionToBase: number; unitPrice: number; discountAmount: number; taxAmount: number; lineTotal: number; quantityReceived: number };
type History = { id: string; action: string; reason: string | null; actorName: string | null; occurredAt: string };
type PurchaseOrderDetail = PurchaseOrderSummary & { supplierCode: string; supplierContactName: string | null; supplierPhone: string | null; purchaseRequestId: string | null; notes: string | null; createdAt: string; createdByName: string | null; items: PurchaseOrderItem[]; history: History[] };
type EditableItem = { key: string; catalogId: string; ingredientId: string; purchaseUnitId: string; quantityOrdered: number; unitPrice: number; discountAmount: number; taxAmount: number };
type PurchaseOrderForm = { outletId: string; supplierId: string; orderDate: string; expectedDate: string; shippingAmount: number; notes: string; items: EditableItem[] };

const STATUS_LABEL: Record<PurchaseOrderStatus, string> = {
  draft: "Draft",
  approved: "Disetujui",
  sent: "Dikirim ke Supplier",
  partially_received: "Diterima Sebagian",
  received: "Diterima Lengkap",
  closed: "Ditutup",
  cancelled: "Dibatalkan",
};

const ACTION_LABEL: Record<string, string> = {
  "purchase_order.create": "PO dibuat",
  "purchase_order.update": "Draft diperbarui",
  "purchase_order.approve": "PO disetujui",
  "purchase_order.send": "PO dikirim ke supplier",
  "purchase_order.cancel": "PO dibatalkan",
  "purchase_order.close": "PO ditutup",
};

function localDate(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function rupiah(value: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(value) || 0);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(new Date(`${value}T00:00:00`));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function can(session: AuthSession, permission: string) {
  return session.user.permissions.includes(permission);
}

function lineFromCatalog(catalog: CatalogItem): EditableItem {
  return {
    key: crypto.randomUUID(),
    catalogId: catalog.id,
    ingredientId: catalog.ingredientId,
    purchaseUnitId: catalog.purchaseUnitId,
    quantityOrdered: Number(catalog.minimumOrderQty) || 1,
    unitPrice: Number(catalog.lastPrice) || 0,
    discountAmount: 0,
    taxAmount: 0,
  };
}

export function ConnectedPurchaseOrders({ session, api, onNotify }: { session: AuthSession; api: ApiClient; onNotify: (message: string) => void }) {
  const [orders, setOrders] = useState<PurchaseOrderSummary[]>([]);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [detail, setDetail] = useState<PurchaseOrderDetail | null>(null);
  const [mode, setMode] = useState<"list" | "detail" | "editor">("list");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PurchaseOrderForm>({ outletId: "", supplierId: "", orderDate: localDate(), expectedDate: localDate(2), shippingAmount: 0, notes: "", items: [] });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [outletFilter, setOutletFilter] = useState("all");
  const [actionReason, setActionReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const [orderResult, lookupResult, outletResult] = await Promise.allSettled([
          api<PurchaseOrderSummary[]>("/purchase-orders"),
          api<{ suppliers: Supplier[]; catalog: CatalogItem[] }>("/purchase-orders/lookups"),
          api<Outlet[]>("/outlets"),
        ]);
        if (!active) return;
        if (orderResult.status === "rejected") throw orderResult.reason;
        if (lookupResult.status === "rejected") throw lookupResult.reason;
        setOrders(orderResult.value);
        setSuppliers(lookupResult.value.suppliers);
        setCatalog(lookupResult.value.catalog.map((item) => ({ ...item, conversionToBase: Number(item.conversionToBase), lastPrice: item.lastPrice === null ? null : Number(item.lastPrice), minimumOrderQty: Number(item.minimumOrderQty) })));
        setOutlets(outletResult.status === "fulfilled" ? outletResult.value.filter((item) => item.isActive !== false) : session.user.outletIds.map((id) => ({ id, code: id.slice(0, 8), name: `Outlet ${id.slice(0, 8)}`, isActive: true })));
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "Data purchase order gagal dimuat.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [api, session.user.outletIds]);

  const visibleOrders = useMemo(() => orders.filter((order) => {
    const matchesSearch = `${order.poNo} ${order.supplierName} ${order.outletName}`.toLowerCase().includes(search.toLowerCase());
    return matchesSearch && (statusFilter === "all" || order.status === statusFilter) && (outletFilter === "all" || order.outletId === outletFilter);
  }), [orders, search, statusFilter, outletFilter]);

  const formCatalog = useMemo(() => catalog.filter((item) => item.supplierId === form.supplierId), [catalog, form.supplierId]);
  const totals = useMemo(() => {
    const subtotal = form.items.reduce((sum, item) => sum + Number(item.quantityOrdered || 0) * Number(item.unitPrice || 0), 0);
    const discount = form.items.reduce((sum, item) => sum + Number(item.discountAmount || 0), 0);
    const tax = form.items.reduce((sum, item) => sum + Number(item.taxAmount || 0), 0);
    return { subtotal, discount, tax, grandTotal: subtotal - discount + tax + Number(form.shippingAmount || 0) };
  }, [form.items, form.shippingAmount]);

  async function reloadOrders() {
    setOrders(await api<PurchaseOrderSummary[]>("/purchase-orders"));
  }

  function startCreate() {
    const supplier = suppliers[0];
    const supplierCatalog = catalog.filter((item) => item.supplierId === supplier?.id);
    setEditingId(null);
    setDetail(null);
    setForm({
      outletId: outlets[0]?.id ?? "",
      supplierId: supplier?.id ?? "",
      orderDate: localDate(),
      expectedDate: localDate(supplier?.leadTimeDays || 2),
      shippingAmount: 0,
      notes: "",
      items: supplierCatalog[0] ? [lineFromCatalog(supplierCatalog[0])] : [],
    });
    setError("");
    setMode("editor");
  }

  function changeSupplier(supplierId: string) {
    const supplier = suppliers.find((item) => item.id === supplierId);
    const available = catalog.filter((item) => item.supplierId === supplierId);
    setForm((current) => ({ ...current, supplierId, expectedDate: localDate(supplier?.leadTimeDays || 2), items: available[0] ? [lineFromCatalog(available[0])] : [] }));
  }

  function addItem() {
    const available = formCatalog.find((catalogItem) => !form.items.some((line) => line.catalogId === catalogItem.id));
    if (!available) { setError("Seluruh bahan pada katalog supplier ini sudah ditambahkan."); return; }
    setForm((current) => ({ ...current, items: [...current.items, lineFromCatalog(available)] }));
  }

  function selectCatalog(key: string, catalogId: string) {
    const selected = formCatalog.find((item) => item.id === catalogId);
    if (!selected) return;
    setForm((current) => ({ ...current, items: current.items.map((line) => line.key === key ? { ...lineFromCatalog(selected), key } : line) }));
  }

  function updateItem(key: string, field: keyof EditableItem, value: number | string) {
    setForm((current) => ({ ...current, items: current.items.map((line) => line.key === key ? { ...line, [field]: value } : line) }));
  }

  function removeItem(key: string) {
    setForm((current) => ({ ...current, items: current.items.filter((line) => line.key !== key) }));
  }

  async function openOrder(id: string) {
    setLoading(true);
    setError("");
    try {
      const value = await api<PurchaseOrderDetail>(`/purchase-orders/${id}`);
      setDetail(value);
      setActionReason("");
      setMode("detail");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Detail purchase order gagal dimuat.");
    } finally {
      setLoading(false);
    }
  }

  function startEdit() {
    if (!detail) return;
    const items = detail.items.map((item) => {
      const matched = catalog.find((entry) => entry.supplierId === detail.supplierId && entry.ingredientId === item.ingredientId && entry.purchaseUnitId === item.purchaseUnitId);
      return { key: item.id, catalogId: matched?.id ?? "", ingredientId: item.ingredientId, purchaseUnitId: item.purchaseUnitId, quantityOrdered: Number(item.quantityOrdered), unitPrice: Number(item.unitPrice), discountAmount: Number(item.discountAmount), taxAmount: Number(item.taxAmount) };
    });
    setEditingId(detail.id);
    setForm({ outletId: detail.outletId, supplierId: detail.supplierId, orderDate: detail.orderDate, expectedDate: detail.expectedDate ?? "", shippingAmount: Number(detail.shippingAmount), notes: detail.notes ?? "", items });
    setError("");
    setMode("editor");
  }

  function validate() {
    if (!form.outletId) return "Outlet wajib dipilih.";
    if (!form.supplierId) return "Supplier wajib dipilih.";
    if (!form.orderDate) return "Tanggal PO wajib diisi.";
    if (form.expectedDate && form.expectedDate < form.orderDate) return "Tanggal estimasi tiba tidak boleh sebelum tanggal PO.";
    if (!form.items.length) return "Tambahkan minimal satu item.";
    if (form.items.some((item) => !item.catalogId)) return "Setiap item harus berasal dari katalog supplier.";
    if (form.items.some((item) => Number(item.quantityOrdered) <= 0)) return "Jumlah pesanan harus lebih dari nol.";
    if (form.items.some((item) => Number(item.unitPrice) < 0 || Number(item.discountAmount) < 0 || Number(item.taxAmount) < 0)) return "Harga, diskon, dan pajak tidak boleh negatif.";
    if (form.items.some((item) => Number(item.discountAmount) > Number(item.quantityOrdered) * Number(item.unitPrice))) return "Diskon item tidak boleh melebihi nilai kotornya.";
    if (totals.grandTotal <= 0) return "Total purchase order harus lebih dari nol.";
    return "";
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    const invalid = validate();
    if (invalid) { setError(invalid); return; }
    setSaving(true);
    setError("");
    try {
      const payload = {
        outletId: form.outletId,
        supplierId: form.supplierId,
        orderDate: form.orderDate,
        expectedDate: form.expectedDate || undefined,
        shippingAmount: Number(form.shippingAmount),
        notes: form.notes.trim() || undefined,
        items: form.items.map((item) => ({ ingredientId: item.ingredientId, purchaseUnitId: item.purchaseUnitId, quantityOrdered: Number(item.quantityOrdered), unitPrice: Number(item.unitPrice), discountAmount: Number(item.discountAmount), taxAmount: Number(item.taxAmount) })),
      };
      const saved = await api<PurchaseOrderDetail>(editingId ? `/purchase-orders/${editingId}` : "/purchase-orders", { method: editingId ? "PATCH" : "POST", body: JSON.stringify(payload) });
      await reloadOrders();
      setDetail(saved);
      setMode("detail");
      onNotify(editingId ? "Draft purchase order berhasil diperbarui." : `${saved.poNo} berhasil dibuat.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Purchase order gagal disimpan.");
    } finally {
      setSaving(false);
    }
  }

  async function runAction(action: "approve" | "send" | "cancel" | "close") {
    if (!detail) return;
    if (action === "cancel" && actionReason.trim().length < 3) { setError("Alasan pembatalan minimal 3 karakter."); return; }
    setSaving(true);
    setError("");
    try {
      const updated = await api<PurchaseOrderDetail>(`/purchase-orders/${detail.id}/${action}`, { method: "POST", body: JSON.stringify({ reason: actionReason.trim() || undefined }) });
      setDetail(updated);
      setActionReason("");
      await reloadOrders();
      onNotify({ approve: "Purchase order berhasil disetujui.", send: "Purchase order ditandai telah dikirim ke supplier.", cancel: "Purchase order berhasil dibatalkan.", close: "Purchase order berhasil ditutup." }[action]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Status purchase order gagal diperbarui.");
    } finally {
      setSaving(false);
    }
  }

  if (loading && !detail && !orders.length) return <div className="po-loading"><span/><strong>Memuat purchase order…</strong></div>;

  return <div className="connected-po">
    {error && <div className="po-error" role="alert"><div><strong>Belum dapat diproses</strong><span>{error}</span></div><button onClick={() => setError("")}>×</button></div>}

    {mode === "list" && <>
      <div className="stats-grid po-stats">
        <article className="stat-card"><div className="stat-icon green">PO</div><div><span>Total purchase order</span><strong>{orders.length}</strong><small>{orders.filter((item) => item.status === "draft").length} masih draft</small></div></article>
        <article className="stat-card"><div className="stat-icon gold">✓</div><div><span>Perlu diproses</span><strong>{orders.filter((item) => ["approved", "sent"].includes(item.status)).length}</strong><small>Approved atau sudah dikirim</small></div></article>
        <article className="stat-card"><div className="stat-icon blue">↗</div><div><span>Dalam pengiriman</span><strong>{orders.filter((item) => item.status === "sent").length}</strong><small>Menunggu Goods Receipt</small></div></article>
        <article className="stat-card"><div className="stat-icon purple">Rp</div><div><span>Nilai PO aktif</span><strong>{rupiah(orders.filter((item) => !["cancelled", "closed"].includes(item.status)).reduce((sum, item) => sum + Number(item.grandTotal), 0))}</strong><small>Di luar PO batal dan ditutup</small></div></article>
      </div>
      <section className="panel po-list-panel">
        <div className="po-list-heading"><div><h2>Daftar Purchase Order</h2><p>Data nyata dari PostgreSQL, dipisahkan per tenant dan outlet.</p></div>{can(session, "purchase_orders.create") && <button className="primary-button" onClick={startCreate}>＋ Buat Purchase Order</button>}</div>
        <div className="po-toolbar"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari nomor PO, supplier, atau outlet…"/><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">Semua status</option>{Object.entries(STATUS_LABEL).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select><select value={outletFilter} onChange={(event) => setOutletFilter(event.target.value)}><option value="all">Semua outlet</option>{outlets.map((outlet) => <option value={outlet.id} key={outlet.id}>{outlet.name}</option>)}</select></div>
        <div className="table-wrap"><table className="po-table"><thead><tr><th>Nomor PO</th><th>Supplier</th><th>Outlet</th><th>Tanggal</th><th>Item</th><th>Total</th><th>Status</th><th/></tr></thead><tbody>{visibleOrders.map((order) => <tr key={order.id} onClick={() => void openOrder(order.id)}><td><strong>{order.poNo}</strong><small>Update {formatDateTime(order.updatedAt)}</small></td><td><strong>{order.supplierName}</strong></td><td>{order.outletName}</td><td><span>{formatDate(order.orderDate)}</span><small>{order.expectedDate ? `Estimasi ${formatDate(order.expectedDate)}` : "Tanpa estimasi"}</small></td><td>{order.itemCount} item</td><td><strong>{rupiah(order.grandTotal)}</strong></td><td><span className={`po-status po-${order.status}`}>{STATUS_LABEL[order.status]}</span></td><td><button aria-label={`Buka ${order.poNo}`}>→</button></td></tr>)}</tbody></table>{!visibleOrders.length && <div className="po-empty"><strong>Belum ada purchase order</strong><span>{orders.length ? "Tidak ada data yang sesuai filter." : "Buat PO pertama untuk memulai proses pembelian."}</span></div>}</div>
        <div className="table-footer">Menampilkan {visibleOrders.length} dari {orders.length} purchase order</div>
      </section>
    </>}

    {mode === "editor" && <form onSubmit={save} className="po-editor">
      <div className="po-backbar"><button type="button" onClick={() => setMode(editingId ? "detail" : "list")}>← Kembali</button><div><span>{editingId ? "EDIT DRAFT" : "PURCHASE ORDER BARU"}</span><h2>{editingId ? detail?.poNo : "Buat draft pembelian"}</h2></div></div>
      <div className="po-editor-grid">
        <section className="panel po-form-card"><div className="panel-heading"><div><h2>Informasi Pesanan</h2><p>Supplier, outlet, dan jadwal pengiriman</p></div><span className="po-status po-draft">Draft</span></div><div className="po-form-grid"><label><span>Outlet</span><select value={form.outletId} onChange={(event) => setForm({ ...form, outletId: event.target.value })} disabled={saving}><option value="">Pilih outlet</option>{outlets.map((outlet) => <option value={outlet.id} key={outlet.id}>{outlet.name}</option>)}</select></label><label><span>Supplier</span><select value={form.supplierId} onChange={(event) => changeSupplier(event.target.value)} disabled={saving}><option value="">Pilih supplier</option>{suppliers.map((supplier) => <option value={supplier.id} key={supplier.id}>{supplier.name}</option>)}</select></label><label><span>Tanggal PO</span><input type="date" value={form.orderDate} onChange={(event) => setForm({ ...form, orderDate: event.target.value })} disabled={saving}/></label><label><span>Estimasi tiba</span><input type="date" value={form.expectedDate} min={form.orderDate} onChange={(event) => setForm({ ...form, expectedDate: event.target.value })} disabled={saving}/></label><label><span>Biaya kirim</span><input type="number" min="0" step="1000" value={form.shippingAmount} onChange={(event) => setForm({ ...form, shippingAmount: Math.max(0, Number(event.target.value)) })} disabled={saving}/></label><label className="full"><span>Catatan untuk supplier</span><textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} maxLength={2000} placeholder="Jadwal, kualitas, atau instruksi pengiriman" disabled={saving}/></label></div></section>
        <aside className="panel po-summary"><div className="panel-heading"><div><h2>Ringkasan Nilai</h2><p>Dihitung otomatis oleh sistem</p></div></div><div className="po-summary-lines"><div><span>Subtotal</span><strong>{rupiah(totals.subtotal)}</strong></div><div><span>Diskon item</span><strong>− {rupiah(totals.discount)}</strong></div><div><span>Pajak item</span><strong>+ {rupiah(totals.tax)}</strong></div><div><span>Biaya kirim</span><strong>+ {rupiah(form.shippingAmount)}</strong></div><div className="grand"><span>Grand total</span><strong>{rupiah(totals.grandTotal)}</strong></div></div><div className="po-snapshot-note">Harga dan konversi satuan akan disimpan sebagai snapshot saat draft dibuat.</div></aside>
      </div>
      <section className="panel po-items-panel"><div className="po-list-heading"><div><h2>Rincian Item</h2><p>Item hanya dapat dipilih dari katalog supplier aktif.</p></div><button type="button" className="secondary-button" onClick={addItem} disabled={saving || !formCatalog.length}>＋ Tambah Item</button></div><div className="table-wrap"><table className="po-item-editor"><thead><tr><th>Bahan & Satuan</th><th>Jumlah</th><th>Harga Unit</th><th>Diskon</th><th>Pajak</th><th>Total Baris</th><th/></tr></thead><tbody>{form.items.map((line) => { const lineTotal = Number(line.quantityOrdered) * Number(line.unitPrice) - Number(line.discountAmount) + Number(line.taxAmount); const selected = catalog.find((item) => item.id === line.catalogId); return <tr key={line.key}><td><select value={line.catalogId} onChange={(event) => selectCatalog(line.key, event.target.value)} disabled={saving}>{formCatalog.map((item) => <option value={item.id} key={item.id}>{item.ingredientName} • {item.purchaseUnitCode}</option>)}</select>{selected && <small>{selected.categoryName ?? "Tanpa kategori"} • MOQ {selected.minimumOrderQty} {selected.purchaseUnitCode}</small>}</td><td><input type="number" min={selected?.minimumOrderQty ?? 0.001} step="0.001" value={line.quantityOrdered} onChange={(event) => updateItem(line.key, "quantityOrdered", Math.max(0, Number(event.target.value)))} disabled={saving}/></td><td><input type="number" min="0" step="100" value={line.unitPrice} onChange={(event) => updateItem(line.key, "unitPrice", Math.max(0, Number(event.target.value)))} disabled={saving}/></td><td><input type="number" min="0" step="100" value={line.discountAmount} onChange={(event) => updateItem(line.key, "discountAmount", Math.max(0, Number(event.target.value)))} disabled={saving}/></td><td><input type="number" min="0" step="100" value={line.taxAmount} onChange={(event) => updateItem(line.key, "taxAmount", Math.max(0, Number(event.target.value)))} disabled={saving}/></td><td><strong>{rupiah(lineTotal)}</strong></td><td><button type="button" className="po-remove" onClick={() => removeItem(line.key)} disabled={saving || form.items.length === 1}>×</button></td></tr>})}</tbody></table>{!form.items.length && <div className="po-empty"><strong>Katalog supplier belum tersedia</strong><span>Jalankan kembali database seed atau lengkapi master supplier dan bahan.</span></div>}</div><div className="po-editor-actions"><button type="button" className="ghost-button" onClick={() => setMode(editingId ? "detail" : "list")}>Batal</button><button type="submit" className="primary-button" disabled={saving || (editingId ? !can(session, "purchase_orders.update") : !can(session, "purchase_orders.create"))}>{saving ? "Menyimpan…" : "Simpan Draft"}</button></div></section>
    </form>}

    {mode === "detail" && detail && <div className="po-detail">
      <div className="po-backbar"><button onClick={() => { setMode("list"); setDetail(null); }}>← Daftar PO</button><div><span>PURCHASE ORDER</span><h2>{detail.poNo}</h2></div><span className={`po-status po-${detail.status}`}>{STATUS_LABEL[detail.status]}</span></div>
      <div className="po-detail-hero panel"><div><span>Supplier</span><strong>{detail.supplierName}</strong><small>{detail.supplierCode} • {detail.supplierContactName ?? "PIC belum diisi"} {detail.supplierPhone ? `• ${detail.supplierPhone}` : ""}</small></div><div><span>Outlet</span><strong>{detail.outletName}</strong><small>Order {formatDate(detail.orderDate)} • Estimasi {detail.expectedDate ? formatDate(detail.expectedDate) : "belum ditentukan"}</small></div><div><span>Grand total</span><strong>{rupiah(detail.grandTotal)}</strong><small>{detail.items.length} jenis item</small></div></div>
      <section className="panel po-detail-items"><div className="panel-heading"><div><h2>Rincian Pesanan</h2><p>Harga dan konversi berikut merupakan snapshot PO.</p></div>{detail.status === "draft" && can(session, "purchase_orders.update") && <button className="secondary-button" onClick={startEdit}>Edit Draft</button>}</div><div className="table-wrap"><table><thead><tr><th>Bahan</th><th>Pesanan</th><th>Konversi</th><th>Harga</th><th>Diskon</th><th>Pajak</th><th>Diterima</th><th>Total</th></tr></thead><tbody>{detail.items.map((item) => <tr key={item.id}><td><strong>{item.ingredientName}</strong><small>{item.ingredientSku}</small></td><td>{item.quantityOrdered} {item.purchaseUnitCode}</td><td>× {item.conversionToBase}</td><td>{rupiah(item.unitPrice)}</td><td>{rupiah(item.discountAmount)}</td><td>{rupiah(item.taxAmount)}</td><td>{item.quantityReceived} {item.purchaseUnitCode}</td><td><strong>{rupiah(item.lineTotal)}</strong></td></tr>)}</tbody></table></div><div className="po-detail-totals"><div><span>Subtotal</span><b>{rupiah(detail.subtotal)}</b></div><div><span>Diskon</span><b>− {rupiah(detail.discountAmount)}</b></div><div><span>Pajak</span><b>+ {rupiah(detail.taxAmount)}</b></div><div><span>Pengiriman</span><b>+ {rupiah(detail.shippingAmount)}</b></div><div><span>Total</span><strong>{rupiah(detail.grandTotal)}</strong></div></div>{detail.notes && <div className="po-notes"><span>Catatan supplier</span><p>{detail.notes}</p></div>}</section>
      <div className="po-bottom-grid"><section className="panel po-actions"><div className="panel-heading"><div><h2>Kontrol Status</h2><p>Setiap tindakan dicatat pada audit trail.</p></div></div><div className="po-action-body"><div className="po-flow"><span className={["approved", "sent", "partially_received", "received", "closed"].includes(detail.status) ? "done" : "current"}>1<b>Draft</b></span><i/><span className={["sent", "partially_received", "received", "closed"].includes(detail.status) ? "done" : detail.status === "approved" ? "current" : ""}>2<b>Approved</b></span><i/><span className={["partially_received", "received", "closed"].includes(detail.status) ? "done" : detail.status === "sent" ? "current" : ""}>3<b>Sent</b></span><i/><span className={["received", "closed"].includes(detail.status) ? "done" : detail.status === "partially_received" ? "current" : ""}>4<b>Received</b></span></div>{!["closed", "cancelled"].includes(detail.status) && <label><span>Catatan tindakan</span><textarea value={actionReason} onChange={(event) => setActionReason(event.target.value)} placeholder={detail.status === "draft" ? "Wajib diisi jika membatalkan" : "Catatan opsional; wajib untuk pembatalan"}/></label>}<div className="po-action-buttons">{detail.status === "draft" && can(session, "purchase_orders.approve") && <button className="primary-button" onClick={() => void runAction("approve")} disabled={saving}>Setujui PO</button>}{detail.status === "approved" && can(session, "purchase_orders.send") && <button className="primary-button" onClick={() => void runAction("send")} disabled={saving}>Tandai Dikirim</button>}{["draft", "approved", "sent"].includes(detail.status) && can(session, "purchase_orders.cancel") && <button className="danger-button" onClick={() => void runAction("cancel")} disabled={saving}>Batalkan PO</button>}{detail.status === "received" && can(session, "purchase_orders.close") && <button className="secondary-button" onClick={() => void runAction("close")} disabled={saving}>Tutup PO</button>}</div>{detail.status === "sent" && <p className="po-receipt-hint">Status penerimaan akan diperbarui otomatis oleh modul Goods Receipt—tidak dapat diubah manual.</p>}</div></section><section className="panel po-history"><div className="panel-heading"><div><h2>Riwayat Aktivitas</h2><p>Jejak audit purchase order</p></div></div><div className="po-history-list">{detail.history.map((item) => <div key={item.id}><span>✓</span><div><strong>{ACTION_LABEL[item.action] ?? item.action}</strong><small>{formatDateTime(item.occurredAt)} • {item.actorName ?? "Sistem"}</small>{item.reason && <p>{item.reason}</p>}</div></div>)}</div></section></div>
    </div>}
  </div>;
}
