import { Minus, Plus, Search, Trash2, ReceiptText } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Btn, Card, Tabs, Badge, Drawer, Field, TextInput, SelectInput, TextArea, Modal, StatusBadge, EmptyState } from "@/components/ui";
import { POS_MENU, POS_TAX_RATE, POS_SERVICE_RATE, POS_PROMO_RATE, POS_TRANSACTIONS, ACTIVE_ORDERS, idr, type PosTransaction, type ActiveOrder } from "@/lib/mock-data";

interface CartItem { sku: string; name: string; price: number; qty: number }
type PayMethod = "Tunai" | "QRIS" | "Kartu" | "Split";

const CATEGORIES = ["Semua", "Makanan", "Minuman", "Dessert"];
const ORDER_TYPES = ["Dine-in", "Takeaway", "Delivery"];
const TABLES = ["M1", "M2", "M3", "M4", "M5", "M6", "M7", "M8", "M9"];

export function PosView() {
  const [tab, setTab] = useState("kasir");
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("Semua");
  const [orderType, setOrderType] = useState("Dine-in");
  const [table, setTable] = useState("M1");
  const [customer, setCustomer] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [promo, setPromo] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [method, setMethod] = useState<PayMethod>("Tunai");
  const [received, setReceived] = useState(0);
  const [note, setNote] = useState("");
  const [transactions, setTransactions] = useState<PosTransaction[]>(POS_TRANSACTIONS);
  const [orders, setOrders] = useState<ActiveOrder[]>(ACTIVE_ORDERS);
  const [trxFilter, setTrxFilter] = useState("");
  const [trxSelected, setTrxSelected] = useState<PosTransaction | null>(null);
  const [orderFilter, setOrderFilter] = useState("all");
  const [shiftOpen, setShiftOpen] = useState(false);

  const menu = useMemo(
    () => POS_MENU.filter((m) => (cat === "Semua" || m.category === cat) && m.name.toLowerCase().includes(q.toLowerCase())),
    [q, cat]
  );

  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const discount = promo ? (subtotal * POS_PROMO_RATE) / 100 : 0;
  const tax = ((subtotal - discount) * POS_TAX_RATE) / 100;
  const service = ((subtotal - discount) * POS_SERVICE_RATE) / 100;
  const total = subtotal - discount + tax + service;

  const setQty = (sku: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => (i.sku === sku ? { ...i, qty: i.qty + delta } : i))
        .filter((i) => i.qty > 0) // qty nol menghapus item
    );
  };
  const addItem = (sku: string, name: string, price: number) => {
    setCart((prev) => (prev.some((i) => i.sku === sku) ? prev.map((i) => (i.sku === sku ? { ...i, qty: i.qty + 1 } : i)) : [...prev, { sku, name, price, qty: 1 }]));
  };

  const confirmPayment = () => {
    if (cart.length === 0) return;
    if (method === "Tunai" && received < total) { toast.error("Uang diterima kurang dari total"); return; }
    const no = `TRX-${913 + transactions.length}`;
    setTransactions((p) => [{ no, time: "2026-08-29 13:10", type: orderType, table: orderType === "Dine-in" ? table : undefined, customer: customer || undefined, items: cart.map((c) => ({ name: c.name, qty: c.qty, price: c.price })), total, method, status: "paid" }, ...p]);
    setOrders((p) => [{ no: `ORD-0${454 + p.length}`, type: orderType, table: orderType === "Dine-in" ? table : undefined, items: cart.reduce((s, c) => s + c.qty, 0), total, status: "baru", since: "13:10" }, ...p]);
    setPayOpen(false); setCart([]); setPromo(false); setReceived(0); setNote("");
    toast.success(`Pembayaran ${no} berhasil · ${idr(total)}`);
  };

  const trxList = transactions.filter((t) => `${t.no} ${t.customer ?? ""} ${t.table ?? ""}`.toLowerCase().includes(trxFilter.toLowerCase()));
  const orderList = orders.filter((o) => orderFilter === "all" || o.status === orderFilter);
  const shiftTotal = transactions.filter((t) => t.status === "paid").reduce((s, t) => s + t.total, 0);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">POS</h1>
          <p className="mt-1 text-[13px] text-mute">Kasir, pesanan aktif, riwayat, dan shift</p>
        </div>
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { id: "kasir", label: "Kasir" },
            { id: "aktif", label: "Pesanan Aktif", count: orders.filter((o) => o.status !== "selesai").length },
            { id: "riwayat", label: "Riwayat Transaksi", count: transactions.length },
            { id: "shift", label: "Shift" },
          ]}
        />
      </div>

      {tab === "kasir" && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.6fr_1fr]">
          <div className="space-y-4">
            <Card className="p-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-40">
                  <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-mute/70" />
                  <TextInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari menu…" className="pl-8" />
                </div>
                {CATEGORIES.map((c) => (
                  <button key={c} onClick={() => setCat(c)} className={`rounded-lg px-3 py-2 text-[12px] font-medium transition-colors ${cat === c ? "bg-olive-soft text-olive-deep" : "text-mute hover:bg-black/5"}`}>{c}</button>
                ))}
              </div>
            </Card>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {menu.map((m) => (
                <button key={m.sku} onClick={() => addItem(m.sku, m.name, m.price)} className="rounded-xl bg-card p-3.5 text-left ring-1 ring-black/5 transition-shadow hover:ring-olive/40">
                  <p className="text-[13px] font-medium leading-snug">{m.name}</p>
                  <p className="mt-1 text-[11px] text-mute">{m.category}</p>
                  <p className="mono mt-2 text-[13px] font-semibold text-olive-deep">{idr(m.price)}</p>
                </button>
              ))}
            </div>
          </div>

          <Card className="flex h-fit flex-col p-4 xl:sticky xl:top-0">
            <div className="flex items-center justify-between">
              <h2 className="text-[14px] font-semibold tracking-tight">Keranjang</h2>
              <Badge tone={cart.length ? "olive" : "mute"}>{cart.reduce((s, i) => s + i.qty, 0)} item</Badge>
            </div>
            <div className="mt-3 space-y-2">
              <div className="flex gap-1 rounded-lg bg-black/[0.04] p-1">
                {ORDER_TYPES.map((t) => (
                  <button key={t} onClick={() => setOrderType(t)} className={`flex-1 rounded-md px-2 py-1.5 text-[12px] font-medium ${orderType === t ? "bg-card ring-1 ring-black/10" : "text-mute"}`}>{t}</button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {orderType === "Dine-in" && (
                  <SelectInput value={table} onChange={(e) => setTable(e.target.value)}>
                    {TABLES.map((t) => <option key={t} value={t}>Meja {t}</option>)}
                  </SelectInput>
                )}
                <TextInput value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="Pelanggan (opsional)" className={orderType === "Dine-in" ? "" : "col-span-2"} />
              </div>
            </div>
            <div className="mt-3 max-h-56 space-y-1.5 overflow-y-auto scrollbar-thin">
              {cart.length === 0 && <EmptyState title="Keranjang kosong" hint="Pilih menu untuk menambahkan item" />}
              {cart.map((i) => (
                <div key={i.sku} className="flex items-center gap-2 rounded-lg bg-cream px-2.5 py-2 ring-1 ring-black/5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12.5px] font-medium">{i.name}</p>
                    <p className="mono text-[11px] text-mute">{idr(i.price)}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setQty(i.sku, -1)} className="rounded-md p-1 ring-1 ring-black/10 hover:bg-black/5"><Minus className="size-3" /></button>
                    <span className="mono w-6 text-center text-[12.5px]">{i.qty}</span>
                    <button onClick={() => setQty(i.sku, 1)} className="rounded-md p-1 ring-1 ring-black/10 hover:bg-black/5"><Plus className="size-3" /></button>
                    <button onClick={() => setCart((p) => p.filter((x) => x.sku !== i.sku))} className="rounded-md p-1 text-terra hover:bg-terra/10"><Trash2 className="size-3" /></button>
                  </div>
                </div>
              ))}
            </div>
            <label className="mt-3 flex items-center justify-between rounded-lg bg-olive-soft px-3 py-2 text-[12.5px] font-medium text-olive-deep">
              <span>Promo member {POS_PROMO_RATE}%</span>
              <input type="checkbox" checked={promo} onChange={(e) => setPromo(e.target.checked)} className="accent-[oklch(0.52_0.065_128)]" />
            </label>
            <div className="mt-3 space-y-1 text-[12.5px]">
              <div className="flex justify-between"><span className="text-mute">Subtotal</span><span className="mono">{idr(subtotal)}</span></div>
              {discount > 0 && <div className="flex justify-between text-olive"><span>Diskon promo</span><span className="mono">−{idr(discount)}</span></div>}
              <div className="flex justify-between"><span className="text-mute">Pajak {POS_TAX_RATE}%</span><span className="mono">{idr(tax)}</span></div>
              <div className="flex justify-between"><span className="text-mute">Service {POS_SERVICE_RATE}%</span><span className="mono">{idr(service)}</span></div>
              <div className="flex justify-between border-t border-black/10 pt-2 text-[14px] font-semibold"><span>Total</span><span className="mono">{idr(total)}</span></div>
            </div>
            <Btn className="mt-3 w-full" disabled={cart.length === 0} onClick={() => setPayOpen(true)}>
              Bayar {cart.length > 0 && `· ${idr(total)}`}
            </Btn>
          </Card>
        </div>
      )}

      {tab === "aktif" && (
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-black/5 px-4 py-3">
            <h2 className="text-[14px] font-semibold tracking-tight">Pesanan Aktif</h2>
            <div className="flex gap-1 rounded-lg bg-black/[0.04] p-1">
              {["all", "baru", "diproses", "siap"].map((s) => (
                <button key={s} onClick={() => setOrderFilter(s)} className={`rounded-md px-2.5 py-1 text-[12px] font-medium capitalize ${orderFilter === s ? "bg-card ring-1 ring-black/10" : "text-mute"}`}>{s === "all" ? "Semua" : s}</button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
            {orderList.map((o) => (
              <Card key={o.no} className="p-3.5">
                <div className="flex items-center justify-between">
                  <span className="mono text-[13px] font-semibold">{o.no}</span>
                  <StatusBadge label={o.status} />
                </div>
                <p className="mt-1 text-[12px] text-mute">{o.type}{o.table && ` · Meja ${o.table}`} · {o.items} item · sejak {o.since}</p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="mono text-[13px] font-semibold">{idr(o.total)}</span>
                  {o.status !== "selesai" && (
                    <Btn variant="outline" className="px-2.5 py-1 text-[12px]" onClick={() => {
                      const next: ActiveOrder["status"] = o.status === "baru" ? "diproses" : o.status === "diproses" ? "siap" : "selesai";
                      setOrders((p) => p.map((x) => (x.no === o.no ? { ...x, status: next } : x)));
                      toast.success(`${o.no} → ${next}`);
                    }}>Lanjut</Btn>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </Card>
      )}

      {tab === "riwayat" && (
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-black/5 px-4 py-3">
            <h2 className="text-[14px] font-semibold tracking-tight">Riwayat Transaksi</h2>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-mute/70" />
              <TextInput value={trxFilter} onChange={(e) => setTrxFilter(e.target.value)} placeholder="Cari transaksi…" className="w-48 pl-8" />
            </div>
          </div>
          <div className="divide-y divide-black/5">
            {trxList.map((t) => (
              <button key={t.no} onClick={() => setTrxSelected(t)} className="flex w-full items-center gap-4 px-4 py-3 text-left hover:bg-black/[0.02]">
                <span className="mono w-24 text-[13px] font-medium">{t.no}</span>
                <span className="flex-1 text-[12.5px]">{t.type}{t.table && ` · ${t.table}`}{t.customer && ` · ${t.customer}`}</span>
                <Badge tone={t.status === "void" ? "terra" : "neutral"}>{t.method}</Badge>
                <span className="mono text-[13px] font-semibold">{idr(t.total)}</span>
                {t.status === "void" && <StatusBadge label="cancelled" />}
              </button>
            ))}
          </div>
        </Card>
      )}

      {tab === "shift" && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <Card className="p-4">
            <h2 className="text-[14px] font-semibold tracking-tight">Ringkasan Shift</h2>
            <p className="mt-0.5 text-[12px] text-mute">Shift pagi · dibuka 07:00 oleh Bima Pratama</p>
            <div className="mt-4 space-y-2.5 text-[13px]">
              {[
                ["Total penjualan", idr(shiftTotal)],
                ["Transaksi selesai", String(transactions.filter((t) => t.status === "paid").length)],
                ["Transaksi void", String(transactions.filter((t) => t.status === "void").length)],
                ["Tunai", idr(transactions.filter((t) => t.method === "Tunai" && t.status === "paid").reduce((s, t) => s + t.total, 0))],
                ["QRIS", idr(transactions.filter((t) => t.method === "QRIS" && t.status === "paid").reduce((s, t) => s + t.total, 0))],
                ["Kartu", idr(transactions.filter((t) => t.method === "Kartu" && t.status === "paid").reduce((s, t) => s + t.total, 0))],
              ].map(([l, v]) => (
                <div key={l} className="flex justify-between"><span className="text-mute">{l}</span><span className="mono font-medium">{v}</span></div>
              ))}
            </div>
            <Btn className="mt-4 w-full" onClick={() => setShiftOpen(true)}>Tutup Shift</Btn>
          </Card>
          <Card className="p-4">
            <h2 className="text-[14px] font-semibold tracking-tight">Riwayat Shift</h2>
            <ul className="mt-3 space-y-2 text-[12.5px]">
              {[
                ["Shift malam · 28 Agu", "Rp 8.940.000", "128 transaksi"],
                ["Shift pagi · 28 Agu", "Rp 5.120.000", "86 transaksi"],
                ["Shift malam · 27 Agu", "Rp 9.310.000", "141 transaksi"],
              ].map(([l, v, s]) => (
                <li key={l} className="flex items-center justify-between rounded-lg bg-cream px-3 py-2 ring-1 ring-black/5">
                  <span>{l}<span className="ml-2 text-mute">{s}</span></span>
                  <span className="mono font-medium">{v}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}

      {/* Payment sheet */}
      <Drawer open={payOpen} onClose={() => setPayOpen(false)} title="Pembayaran" sub={`Total ${idr(total)}`}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {(["Tunai", "QRIS", "Kartu", "Split"] as PayMethod[]).map((m) => (
              <button key={m} onClick={() => setMethod(m)} className={`rounded-xl px-3 py-3 text-[13px] font-medium ring-1 transition-colors ${method === m ? "bg-olive-soft text-olive-deep ring-olive/50" : "ring-black/10 hover:bg-black/5"}`}>{m}</button>
            ))}
          </div>
          {method === "Tunai" && (
            <Field label="Uang diterima" required>
              <TextInput type="number" min={0} value={received || ""} onChange={(e) => setReceived(Number(e.target.value))} placeholder="0" />
              {received >= total && <p className="mt-1 text-[12px] font-medium text-olive">Kembalian: {idr(received - total)}</p>}
            </Field>
          )}
          {method === "QRIS" && (
            <div className="rounded-xl bg-cream p-4 text-center ring-1 ring-black/5">
              <div className="mx-auto grid size-36 grid-cols-6 gap-1 p-2">
                {Array.from({ length: 36 }).map((_, i) => (
                  <span key={i} className={`rounded-[2px] ${(i * 7 + 3) % 3 ? "bg-ink/80" : "bg-transparent"}`} />
                ))}
              </div>
              <p className="mt-2 text-[12px] text-mute">Pindai untuk membayar {idr(total)}</p>
            </div>
          )}
          {method === "Kartu" && <p className="rounded-lg bg-cream px-3 py-2 text-[12.5px] text-mute ring-1 ring-black/5">Masukkan kartu debit/kredit ke terminal EDC.</p>}
          {method === "Split" && <p className="rounded-lg bg-cream px-3 py-2 text-[12.5px] text-mute ring-1 ring-black/5">Split payment: sebagian tunai, sebagian non-tunai dihitung di terminal.</p>}
          <Field label="Catatan"><TextArea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Catatan transaksi (opsional)" /></Field>
          <Btn className="w-full" onClick={confirmPayment} disabled={cart.length === 0 || (method === "Tunai" && received < total)}>
            Konfirmasi Pembayaran · {idr(total)}
          </Btn>
        </div>
      </Drawer>

      {/* Detail transaksi */}
      <Drawer open={!!trxSelected} onClose={() => setTrxSelected(null)} title={trxSelected?.no ?? ""} sub={trxSelected ? `${trxSelected.type}${trxSelected.table ? ` · Meja ${trxSelected.table}` : ""} · ${trxSelected.time}` : undefined}>
        {trxSelected && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Badge tone={trxSelected.status === "void" ? "terra" : "olive"}>{trxSelected.status === "void" ? "Void" : "Lunas"}</Badge>
              <span className="mono text-[15px] font-semibold">{idr(trxSelected.total)}</span>
            </div>
            <ul className="space-y-2">
              {trxSelected.items.map((i, idx) => (
                <li key={idx} className="flex justify-between rounded-lg bg-cream px-3 py-2 text-[12.5px] ring-1 ring-black/5">
                  <span>{i.name} × {i.qty}</span><span className="mono">{idr(i.price * i.qty)}</span>
                </li>
              ))}
            </ul>
            <div className="text-[12.5px] text-mute">Metode: {trxSelected.method}{trxSelected.customer && ` · ${trxSelected.customer}`}</div>
          </div>
        )}
      </Drawer>

      {/* Konfirmasi tutup shift */}
      <Modal open={shiftOpen} onClose={() => setShiftOpen(false)} title="Tutup Shift">
        <div className="space-y-4">
          <p className="text-[13px] text-mute">Ringkasan akan dikunci dan shift pagi ditutup. Total penjualan: <span className="mono font-semibold text-ink">{idr(shiftTotal)}</span>.</p>
          <div className="flex justify-end gap-2">
            <Btn variant="ghost" onClick={() => setShiftOpen(false)}>Batal</Btn>
            <Btn onClick={() => { setShiftOpen(false); toast.success("Shift ditutup. Ringkasan terkirim ke manajer."); }}>Konfirmasi Tutup Shift</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}
