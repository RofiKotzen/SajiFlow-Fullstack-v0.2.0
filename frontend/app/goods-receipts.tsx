"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { ApiClient, AuthSession } from "./sajiflow-api";
import "./goods-receipts.css";

type ReceiptStatus = "draft" | "posted" | "void";
type StorageLocation = { id: string; outletId: string; code: string; name: string; locationType: string };
type ReceivableItem = { id: string; ingredientId: string; ingredientSku: string; ingredientName: string; isPerishable: boolean; shelfLifeDays: number | null; purchaseUnitId: string; purchaseUnitCode: string; purchaseUnitName: string; quantityOrdered: number; quantityReceived: number; remainingQuantity: number; conversionToBase: number; unitPrice: number; lineTotal: number; unitCostBase: number };
type ReceivablePo = { id: string; outletId: string; outletName: string; poNo: string; supplierId: string; supplierName: string; orderDate: string; expectedDate: string | null; status: "sent" | "partially_received"; items: ReceivableItem[] };
type ReceiptSummary = { id: string; outletId: string; outletName: string; receiptNo: string; purchaseOrderId: string; poNo: string; supplierId: string; supplierName: string; receivedAt: string; receivedByName: string; status: ReceiptStatus; supplierDeliveryNo: string | null; supplierInvoiceNo: string | null; itemCount: number; quantityReceived: number; quantityRejected: number; stockValue: number; updatedAt: string };
type ReceiptItem = { id: string; purchaseOrderItemId: string; ingredientId: string; ingredientSku: string; ingredientName: string; isPerishable: boolean; purchaseUnitId: string; purchaseUnitCode: string; purchaseUnitName: string; quantityOrdered: number; poQuantityReceived: number; quantityReceived: number; quantityRejected: number; rejectionReason: string | null; baseQuantity: number; unitCostBase: number; batchNo: string | null; expiryDate: string | null; storageLocationId: string; storageLocationCode: string; storageLocationName: string };
type History = { id: string; action: string; reason: string | null; actorName: string | null; occurredAt: string };
type Movement = { id: string; movementNo: string; movementType: "receipt" | "reversal"; status: "posted" | "reversed"; movementAt: string; reason: string | null };
type ReceiptDetail = ReceiptSummary & { poStatus: string; supplierCode: string; receivedBy: string; notes: string | null; createdAt: string; items: ReceiptItem[]; totals: { acceptedPurchaseQuantity: number; rejectedPurchaseQuantity: number; baseQuantity: number; stockValue: number }; history: History[]; movements: Movement[] };
type EditableLine = ReceivableItem & { quantityToReceive: number; quantityRejected: number; rejectionReason: string; storageLocationId: string; batchNo: string; expiryDate: string };
type ReceiptForm = { purchaseOrderId: string; receivedAt: string; supplierDeliveryNo: string; supplierInvoiceNo: string; notes: string; items: EditableLine[] };

const STATUS_LABEL: Record<ReceiptStatus, string> = { draft: "Draft", posted: "Posted ke Stok", void: "Void" };
const ACTION_LABEL: Record<string, string> = { "goods_receipt.create": "Goods Receipt dibuat", "goods_receipt.update": "Draft diperbarui", "goods_receipt.post": "Penerimaan diposting ke stok", "goods_receipt.void": "Penerimaan di-void dan stok direversal" };

function can(session: AuthSession, permission: string) { return session.user.permissions.includes(permission); }
function rupiah(value: number) { return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(value) || 0); }
function number(value: number) { return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 3 }).format(Number(value) || 0); }
function formatDate(value: string) { return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(new Date(value.length === 10 ? `${value}T00:00:00` : value)); }
function formatDateTime(value: string) { return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)); }
function localDateTime(value = new Date()) { const copy = new Date(value.getTime() - value.getTimezoneOffset() * 60_000); return copy.toISOString().slice(0, 16); }
function expiryFrom(days: number | null) { if (!days) return ""; const value = new Date(); value.setDate(value.getDate() + days); return value.toISOString().slice(0, 10); }

export function ConnectedGoodsReceipts({ session, api, onNotify }: { session: AuthSession; api: ApiClient; onNotify: (message: string) => void }) {
  const [receipts, setReceipts] = useState<ReceiptSummary[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<ReceivablePo[]>([]);
  const [locations, setLocations] = useState<StorageLocation[]>([]);
  const [detail, setDetail] = useState<ReceiptDetail | null>(null);
  const [mode, setMode] = useState<"list" | "editor" | "detail">("list");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ReceiptForm>({ purchaseOrderId: "", receivedAt: localDateTime(), supplierDeliveryNo: "", supplierInvoiceNo: "", notes: "", items: [] });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [outletFilter, setOutletFilter] = useState("all");
  const [voidReason, setVoidReason] = useState("");
  const [showVoidConfirmation, setShowVoidConfirmation] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const [receiptRows, lookup] = await Promise.all([
          api<ReceiptSummary[]>("/goods-receipts"),
          api<{ storageLocations: StorageLocation[]; purchaseOrders: ReceivablePo[] }>("/goods-receipts/lookups"),
        ]);
        if (!active) return;
        setReceipts(receiptRows.map(normalizeSummary));
        setLocations(lookup.storageLocations);
        setPurchaseOrders(lookup.purchaseOrders.map((po) => ({ ...po, items: po.items.map((item) => ({ ...item, quantityOrdered: Number(item.quantityOrdered), quantityReceived: Number(item.quantityReceived), remainingQuantity: Number(item.remainingQuantity), conversionToBase: Number(item.conversionToBase), unitPrice: Number(item.unitPrice), lineTotal: Number(item.lineTotal), unitCostBase: Number(item.unitCostBase) })) })));
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "Data Goods Receipt gagal dimuat.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [api]);

  const visibleReceipts = useMemo(() => receipts.filter((receipt) => {
    const matched = `${receipt.receiptNo} ${receipt.poNo} ${receipt.supplierName} ${receipt.supplierDeliveryNo ?? ""} ${receipt.supplierInvoiceNo ?? ""}`.toLowerCase().includes(search.toLowerCase());
    return matched && (statusFilter === "all" || receipt.status === statusFilter) && (outletFilter === "all" || receipt.outletId === outletFilter);
  }), [receipts, search, statusFilter, outletFilter]);
  const outletOptions = useMemo(() => [...new Map([...receipts.map((item) => [item.outletId, item.outletName] as const), ...purchaseOrders.map((item) => [item.outletId, item.outletName] as const)]).entries()], [receipts, purchaseOrders]);
  const selectedPo = purchaseOrders.find((po) => po.id === form.purchaseOrderId);
  const acceptedItems = form.items.filter((item) => Number(item.quantityToReceive) > 0);
  const formTotals = { accepted: acceptedItems.reduce((sum, item) => sum + Number(item.quantityToReceive), 0), rejected: acceptedItems.reduce((sum, item) => sum + Number(item.quantityRejected), 0), base: acceptedItems.reduce((sum, item) => sum + Number(item.quantityToReceive) * Number(item.conversionToBase), 0), value: acceptedItems.reduce((sum, item) => sum + Number(item.quantityToReceive) * Number(item.conversionToBase) * Number(item.unitCostBase), 0) };

  async function reload() {
    const [receiptRows, lookup] = await Promise.all([api<ReceiptSummary[]>("/goods-receipts"), api<{ storageLocations: StorageLocation[]; purchaseOrders: ReceivablePo[] }>("/goods-receipts/lookups")]);
    setReceipts(receiptRows.map(normalizeSummary));
    setLocations(lookup.storageLocations);
    setPurchaseOrders(lookup.purchaseOrders.map((po) => ({ ...po, items: po.items.map((item) => ({ ...item, quantityOrdered: Number(item.quantityOrdered), quantityReceived: Number(item.quantityReceived), remainingQuantity: Number(item.remainingQuantity), conversionToBase: Number(item.conversionToBase), unitPrice: Number(item.unitPrice), lineTotal: Number(item.lineTotal), unitCostBase: Number(item.unitCostBase) })) })));
  }

  function linesFromPo(po: ReceivablePo) {
    const defaultLocation = locations.find((location) => location.outletId === po.outletId);
    return po.items.map((item) => ({ ...item, quantityToReceive: Number(item.remainingQuantity), quantityRejected: 0, rejectionReason: "", storageLocationId: defaultLocation?.id ?? "", batchNo: "", expiryDate: item.isPerishable ? expiryFrom(item.shelfLifeDays) : "" }));
  }

  function startCreate() {
    const po = purchaseOrders[0];
    setEditingId(null);
    setDetail(null);
    setForm({ purchaseOrderId: po?.id ?? "", receivedAt: localDateTime(), supplierDeliveryNo: "", supplierInvoiceNo: "", notes: "", items: po ? linesFromPo(po) : [] });
    setError("");
    setMode("editor");
  }

  function changePo(id: string) {
    const po = purchaseOrders.find((item) => item.id === id);
    setForm((current) => ({ ...current, purchaseOrderId: id, items: po ? linesFromPo(po) : [] }));
  }

  function updateLine(id: string, field: keyof EditableLine, value: string | number) {
    setForm((current) => ({ ...current, items: current.items.map((item) => item.id === id ? { ...item, [field]: value } : item) }));
  }

  async function openReceipt(id: string) {
    setLoading(true);
    setError("");
    try {
      const value = await api<ReceiptDetail>(`/goods-receipts/${id}`);
      setDetail(normalizeDetail(value));
      setVoidReason("");
      setShowVoidConfirmation(false);
      setMode("detail");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Detail Goods Receipt gagal dimuat.");
    } finally {
      setLoading(false);
    }
  }

  function startEdit() {
    if (!detail) return;
    const po = purchaseOrders.find((item) => item.id === detail.purchaseOrderId);
    const editableItems = detail.items.map((item) => {
      const source = po?.items.find((entry) => entry.id === item.purchaseOrderItemId);
      return { id: item.purchaseOrderItemId, purchaseOrderId: detail.purchaseOrderId, ingredientId: item.ingredientId, ingredientSku: item.ingredientSku, ingredientName: item.ingredientName, isPerishable: item.isPerishable, shelfLifeDays: null, purchaseUnitId: item.purchaseUnitId, purchaseUnitCode: item.purchaseUnitCode, purchaseUnitName: item.purchaseUnitName, quantityOrdered: Number(item.quantityOrdered), quantityReceived: source?.quantityReceived ?? 0, remainingQuantity: source?.remainingQuantity ?? Number(item.quantityOrdered), conversionToBase: source?.conversionToBase ?? Number(item.baseQuantity) / Number(item.quantityReceived), unitPrice: source?.unitPrice ?? Number(item.unitCostBase), lineTotal: source?.lineTotal ?? Number(item.unitCostBase) * Number(item.baseQuantity), unitCostBase: Number(item.unitCostBase), quantityToReceive: Number(item.quantityReceived), quantityRejected: Number(item.quantityRejected), rejectionReason: item.rejectionReason ?? "", storageLocationId: item.storageLocationId, batchNo: item.batchNo ?? "", expiryDate: item.expiryDate ?? "" };
    });
    setEditingId(detail.id);
    setForm({ purchaseOrderId: detail.purchaseOrderId, receivedAt: localDateTime(new Date(detail.receivedAt)), supplierDeliveryNo: detail.supplierDeliveryNo ?? "", supplierInvoiceNo: detail.supplierInvoiceNo ?? "", notes: detail.notes ?? "", items: editableItems });
    setMode("editor");
    setError("");
  }

  function validate() {
    if (!form.purchaseOrderId) return "Purchase order wajib dipilih.";
    if (!form.receivedAt) return "Waktu penerimaan wajib diisi.";
    if (!acceptedItems.length) return "Isi minimal satu kuantitas diterima.";
    if (acceptedItems.some((item) => Number(item.quantityToReceive) > Number(item.remainingQuantity) + 0.0005)) return "Kuantitas diterima tidak boleh melebihi sisa PO.";
    if (acceptedItems.some((item) => Number(item.quantityToReceive) + Number(item.quantityRejected) > Number(item.remainingQuantity) + 0.0005)) return "Total kuantitas diterima dan ditolak tidak boleh melebihi sisa PO.";
    if (acceptedItems.some((item) => !item.storageLocationId)) return "Lokasi penyimpanan setiap item wajib dipilih.";
    if (acceptedItems.some((item) => item.isPerishable && !item.batchNo.trim())) return "Nomor batch bahan mudah rusak wajib diisi.";
    if (acceptedItems.some((item) => item.isPerishable && !item.expiryDate)) return "Tanggal kedaluwarsa bahan mudah rusak wajib diisi.";
    if (acceptedItems.some((item) => Number(item.quantityRejected) > 0 && item.rejectionReason.trim().length < 3)) return "Alasan penolakan minimal 3 karakter.";
    return "";
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    const invalid = validate();
    if (invalid) { setError(invalid); return; }
    setSaving(true);
    setError("");
    try {
      const payload = { purchaseOrderId: form.purchaseOrderId, receivedAt: new Date(form.receivedAt).toISOString(), supplierDeliveryNo: form.supplierDeliveryNo.trim() || undefined, supplierInvoiceNo: form.supplierInvoiceNo.trim() || undefined, notes: form.notes.trim() || undefined, items: acceptedItems.map((item) => ({ purchaseOrderItemId: item.id, quantityReceived: Number(item.quantityToReceive), quantityRejected: Number(item.quantityRejected), rejectionReason: Number(item.quantityRejected) > 0 ? item.rejectionReason.trim() : undefined, storageLocationId: item.storageLocationId, batchNo: item.batchNo.trim() || undefined, expiryDate: item.expiryDate || undefined })) };
      const saved = await api<ReceiptDetail>(editingId ? `/goods-receipts/${editingId}` : "/goods-receipts", { method: editingId ? "PATCH" : "POST", body: JSON.stringify(payload) });
      await reload();
      setDetail(normalizeDetail(saved));
      setMode("detail");
      onNotify(editingId ? "Draft Goods Receipt berhasil diperbarui." : `${saved.receiptNo} berhasil dibuat sebagai draft.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Goods Receipt gagal disimpan.");
    } finally {
      setSaving(false);
    }
  }

  async function postReceipt() {
    if (!detail) return;
    setSaving(true); setError("");
    try {
      const posted = await api<ReceiptDetail>(`/goods-receipts/${detail.id}/post`, { method: "POST" });
      setDetail(normalizeDetail(posted));
      await reload();
      onNotify(`${posted.receiptNo} diposting. Batch dan saldo stok sudah bertambah.`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Goods Receipt gagal diposting."); }
    finally { setSaving(false); }
  }

  async function voidReceipt() {
    if (!detail) return;
    if (voidReason.trim().length < 3) { setError("Alasan void minimal 3 karakter."); return; }
    setSaving(true); setError("");
    try {
      const voided = await api<ReceiptDetail>(`/goods-receipts/${detail.id}/void`, { method: "POST", body: JSON.stringify({ reason: voidReason.trim() }) });
      setDetail(normalizeDetail(voided));
      await reload();
      setVoidReason("");
      setShowVoidConfirmation(false);
      onNotify(`${voided.receiptNo} di-void. Reversal stok berhasil dicatat.`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Goods Receipt gagal di-void."); }
    finally { setSaving(false); }
  }

  if (loading && !detail && !receipts.length) return <div className="gr-loading"><span/><strong>Memuat Goods Receipt…</strong></div>;

  return <div className="connected-gr">
    {error && <div className="gr-error" role="alert"><div><strong>Belum dapat diproses</strong><span>{error}</span></div><button onClick={() => setError("")}>×</button></div>}

    {mode === "list" && <>
      <div className="stats-grid gr-stats">
        <article className="stat-card"><div className="stat-icon green">GR</div><div><span>Total penerimaan</span><strong>{receipts.length}</strong><small>{receipts.filter((item) => item.status === "draft").length} masih draft</small></div></article>
        <article className="stat-card"><div className="stat-icon blue">＋</div><div><span>Posted ke stok</span><strong>{receipts.filter((item) => item.status === "posted").length}</strong><small>Ledger aktif dan dapat diaudit</small></div></article>
        <article className="stat-card"><div className="stat-icon gold">PO</div><div><span>PO menunggu barang</span><strong>{purchaseOrders.length}</strong><small>Sent atau diterima sebagian</small></div></article>
        <article className="stat-card"><div className="stat-icon purple">Rp</div><div><span>Nilai stok diterima</span><strong>{rupiah(receipts.filter((item) => item.status === "posted").reduce((sum, item) => sum + item.stockValue, 0))}</strong><small>Hanya Goods Receipt aktif</small></div></article>
      </div>
      <section className="panel gr-list-panel">
        <div className="gr-heading"><div><h2>Daftar Goods Receipt</h2><p>Penerimaan nyata dari PO hingga batch dan ledger stok.</p></div>{can(session, "goods_receipts.create") && <button className="primary-button" onClick={startCreate} disabled={!purchaseOrders.length}>＋ Catat Penerimaan</button>}</div>
        <div className="gr-toolbar"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari GR, PO, supplier, surat jalan, atau invoice…"/><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">Semua status</option>{Object.entries(STATUS_LABEL).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select><select value={outletFilter} onChange={(event) => setOutletFilter(event.target.value)}><option value="all">Semua outlet</option>{outletOptions.map(([id, name]) => <option value={id} key={id}>{name}</option>)}</select></div>
        <div className="table-wrap"><table className="gr-table"><thead><tr><th>Nomor GR</th><th>Purchase Order</th><th>Supplier</th><th>Diterima</th><th>Dokumen</th><th>Item</th><th>Nilai Stok</th><th>Status</th><th/></tr></thead><tbody>{visibleReceipts.map((receipt) => <tr key={receipt.id} onClick={() => void openReceipt(receipt.id)}><td><strong>{receipt.receiptNo}</strong><small>{receipt.outletName}</small></td><td><strong>{receipt.poNo}</strong><small>Update {formatDateTime(receipt.updatedAt)}</small></td><td>{receipt.supplierName}</td><td><span>{formatDateTime(receipt.receivedAt)}</span><small>{receipt.receivedByName}</small></td><td><span>{receipt.supplierDeliveryNo ?? "–"}</span><small>{receipt.supplierInvoiceNo ?? "Invoice belum diisi"}</small></td><td>{receipt.itemCount} item<small>{number(receipt.quantityReceived)} diterima</small></td><td><strong>{rupiah(receipt.stockValue)}</strong></td><td><span className={`gr-status gr-${receipt.status}`}>{STATUS_LABEL[receipt.status]}</span></td><td><button aria-label={`Buka ${receipt.receiptNo}`}>→</button></td></tr>)}</tbody></table>{!visibleReceipts.length && <div className="gr-empty"><strong>{receipts.length ? "Tidak ada data yang sesuai filter" : "Belum ada Goods Receipt"}</strong><span>{purchaseOrders.length ? "Buat draft dari PO yang sudah dikirim." : "Kirim Purchase Order terlebih dahulu agar dapat diterima."}</span></div>}</div>
        <div className="table-footer">Menampilkan {visibleReceipts.length} dari {receipts.length} Goods Receipt</div>
      </section>
    </>}

    {mode === "editor" && <form className="gr-editor" onSubmit={save}>
      <div className="gr-backbar"><button type="button" onClick={() => setMode(editingId ? "detail" : "list")}>← Kembali</button><div><span>{editingId ? "EDIT DRAFT" : "GOODS RECEIPT BARU"}</span><h2>{editingId ? detail?.receiptNo : "Catat barang yang tiba"}</h2></div><span className="gr-status gr-draft">Draft</span></div>
      <div className="gr-editor-grid">
        <section className="panel gr-form-card"><div className="panel-heading"><div><h2>Dokumen Penerimaan</h2><p>Referensi PO, waktu tiba, surat jalan, dan invoice</p></div></div><div className="gr-form-grid"><label className="full"><span>Purchase Order</span><select value={form.purchaseOrderId} onChange={(event) => changePo(event.target.value)} disabled={saving || Boolean(editingId)}><option value="">Pilih PO yang sudah dikirim</option>{purchaseOrders.map((po) => <option value={po.id} key={po.id}>{po.poNo} • {po.supplierName} • {po.outletName}</option>)}</select></label><label><span>Waktu diterima</span><input type="datetime-local" max={localDateTime()} value={form.receivedAt} onChange={(event) => setForm({ ...form, receivedAt: event.target.value })} disabled={saving}/></label><label><span>Outlet</span><input value={selectedPo?.outletName ?? detail?.outletName ?? "–"} disabled/></label><label><span>Nomor surat jalan</span><input value={form.supplierDeliveryNo} maxLength={80} onChange={(event) => setForm({ ...form, supplierDeliveryNo: event.target.value })} placeholder="Contoh: SJ-0827-0198" disabled={saving}/></label><label><span>Nomor invoice supplier</span><input value={form.supplierInvoiceNo} maxLength={80} onChange={(event) => setForm({ ...form, supplierInvoiceNo: event.target.value })} placeholder="Opsional" disabled={saving}/></label><label className="full"><span>Catatan penerimaan</span><textarea value={form.notes} maxLength={2000} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Kondisi kemasan, suhu, atau catatan pemeriksaan" disabled={saving}/></label></div></section>
        <aside className="panel gr-summary"><div className="panel-heading"><div><h2>Ringkasan Posting</h2><p>Stok hanya berubah setelah diposting</p></div></div><div className="gr-summary-lines"><div><span>Item diterima</span><strong>{acceptedItems.length}</strong></div><div><span>Qty diterima</span><strong>{number(formTotals.accepted)}</strong></div><div><span>Qty ditolak</span><strong>{number(formTotals.rejected)}</strong></div><div><span>Base quantity</span><strong>{number(formTotals.base)}</strong></div><div className="grand"><span>Nilai stok</span><strong>{rupiah(formTotals.value)}</strong></div></div><p>Draft tidak memengaruhi stok. Posting membuat batch dan ledger secara bersamaan.</p></aside>
      </div>
      <section className="panel gr-items-panel"><div className="gr-heading"><div><h2>Pemeriksaan Item</h2><p>Isi nol untuk menunda item ke penerimaan berikutnya.</p></div><span>{selectedPo?.supplierName ?? detail?.supplierName}</span></div><div className="table-wrap"><table className="gr-item-editor"><thead><tr><th>Bahan</th><th>Sisa PO</th><th>Diterima</th><th>Ditolak</th><th>Lokasi Stok</th><th>Batch</th><th>Kedaluwarsa</th><th>Nilai</th></tr></thead><tbody>{form.items.map((item) => <tr key={item.id} className={Number(item.quantityToReceive) <= 0 ? "skipped" : ""}><td><strong>{item.ingredientName}</strong><small>{item.ingredientSku} • {item.purchaseUnitCode}{item.isPerishable ? " • Perishable" : ""}</small>{Number(item.quantityRejected) > 0 && <input className="reject-reason" value={item.rejectionReason} maxLength={500} onChange={(event) => updateLine(item.id, "rejectionReason", event.target.value)} placeholder="Alasan barang ditolak"/>}</td><td><strong>{number(item.remainingQuantity)} {item.purchaseUnitCode}</strong><small>Dipesan {number(item.quantityOrdered)}</small></td><td><input type="number" min="0" max={item.remainingQuantity} step="0.001" value={item.quantityToReceive} onChange={(event) => updateLine(item.id, "quantityToReceive", Math.max(0, Number(event.target.value)))} disabled={saving}/></td><td><input type="number" min="0" step="0.001" value={item.quantityRejected} onChange={(event) => updateLine(item.id, "quantityRejected", Math.max(0, Number(event.target.value)))} disabled={saving || Number(item.quantityToReceive) <= 0}/></td><td><select value={item.storageLocationId} onChange={(event) => updateLine(item.id, "storageLocationId", event.target.value)} disabled={saving || Number(item.quantityToReceive) <= 0}><option value="">Pilih lokasi</option>{locations.filter((location) => location.outletId === (selectedPo?.outletId ?? detail?.outletId)).map((location) => <option value={location.id} key={location.id}>{location.name}</option>)}</select></td><td><input value={item.batchNo} maxLength={80} onChange={(event) => updateLine(item.id, "batchNo", event.target.value)} placeholder={item.isPerishable ? "Wajib" : "Opsional"} disabled={saving || Number(item.quantityToReceive) <= 0}/></td><td><input type="date" min={new Date().toISOString().slice(0, 10)} value={item.expiryDate} onChange={(event) => updateLine(item.id, "expiryDate", event.target.value)} disabled={saving || Number(item.quantityToReceive) <= 0}/></td><td><strong>{rupiah(Number(item.quantityToReceive) * Number(item.conversionToBase) * Number(item.unitCostBase))}</strong><small>{number(Number(item.quantityToReceive) * Number(item.conversionToBase))} base</small></td></tr>)}</tbody></table>{!form.items.length && <div className="gr-empty"><strong>PO tidak memiliki sisa item</strong><span>Pilih purchase order lain.</span></div>}</div><div className="gr-editor-actions"><button type="button" className="ghost-button" onClick={() => setMode(editingId ? "detail" : "list")}>Batal</button><button type="submit" className="primary-button" disabled={saving || (editingId ? !can(session, "goods_receipts.update") : !can(session, "goods_receipts.create"))}>{saving ? "Menyimpan…" : "Simpan Draft"}</button></div></section>
    </form>}

    {mode === "detail" && detail && <div className="gr-detail">
      <div className="gr-backbar"><button onClick={() => { setMode("list"); setDetail(null); }}>← Daftar GR</button><div><span>GOODS RECEIPT</span><h2>{detail.receiptNo}</h2></div><span className={`gr-status gr-${detail.status}`}>{STATUS_LABEL[detail.status]}</span></div>
      <div className="panel gr-detail-hero"><div><span>Supplier</span><strong>{detail.supplierName}</strong><small>{detail.supplierCode} • {detail.poNo}</small></div><div><span>Outlet & Penerima</span><strong>{detail.outletName}</strong><small>{detail.receivedByName} • {formatDateTime(detail.receivedAt)}</small></div><div><span>Nilai stok</span><strong>{rupiah(detail.totals.stockValue)}</strong><small>{detail.items.length} jenis item</small></div></div>
      <section className="panel gr-detail-items"><div className="panel-heading"><div><h2>Rincian Penerimaan</h2><p>Snapshot kuantitas, biaya, batch, dan lokasi penyimpanan.</p></div>{detail.status === "draft" && can(session, "goods_receipts.update") && <button className="secondary-button" onClick={startEdit}>Edit Draft</button>}</div><div className="table-wrap"><table><thead><tr><th>Bahan</th><th>Diterima</th><th>Ditolak</th><th>Base Qty</th><th>Biaya Base</th><th>Batch / Expiry</th><th>Lokasi</th><th>Nilai</th></tr></thead><tbody>{detail.items.map((item) => <tr key={item.id}><td><strong>{item.ingredientName}</strong><small>{item.ingredientSku}</small></td><td><strong>{number(item.quantityReceived)} {item.purchaseUnitCode}</strong><small>PO total {number(item.quantityOrdered)}</small></td><td>{number(item.quantityRejected)}<small>{item.rejectionReason ?? "Tidak ada penolakan"}</small></td><td>{number(item.baseQuantity)}</td><td>{rupiah(item.unitCostBase)}</td><td><strong>{item.batchNo ?? "–"}</strong><small>{item.expiryDate ? `Exp ${formatDate(item.expiryDate)}` : "Tanpa expiry"}</small></td><td>{item.storageLocationName}<small>{item.storageLocationCode}</small></td><td><strong>{rupiah(item.baseQuantity * item.unitCostBase)}</strong></td></tr>)}</tbody></table></div><div className="gr-detail-totals"><div><span>Qty diterima</span><strong>{number(detail.totals.acceptedPurchaseQuantity)}</strong></div><div><span>Qty ditolak</span><strong>{number(detail.totals.rejectedPurchaseQuantity)}</strong></div><div><span>Base quantity</span><strong>{number(detail.totals.baseQuantity)}</strong></div><div><span>Nilai stok</span><strong>{rupiah(detail.totals.stockValue)}</strong></div></div></section>
      <div className="gr-bottom-grid"><section className="panel gr-control"><div className="panel-heading"><div><h2>Kontrol Transaksi</h2><p>Alur normal selesai setelah penerimaan diposting ke stok.</p></div></div><div className="gr-control-body"><div className="gr-flow"><span className={detail.status !== "draft" ? "done" : "current"}>1<b>Draft</b></span><i/><span className={detail.status !== "draft" ? "current done" : ""}>2<b>Posted</b></span></div><div className="gr-doc-grid"><div><span>Surat jalan</span><strong>{detail.supplierDeliveryNo ?? "Belum diisi"}</strong></div><div><span>Invoice supplier</span><strong>{detail.supplierInvoiceNo ?? "Belum diisi"}</strong></div></div>{detail.notes && <p className="gr-note">{detail.notes}</p>}{detail.status === "draft" && can(session, "goods_receipts.post") && <button className="primary-button gr-post" onClick={() => void postReceipt()} disabled={saving}>{saving ? "Memposting…" : "Post ke Inventory"}</button>}{detail.status === "posted" && <div className="gr-posted-success" role="status"><span>✓</span><div><strong>Penerimaan selesai</strong><p>Stok sudah bertambah dan ledger penerimaan telah tercatat. Tidak ada tindakan lanjutan yang wajib dilakukan.</p></div></div>}{detail.status === "posted" && can(session, "goods_receipts.void") && <details className="gr-risk-actions"><summary><span>Tindakan Berisiko</span><small>Gunakan hanya jika penerimaan harus dibatalkan</small></summary><div className="gr-void-box"><p>Void akan membalik seluruh stok dari penerimaan ini dan meninggalkan jejak reversal pada ledger.</p><label><span>Alasan pembatalan</span><textarea value={voidReason} onChange={(event) => setVoidReason(event.target.value)} placeholder="Jelaskan alasan void, minimal 3 karakter"/></label><button className="danger-button" onClick={() => { if (voidReason.trim().length < 3) { setError("Alasan void minimal 3 karakter."); return; } setShowVoidConfirmation(true); }} disabled={saving}>Batalkan Penerimaan (Void)</button></div></details>}{detail.status === "void" && <div className="gr-voided-notice"><strong>Penerimaan telah dibatalkan</strong><p>Catatan asli dipertahankan dan stok telah dibalik melalui reversal ledger. Dokumen ini tidak lagi aktif.</p></div>}</div></section><section className="panel gr-history"><div className="panel-heading"><div><h2>Ledger & Audit Trail</h2><p>Jejak dokumen dan pergerakan stok.</p></div></div><div className="gr-movements">{detail.movements.map((item) => <div key={item.id}><span>{item.movementType === "receipt" ? "+" : "↶"}</span><div><strong>{item.movementNo}</strong><small>{item.movementType === "receipt" ? "Receipt ledger" : "Reversal ledger"} • {formatDateTime(item.movementAt)}</small></div><b>{item.status}</b></div>)}</div><div className="gr-history-list">{detail.history.map((item) => <div key={item.id}><span>✓</span><div><strong>{ACTION_LABEL[item.action] ?? item.action}</strong><small>{formatDateTime(item.occurredAt)} • {item.actorName ?? "Sistem"}</small>{item.reason && <p>{item.reason}</p>}</div></div>)}</div></section></div>
      {showVoidConfirmation && <div className="gr-dialog-backdrop" role="presentation" onMouseDown={() => !saving && setShowVoidConfirmation(false)}><div className="gr-confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="gr-void-title" aria-describedby="gr-void-description" onMouseDown={(event) => event.stopPropagation()}><span className="gr-dialog-icon">!</span><h3 id="gr-void-title">Batalkan penerimaan ini?</h3><p id="gr-void-description">Tindakan ini akan membalik stok senilai <strong>{rupiah(detail.totals.stockValue)}</strong>. Ledger reversal akan dibuat dan transaksi tidak dapat diposting ulang.</p><div className="gr-dialog-reason"><span>Alasan yang akan dicatat</span><strong>{voidReason.trim()}</strong></div><div className="gr-dialog-actions"><button className="secondary-button" onClick={() => setShowVoidConfirmation(false)} disabled={saving}>Kembali</button><button className="danger-button" onClick={() => void voidReceipt()} disabled={saving}>{saving ? "Membalik stok…" : "Ya, Void & Reversal Stok"}</button></div></div></div>}
    </div>}
  </div>;
}

function normalizeSummary(value: ReceiptSummary): ReceiptSummary { return { ...value, itemCount: Number(value.itemCount), quantityReceived: Number(value.quantityReceived), quantityRejected: Number(value.quantityRejected), stockValue: Number(value.stockValue) }; }
function normalizeDetail(value: ReceiptDetail): ReceiptDetail { return { ...normalizeSummary(value), poStatus: value.poStatus, supplierCode: value.supplierCode, receivedBy: value.receivedBy, notes: value.notes, createdAt: value.createdAt, items: value.items.map((item) => ({ ...item, quantityOrdered: Number(item.quantityOrdered), poQuantityReceived: Number(item.poQuantityReceived), quantityReceived: Number(item.quantityReceived), quantityRejected: Number(item.quantityRejected), baseQuantity: Number(item.baseQuantity), unitCostBase: Number(item.unitCostBase) })), totals: { acceptedPurchaseQuantity: Number(value.totals.acceptedPurchaseQuantity), rejectedPurchaseQuantity: Number(value.totals.rejectedPurchaseQuantity), baseQuantity: Number(value.totals.baseQuantity), stockValue: Number(value.totals.stockValue) }, history: value.history, movements: value.movements }; }
