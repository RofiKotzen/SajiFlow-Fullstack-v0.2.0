import { ArrowRight } from "lucide-react";
import { useState } from "react";
import { Card, CardHeader, Badge, Btn, DataTable, Row, Cell, Progress, Drawer, StatusBadge } from "@/components/ui";
import { PURCHASE_ORDERS, SUPPLIERS, poTotals, supplierName, idr, type PurchaseOrder } from "@/lib/mock-data";

export function DashboardView({ goTo }: { goTo: (v: string) => void }) {
  const [selected, setSelected] = useState<PurchaseOrder | null>(null);
  const recent = PURCHASE_ORDERS.slice(0, 5);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-balance">Dasbor Pembelian</h1>
          <p className="mt-1 text-[13px] text-mute">Ringkasan operasional outlet aktif · 29 Agustus 2026</p>
        </div>
        <Btn onClick={() => goTo("orders")}>Buat PO Baru</Btn>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-4 xl:grid-cols-4">
        {[
          { label: "Nilai Pembelian Bulan Ini", value: "Rp 48,2 jt", sub: "▲ 12,4% vs Juli", tone: "text-olive" },
          { label: "PO Aktif", value: "18", sub: "6 menunggu kirim", tone: "text-terra" },
          { label: "Penerimaan Tertunda", value: "7", sub: "2 terlambat > 24 jam", tone: "text-mute" },
          { label: "Supplier Aktif", value: "24", sub: "3 baru bulan ini", tone: "text-olive" },
        ].map((k) => (
          <Card key={k.label} className="p-4">
            <p className="text-[12px] font-medium text-mute">{k.label}</p>
            <p className="mono mt-2 text-[26px] font-semibold tracking-tight">{k.value}</p>
            <p className={`mt-1 text-[11px] font-medium ${k.tone}`}>{k.sub}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.9fr_1fr]">
        <Card className="overflow-hidden">
          <CardHeader
            title="Purchase Order Terbaru"
            sub={`${PURCHASE_ORDERS.length} dokumen · 14 hari terakhir`}
            action={<button onClick={() => goTo("orders")} className="flex items-center gap-1 text-[12px] font-medium text-olive hover:text-olive-deep">Lihat semua <ArrowRight className="size-3" /></button>}
          />
          <DataTable head={["No. PO", "Supplier", "Tgl", "Nilai", "Status"]}>
            {recent.map((po) => (
              <Row key={po.no} onClick={() => setSelected(po)}>
                <Cell className="mono text-ink/90">{po.no}</Cell>
                <Cell>{supplierName(po.supplierCode)}</Cell>
                <Cell className="text-mute">{po.date.slice(5).split("-").reverse().join("/")}</Cell>
                <Cell className="mono text-right">{idr(poTotals(po).total)}</Cell>
                <Cell><StatusBadge label={po.status} /></Cell>
              </Row>
            ))}
          </DataTable>
        </Card>

        <div className="space-y-4">
          <Card className="p-4">
            <div className="flex items-baseline justify-between">
              <h2 className="text-[14px] font-semibold tracking-tight">Penggunaan Anggaran</h2>
              <span className="text-[12px] text-mute">Agustus</span>
            </div>
            <p className="mt-2 text-[13px] text-mute">
              Terpakai <span className="mono font-semibold text-ink">Rp 62,4 jt</span> dari <span className="mono">Rp 95 jt</span>
            </p>
            <div className="mt-2"><Progress value={66} /></div>
            <p className="mt-1.5 text-[11px] font-medium text-olive">66% terpakai · aman di bawah threshold 80%</p>
          </Card>

          <Card className="p-4">
            <h2 className="text-[14px] font-semibold tracking-tight">Item Perhatian</h2>
            <ul className="mt-3 space-y-2.5">
              {[
                { tone: "bg-terra", t: "Stok ayam potong menipis", s: "3 hari pemakaian · buat PO" },
                { tone: "bg-terra", t: "Susu segar habis", s: "BHN-004 · perlu penerimaan hari ini" },
                { tone: "bg-olive", t: "Harga kopi naik 8%", s: "PT Nusantara Rasa · review" },
                { tone: "bg-ink/30", t: "PO-2026-0513 belum diterima", s: "CV Sabun & Sapa · telat 1 hari" },
              ].map((a) => (
                <li key={a.t} className="flex items-start gap-2.5">
                  <span className={`mt-1.5 size-1.5 shrink-0 rounded-full ${a.tone}`} />
                  <div className="text-[12.5px] leading-snug">
                    <p className="font-medium">{a.t}</p>
                    <p className="mt-0.5 text-mute">{a.s}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-4">
            <h2 className="text-[14px] font-semibold tracking-tight">Performa Supplier</h2>
            <ul className="mt-3 space-y-3">
              {SUPPLIERS.filter((s) => s.active).slice(0, 4).map((s) => (
                <li key={s.code}>
                  <div className="flex items-center justify-between text-[12.5px]">
                    <span className="font-medium">{s.name}</span>
                    <span className={`mono ${s.perf < 85 ? "text-terra" : "text-mute"}`}>{s.perf}%</span>
                  </div>
                  <div className="mt-1.5"><Progress value={s.perf} warn={s.perf < 85} /></div>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      {/* Drawer detail PO */}
      <Drawer open={!!selected} onClose={() => setSelected(null)} title={selected?.no ?? ""} sub={selected ? supplierName(selected.supplierCode) : undefined}>
        {selected && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <StatusBadge label={selected.status} />
              <span className="mono text-[15px] font-semibold">{idr(poTotals(selected).total)}</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-[12.5px]">
              <div><p className="text-mute">Tanggal PO</p><p className="mt-0.5 font-medium">{selected.date}</p></div>
              <div><p className="text-mute">Ekspektasi kirim</p><p className="mt-0.5 font-medium">{selected.expected}</p></div>
              <div><p className="text-mute">Outlet</p><p className="mt-0.5 font-medium">{selected.outlet}</p></div>
              <div><p className="text-mute">Referensi</p><p className="mt-0.5 font-medium">{selected.ref ?? "—"}</p></div>
            </div>
            <div>
              <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-mute">Item</p>
              <ul className="space-y-2">
                {selected.items.map((it) => (
                  <li key={it.sku} className="flex items-center justify-between rounded-lg bg-cream px-3 py-2 text-[12.5px] ring-1 ring-black/5">
                    <span>{it.sku} × {it.qty}</span>
                    <span className="mono">{idr(it.qty * it.price)}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-mute">Histori</p>
              <ol className="space-y-2 border-l border-black/10 pl-3">
                {selected.history.map((h, i) => (
                  <li key={i} className="text-[12.5px]">
                    <p className="font-medium">{h.action}</p>
                    <p className="text-mute">{h.at} · {h.by}</p>
                  </li>
                ))}
              </ol>
            </div>
            <Btn className="w-full" onClick={() => { setSelected(null); goTo("orders"); }}>Buka di Purchase Order</Btn>
          </div>
        )}
      </Drawer>
    </div>
  );
}

export { Badge };
