import { Plus, Search, TriangleAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Btn, Card, CardHeader, DataTable, Row, Cell, Drawer, Field, TextInput, SelectInput, TextArea, StatusBadge, Modal } from "@/components/ui";
import { GOODS_RECEIPTS, PURCHASE_ORDERS, OUTLETS, supplierName, ingredientName, type GoodsReceipt } from "@/lib/mock-data";

export function ReceiptsView() {
  const [receipts, setReceipts] = useState<GoodsReceipt[]>(GOODS_RECEIPTS);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [outlet, setOutlet] = useState("all");
  const [selected, setSelected] = useState<GoodsReceipt | null>(null);
  const [creating, setCreating] = useState(false);
  const [voiding, setVoiding] = useState<GoodsReceipt | null>(null);
  const [voidReason, setVoidReason] = useState("");
  const [grPo, setGrPo] = useState("");
  const [grNote, setGrNote] = useState("");
  const [grDeliveryNote, setGrDeliveryNote] = useState("");

  const receivablePOs = PURCHASE_ORDERS.filter((p) => p.status === "sent" || p.status === "partially_received" || p.status === "approved");
  const chosenPo = PURCHASE_ORDERS.find((p) => p.no === grPo);

  const filtered = useMemo(
    () =>
      receipts.filter((gr) => {
        const hay = `${gr.no} ${gr.poNo} ${supplierName(gr.supplierCode)}`.toLowerCase();
        return hay.includes(q.toLowerCase()) && (status === "all" || gr.status === status) && (outlet === "all" || gr.outlet === outlet);
      }),
    [receipts, q, status, outlet]
  );

  const createGr = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chosenPo) return;
    const no = `GR-2026-0${213 + receipts.length}`;
    setReceipts((p) => [
      {
        no, poNo: chosenPo.no, supplierCode: chosenPo.supplierCode, outlet: chosenPo.outlet,
        receivedAt: "2026-08-29 13:00", deliveryNote: grDeliveryNote || undefined, status: "draft", note: grNote || undefined,
        items: chosenPo.items.map((i) => ({ sku: i.sku, received: i.qty - (i.receivedQty ?? 0), rejected: 0, unit: "KG", location: "Gudang Kering" })),
        history: [{ at: "2026-08-29 13:00", by: "Raka Aditya", action: "Dibuat" }],
      },
      ...p,
    ]);
    setCreating(false); setGrPo(""); setGrNote(""); setGrDeliveryNote("");
    toast.success(`Draft ${no} disimpan`);
  };

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Goods Receipt</h1>
          <p className="mt-1 text-[13px] text-mute">Pencatatan penerimaan barang dari purchase order</p>
        </div>
        <Btn onClick={() => setCreating(true)}><Plus className="size-3.5" /> Buat Penerimaan</Btn>
      </div>

      <Card className="overflow-hidden">
        <CardHeader
          title="Daftar Penerimaan"
          sub={`${filtered.length} dokumen`}
          action={
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-mute/70" />
                <TextInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nomor GR, PO…" className="w-44 pl-8" />
              </div>
              <SelectInput value={status} onChange={(e) => setStatus(e.target.value)} className="w-32">
                <option value="all">Semua status</option>
                <option value="draft">Draft</option><option value="posted">Posted</option><option value="void">Void</option>
              </SelectInput>
              <SelectInput value={outlet} onChange={(e) => setOutlet(e.target.value)} className="w-32">
                <option value="all">Semua outlet</option>
                {OUTLETS.map((o) => <option key={o.code} value={o.code}>{o.code}</option>)}
              </SelectInput>
            </div>
          }
        />
        <DataTable head={["No. GR", "Purchase Order", "Supplier", "Diterima", "Item", "Status"]} wide>
          {filtered.map((gr) => (
            <Row key={gr.no} onClick={() => setSelected(gr)}>
              <Cell className="mono text-ink/90">{gr.no}</Cell>
              <Cell className="mono text-mute">{gr.poNo}</Cell>
              <Cell>{supplierName(gr.supplierCode)}</Cell>
              <Cell className="text-mute">{gr.receivedAt}</Cell>
              <Cell className="mono">{gr.items.reduce((s, i) => s + i.received, 0)} diterima{gr.items.some((i) => i.rejected > 0) && ` · ${gr.items.reduce((s, i) => s + i.rejected, 0)} ditolak`}</Cell>
              <Cell><StatusBadge label={gr.status} /></Cell>
            </Row>
          ))}
        </DataTable>
      </Card>

      <Drawer open={!!selected} onClose={() => setSelected(null)} title={selected?.no ?? ""} sub={selected ? `${selected.poNo} · ${supplierName(selected.supplierCode)}` : undefined}>
        {selected && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <StatusBadge label={selected.status} />
              <span className="text-[12px] text-mute">{selected.receivedAt}</span>
            </div>
            {selected.voidReason && (
              <p className="flex items-start gap-2 rounded-lg bg-terra/10 px-3 py-2 text-[12.5px] text-terra">
                <TriangleAlert className="mt-0.5 size-3.5 shrink-0" /> Void: {selected.voidReason}
              </p>
            )}
            <div className="grid grid-cols-2 gap-3 text-[12.5px]">
              <div><p className="text-mute">Surat jalan</p><p className="mt-0.5 font-medium">{selected.deliveryNote ?? "—"}</p></div>
              <div><p className="text-mute">Outlet</p><p className="mt-0.5 font-medium">{selected.outlet}</p></div>
            </div>
            <div>
              <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-mute">Item diterima</p>
              <ul className="space-y-2">
                {selected.items.map((it) => (
                  <li key={it.sku} className="rounded-lg bg-cream px-3 py-2 ring-1 ring-black/5">
                    <div className="flex items-center justify-between text-[12.5px]">
                      <span className="font-medium">{ingredientName(it.sku)}</span>
                      <span className="mono">{it.received} {it.unit}{it.rejected > 0 && <span className="text-terra"> · {it.rejected} ditolak</span>}</span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-mute">
                      {it.location}{it.batch && ` · batch ${it.batch}`}{it.expiry && ` · exp ${it.expiry}`}
                      {it.rejectReason && <span className="text-terra"> · {it.rejectReason}</span>}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-mute">Histori</p>
              <ol className="space-y-2 border-l border-black/10 pl-3">
                {selected.history.map((h, i) => (
                  <li key={i} className="text-[12.5px]"><p className="font-medium">{h.action}</p><p className="text-mute">{h.at} · {h.by}</p></li>
                ))}
              </ol>
            </div>
            <div className="flex flex-wrap gap-2">
              {selected.status === "draft" && (
                <Btn onClick={() => {
                  setReceipts((p) => p.map((g) => g.no === selected.no ? { ...g, status: "posted", history: [...g.history, { at: "2026-08-29 13:05", by: "Raka Aditya", action: "Diposting ke inventory" }] } : g));
                  setSelected({ ...selected, status: "posted" });
                  toast.success(`${selected.no} diposting ke inventory`);
                }}>Posting ke Inventory</Btn>
              )}
              {selected.status === "posted" && <Btn variant="danger" onClick={() => { setVoiding(selected); setVoidReason(""); }}>Void Penerimaan</Btn>}
            </div>
          </div>
        )}
      </Drawer>

      <Modal open={creating} onClose={() => setCreating(false)} title="Buat Penerimaan Barang" wide>
        <form onSubmit={createGr} className="space-y-4">
          <Field label="Purchase Order" required hint="Hanya PO yang masih memiliki quantity tersisa">
            <SelectInput value={grPo} onChange={(e) => setGrPo(e.target.value)} required>
              <option value="">Pilih PO receivable…</option>
              {receivablePOs.map((p) => <option key={p.no} value={p.no}>{p.no} — {supplierName(p.supplierCode)}</option>)}
            </SelectInput>
          </Field>
          {chosenPo && (
            <div className="rounded-lg bg-cream p-3 ring-1 ring-black/5">
              <p className="mb-1.5 text-[12px] font-medium text-ink/80">Item receivable</p>
              <ul className="space-y-1 text-[12.5px]">
                {chosenPo.items.map((i) => (
                  <li key={i.sku} className="flex justify-between">
                    <span>{ingredientName(i.sku)}</span>
                    <span className="mono text-mute">sisa {i.qty - (i.receivedQty ?? 0)} dari {i.qty}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Waktu diterima" required><TextInput type="datetime-local" defaultValue="2026-08-29T13:00" required /></Field>
            <Field label="Surat jalan supplier"><TextInput value={grDeliveryNote} onChange={(e) => setGrDeliveryNote(e.target.value)} placeholder="Opsional" /></Field>
          </div>
          <Field label="Catatan"><TextArea value={grNote} onChange={(e) => setGrNote(e.target.value)} /></Field>
          <div className="flex justify-end gap-2 border-t border-black/5 pt-3">
            <Btn type="button" variant="ghost" onClick={() => setCreating(false)}>Batal</Btn>
            <Btn type="submit" disabled={!grPo}>Simpan Draft</Btn>
          </div>
        </form>
      </Modal>

      {/* Konfirmasi void */}
      <Modal open={!!voiding} onClose={() => setVoiding(null)} title="Void Penerimaan">
        <div className="space-y-4">
          <p className="flex items-start gap-2 rounded-lg bg-terra/10 px-3 py-2 text-[12.5px] text-terra">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            Void akan membuat reversal movement dan mengembalikan stok. Aksi ini tidak dapat dibatalkan.
          </p>
          <Field label="Alasan void" required>
            <TextArea value={voidReason} onChange={(e) => setVoidReason(e.target.value)} required placeholder="Tuliskan alasan void…" />
          </Field>
          <div className="flex justify-end gap-2">
            <Btn variant="ghost" onClick={() => setVoiding(null)}>Batal</Btn>
            <Btn
              variant="danger"
              disabled={!voidReason.trim()}
              onClick={() => {
                if (!voiding) return;
                setReceipts((p) => p.map((g) => g.no === voiding.no ? { ...g, status: "void", voidReason, history: [...g.history, { at: "2026-08-29 13:06", by: "Raka Aditya", action: "Void (reversal)" }] } : g));
                setVoiding(null); setSelected(null);
                toast.success(`${voiding.no} di-void dengan reversal`);
              }}
            >
              Konfirmasi Void
            </Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}
