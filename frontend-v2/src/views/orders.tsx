import { Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Btn, Card, CardHeader, DataTable, Row, Cell, Drawer, Field, TextInput, SelectInput, TextArea, StatusBadge, Modal } from "@/components/ui";
import { PURCHASE_ORDERS, SUPPLIERS, SUPPLIER_CATALOG, OUTLETS, poTotals, supplierName, ingredientName, idr, type PurchaseOrder, type POStatus, type POItem } from "@/lib/mock-data";

const STATUS_OPTS: (POStatus | "all")[] = ["all", "draft", "approved", "sent", "partially_received", "received", "closed", "cancelled"];

interface DraftItem extends POItem { key: number }

export function OrdersView() {
  const [orders, setOrders] = useState<PurchaseOrder[]>(PURCHASE_ORDERS);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<(typeof STATUS_OPTS)[number]>("all");
  const [outlet, setOutlet] = useState("all");
  const [selected, setSelected] = useState<PurchaseOrder | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);

  // form state
  const [fOutlet, setFOutlet] = useState("KMG");
  const [fSupplier, setFSupplier] = useState("SUP-01");
  const [fExpected, setFExpected] = useState("2026-09-05");
  const [fTax, setFTax] = useState(11);
  const [fOther, setFOther] = useState(0);
  const [fNote, setFNote] = useState("");
  const [fItems, setFItems] = useState<DraftItem[]>([{ key: 1, sku: "BHN-001", qty: 10, price: 42000 }]);

  const filtered = useMemo(
    () =>
      orders.filter((po) => {
        const hay = `${po.no} ${supplierName(po.supplierCode)} ${po.ref ?? ""}`.toLowerCase();
        return hay.includes(q.toLowerCase()) && (status === "all" || po.status === status) && (outlet === "all" || po.outlet === outlet);
      }),
    [orders, q, status, outlet]
  );

  const catalog = SUPPLIER_CATALOG.filter((c) => c.supplierCode === fSupplier && c.active);
  const subtotal = fItems.reduce((s, i) => s + i.qty * i.price, 0);
  const total = subtotal + (subtotal * fTax) / 100 + fOther;

  const patch = (no: string, next: Partial<PurchaseOrder>, action: string, msg: string) => {
    setOrders((prev) =>
      prev.map((po) => (po.no === no ? { ...po, ...next, history: [...po.history, { at: "2026-08-29 12:58", by: "Raka Aditya", action }] } : po))
    );
    setSelected((sel) => (sel && sel.no === no ? { ...sel, ...next } : sel));
    toast.success(msg);
  };

  const createPo = (e: React.FormEvent) => {
    e.preventDefault();
    if (fItems.some((i) => i.qty <= 0 || i.price < 0)) { toast.error("Quantity harus lebih dari nol dan harga tidak boleh negatif"); return; }
    setSaving(true);
    setTimeout(() => {
      const no = `PO-2026-0${515 + orders.length}`;
      setOrders((prev) => [
        { no, supplierCode: fSupplier, outlet: fOutlet, date: "2026-08-29", expected: fExpected, status: "draft", items: fItems.map(({ sku, qty, price }) => ({ sku, qty, price })), taxRate: fTax, otherCost: fOther, note: fNote, history: [{ at: "2026-08-29 12:58", by: "Raka Aditya", action: "Dibuat" }] },
        ...prev,
      ]);
      setSaving(false); setCreating(false);
      toast.success(`Draft ${no} disimpan`);
    }, 400);
  };

  const counts = {
    draft: orders.filter((o) => o.status === "draft").length,
    waiting: orders.filter((o) => o.status === "approved").length,
    sent: orders.filter((o) => o.status === "sent").length,
    receiving: orders.filter((o) => o.status === "partially_received").length,
  };

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Purchase Order</h1>
          <p className="mt-1 text-[13px] text-mute">Kelola pemesanan bahan ke supplier</p>
        </div>
        <Btn onClick={() => setCreating(true)}><Plus className="size-3.5" /> Buat PO</Btn>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { l: "Draft", v: counts.draft }, { l: "Menunggu Proses", v: counts.waiting },
          { l: "Dikirim", v: counts.sent }, { l: "Penerimaan", v: counts.receiving },
        ].map((c) => (
          <Card key={c.l} className="p-3.5">
            <p className="text-[12px] font-medium text-mute">{c.l}</p>
            <p className="mono mt-1.5 text-[22px] font-semibold">{c.v}</p>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden">
        <CardHeader
          title="Daftar Purchase Order"
          sub={`${filtered.length} dokumen`}
          action={
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-mute/70" />
                <TextInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nomor PO, supplier…" className="w-48 pl-8" />
              </div>
              <SelectInput value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className="w-36">
                {STATUS_OPTS.map((s) => <option key={s} value={s}>{s === "all" ? "Semua status" : s}</option>)}
              </SelectInput>
              <SelectInput value={outlet} onChange={(e) => setOutlet(e.target.value)} className="w-32">
                <option value="all">Semua outlet</option>
                {OUTLETS.map((o) => <option key={o.code} value={o.code}>{o.code}</option>)}
              </SelectInput>
            </div>
          }
        />
        <DataTable head={["No. PO", "Supplier", "Outlet", "Tanggal", "Ekspektasi", "Nilai", "Status"]} wide>
          {filtered.map((po) => (
            <Row key={po.no} onClick={() => setSelected(po)}>
              <Cell className="mono text-ink/90">{po.no}</Cell>
              <Cell>{supplierName(po.supplierCode)}</Cell>
              <Cell className="text-mute">{po.outlet}</Cell>
              <Cell className="text-mute">{po.date}</Cell>
              <Cell className="text-mute">{po.expected}</Cell>
              <Cell className="mono text-right">{idr(poTotals(po).total)}</Cell>
              <Cell><StatusBadge label={po.status} /></Cell>
            </Row>
          ))}
        </DataTable>
      </Card>

      {/* Drawer detail + workflow */}
      <Drawer open={!!selected} onClose={() => setSelected(null)} title={selected?.no ?? ""} sub={selected ? `${supplierName(selected.supplierCode)} · outlet ${selected.outlet}` : undefined}>
        {selected && (() => {
          const t = poTotals(selected);
          return (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <StatusBadge label={selected.status} />
                <span className="mono text-[16px] font-semibold">{idr(t.total)}</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-[12.5px]">
                <div><p className="text-mute">Tanggal PO</p><p className="mt-0.5 font-medium">{selected.date}</p></div>
                <div><p className="text-mute">Ekspektasi kirim</p><p className="mt-0.5 font-medium">{selected.expected}</p></div>
                <div><p className="text-mute">Pajak</p><p className="mt-0.5 font-medium">{selected.taxRate}%</p></div>
                <div><p className="text-mute">Biaya lain</p><p className="mono mt-0.5 font-medium">{idr(selected.otherCost)}</p></div>
              </div>
              <div>
                <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-mute">Item</p>
                <ul className="space-y-2">
                  {selected.items.map((it) => (
                    <li key={it.sku} className="rounded-lg bg-cream px-3 py-2 ring-1 ring-black/5">
                      <div className="flex items-center justify-between text-[12.5px]">
                        <span className="font-medium">{ingredientName(it.sku)}</span>
                        <span className="mono">{idr(it.qty * it.price)}</span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-mute">
                        {it.qty} × {idr(it.price)}
                        {typeof it.receivedQty === "number" && ` · diterima ${it.receivedQty}/${it.qty}`}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-lg bg-cream p-3 text-[12.5px] ring-1 ring-black/5">
                <div className="flex justify-between"><span className="text-mute">Subtotal</span><span className="mono">{idr(t.subtotal)}</span></div>
                <div className="mt-1 flex justify-between"><span className="text-mute">Pajak ({selected.taxRate}%)</span><span className="mono">{idr(t.tax)}</span></div>
                <div className="mt-1 flex justify-between"><span className="text-mute">Biaya lain</span><span className="mono">{idr(selected.otherCost)}</span></div>
                <div className="mt-2 flex justify-between border-t border-black/10 pt-2 font-semibold"><span>Total</span><span className="mono">{idr(t.total)}</span></div>
              </div>
              {selected.note && <p className="rounded-lg bg-olive-soft px-3 py-2 text-[12.5px] text-olive-deep">Catatan: {selected.note}</p>}
              <div>
                <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-mute">Histori</p>
                <ol className="space-y-2 border-l border-black/10 pl-3">
                  {selected.history.map((h, i) => (
                    <li key={i} className="text-[12.5px]"><p className="font-medium">{h.action}</p><p className="text-mute">{h.at} · {h.by}</p></li>
                  ))}
                </ol>
              </div>
              <div className="flex flex-wrap gap-2">
                {selected.status === "draft" && <Btn onClick={() => patch(selected.no, { status: "approved" }, "Disetujui", `${selected.no} disetujui`)}>Approve</Btn>}
                {selected.status === "approved" && <Btn onClick={() => patch(selected.no, { status: "sent" }, "Dikirim ke supplier", `${selected.no} dikirim ke supplier`)}>Tandai Terkirim</Btn>}
                {(selected.status === "sent" || selected.status === "partially_received") && (
                  <Btn variant="outline" onClick={() => { toast.success("Buat Goods Receipt dari PO ini di menu Goods Receipt"); }}>Buat Penerimaan</Btn>
                )}
                {(selected.status === "received" || selected.status === "partially_received") && (
                  <Btn variant="outline" onClick={() => patch(selected.no, { status: "closed" }, "Ditutup", `${selected.no} ditutup`)}>Tutup PO</Btn>
                )}
                {(selected.status === "draft" || selected.status === "approved") && (
                  <Btn variant="danger" onClick={() => patch(selected.no, { status: "cancelled" }, "Dibatalkan", `${selected.no} dibatalkan`)}>Batalkan</Btn>
                )}
              </div>
            </div>
          );
        })()}
      </Drawer>

      {/* Modal buat PO */}
      <Modal open={creating} onClose={() => setCreating(false)} title="Buat Purchase Order" wide>
        <form onSubmit={createPo} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Outlet" required>
              <SelectInput value={fOutlet} onChange={(e) => setFOutlet(e.target.value)} required>
                {OUTLETS.filter((o) => o.active).map((o) => <option key={o.code} value={o.code}>{o.name}</option>)}
              </SelectInput>
            </Field>
            <Field label="Supplier" required>
              <SelectInput value={fSupplier} onChange={(e) => { setFSupplier(e.target.value); setFItems([{ key: Date.now(), sku: "", qty: 1, price: 0 }]); }} required>
                {SUPPLIERS.filter((s) => s.active).map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
              </SelectInput>
            </Field>
            <Field label="Tanggal PO" required><TextInput type="date" defaultValue="2026-08-29" required /></Field>
            <Field label="Ekspektasi Kirim" required><TextInput type="date" value={fExpected} onChange={(e) => setFExpected(e.target.value)} required /></Field>
            <Field label="Tax rate (%)"><TextInput type="number" min={0} value={fTax} onChange={(e) => setFTax(Number(e.target.value))} /></Field>
            <Field label="Biaya lain (Rp)"><TextInput type="number" min={0} value={fOther} onChange={(e) => setFOther(Number(e.target.value))} /></Field>
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[12px] font-medium text-ink/80">Item <span className="text-terra">*</span></p>
              <Btn type="button" variant="outline" className="px-2 py-1 text-[12px]" onClick={() => setFItems((p) => [...p, { key: Date.now(), sku: "", qty: 1, price: 0 }])}>
                <Plus className="size-3" /> Tambah item
              </Btn>
            </div>
            <div className="space-y-2">
              {fItems.map((it, idx) => (
                <div key={it.key} className="flex items-center gap-2">
                  <SelectInput
                    className="flex-1"
                    value={it.sku}
                    required
                    onChange={(e) => {
                      const cat = catalog.find((c) => c.ingredientSku === e.target.value);
                      setFItems((p) => p.map((x, i) => (i === idx ? { ...x, sku: e.target.value, price: cat?.price ?? 0 } : x)));
                    }}
                  >
                    <option value="">Pilih bahan katalog…</option>
                    {catalog.map((c) => <option key={c.ingredientSku} value={c.ingredientSku}>{ingredientName(c.ingredientSku)} ({c.purchaseUnit})</option>)}
                  </SelectInput>
                  <TextInput type="number" min={1} className="w-20" placeholder="Qty" value={it.qty || ""} onChange={(e) => setFItems((p) => p.map((x, i) => (i === idx ? { ...x, qty: Number(e.target.value) } : x)))} />
                  <TextInput type="number" min={0} className="w-28" placeholder="Harga" value={it.price || ""} onChange={(e) => setFItems((p) => p.map((x, i) => (i === idx ? { ...x, price: Number(e.target.value) } : x)))} />
                  <Btn type="button" variant="ghost" className="px-2" disabled={fItems.length === 1} onClick={() => setFItems((p) => p.filter((_, i) => i !== idx))}>✕</Btn>
                </div>
              ))}
            </div>
          </div>
          <Field label="Catatan"><TextArea value={fNote} onChange={(e) => setFNote(e.target.value)} maxLength={500} /></Field>
          <div className="flex items-center justify-between border-t border-black/5 pt-3">
            <p className="text-[13px]">Total: <span className="mono font-semibold">{idr(total)}</span></p>
            <div className="flex gap-2">
              <Btn type="button" variant="ghost" onClick={() => setCreating(false)}>Batal</Btn>
              <Btn type="submit" disabled={saving}>{saving ? "Menyimpan…" : "Simpan Draft"}</Btn>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
