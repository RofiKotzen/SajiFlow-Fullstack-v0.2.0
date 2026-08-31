import { BellRing, Volume2, VolumeX } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge, Btn, Card, Drawer, StatusBadge } from "@/components/ui";
import { KDS_TICKETS, KDS_STATIONS, type KdsTicket, type KdsStatus } from "@/lib/mock-data";

const URGENCY_STYLE: Record<string, string> = {
  normal: "text-mute", warning: "text-[oklch(0.52_0.11_70)]", overdue: "text-terra", rush: "text-terra",
};

export function KdsView() {
  const [tickets, setTickets] = useState<KdsTicket[]>(KDS_TICKETS);
  const [station, setStation] = useState("Semua");
  const [sound, setSound] = useState(true);
  const [selected, setSelected] = useState<KdsTicket | null>(null);

  const visible = tickets.filter((t) => station === "Semua" || t.station === station);
  const cols: { id: KdsStatus; label: string }[] = [
    { id: "baru", label: "Baru" }, { id: "diproses", label: "Diproses" }, { id: "siap", label: "Siap" },
  ];
  const nextStatus = (s: KdsStatus): KdsStatus | null => (s === "baru" ? "diproses" : s === "diproses" ? "siap" : null);

  const stationLoad = KDS_STATIONS.slice(1).map((s) => ({
    name: s, count: tickets.filter((t) => t.station === s && t.status !== "siap").length,
  }));

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            Kitchen Display
            <span className="flex items-center gap-1.5 rounded-full bg-olive-soft px-2 py-0.5 text-[11px] font-medium text-olive-deep">
              <span className="size-1.5 animate-pulse rounded-full bg-olive" /> Live
            </span>
          </h1>
          <p className="mt-1 text-[13px] text-mute">Shift pagi · 07:00–15:00 · 29 Agustus 2026</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 rounded-lg bg-black/[0.04] p-1">
            {KDS_STATIONS.map((s) => (
              <button key={s} onClick={() => setStation(s)} className={`rounded-md px-2.5 py-1.5 text-[12px] font-medium ${station === s ? "bg-card ring-1 ring-black/10" : "text-mute"}`}>{s}</button>
            ))}
          </div>
          <Btn variant="outline" className="px-2.5" onClick={() => setSound((s) => !s)} title="Suara notifikasi">
            {sound ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
          </Btn>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        {stationLoad.map((s) => (
          <Card key={s.name} className="flex items-center justify-between p-3.5">
            <span className="text-[13px] font-medium">{s.name}</span>
            <Badge tone={s.count >= 3 ? "terra" : s.count >= 2 ? "amber" : "olive"}>{s.count} tiket aktif</Badge>
          </Card>
        ))}
      </div>
      {tickets.some((t) => t.urgency === "overdue") && (
        <div className="mb-4 flex items-center gap-2 rounded-xl bg-terra/10 px-4 py-2.5 text-[13px] font-medium text-terra ring-1 ring-terra/20">
          <BellRing className="size-4" /> {tickets.filter((t) => t.urgency === "overdue").length} tiket melewati waktu tunggu — prioritaskan produksi.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {cols.map((col) => (
          <div key={col.id}>
            <div className="mb-2 flex items-center justify-between px-1">
              <h2 className="text-[13px] font-semibold uppercase tracking-wide text-mute">{col.label}</h2>
              <span className="mono text-[12px] text-mute">{visible.filter((t) => t.status === col.id).length}</span>
            </div>
            <div className="space-y-3">
              {visible.filter((t) => t.status === col.id).map((t) => (
                <Card key={t.id} className={`p-3.5 ${t.priority ? "ring-terra/40" : ""}`}>
                  <div className="flex items-center justify-between">
                    <button onClick={() => setSelected(t)} className="mono text-[13px] font-semibold hover:text-olive-deep">{t.orderNo}</button>
                    <span className={`mono text-[12px] font-medium ${URGENCY_STYLE[t.urgency]}`}>{t.elapsedMin} mnt</span>
                  </div>
                  <p className="mt-0.5 text-[11.5px] text-mute">{t.type}{t.table && ` · Meja ${t.table}`} · {t.station}{t.priority && <span className="ml-1 font-medium text-terra">· Prioritas</span>}</p>
                  <ul className="mt-2 space-y-1 text-[12.5px]">
                    {t.items.map((i, idx) => (
                      <li key={idx} className="flex gap-2">
                        <span className="mono shrink-0 font-semibold">{i.qty}×</span>
                        <span>{i.name}{i.note && <span className="block text-[11px] italic text-mute">“{i.note}”</span>}</span>
                      </li>
                    ))}
                  </ul>
                  {nextStatus(t.status) && (
                    <Btn
                      className="mt-3 w-full py-1.5 text-[12px]"
                      variant={t.status === "baru" ? "primary" : "outline"}
                      onClick={() => {
                        const next = nextStatus(t.status)!;
                        setTickets((p) => p.map((x) => (x.id === t.id ? { ...x, status: next } : x)));
                        toast.success(`${t.orderNo} → ${next}`);
                      }}
                    >
                      {t.status === "baru" ? "Mulai Proses" : "Tandai Siap"}
                    </Btn>
                  )}
                </Card>
              ))}
              {visible.filter((t) => t.status === col.id).length === 0 && (
                <p className="rounded-xl border border-dashed border-black/10 px-3 py-6 text-center text-[12px] text-mute">Tidak ada tiket</p>
              )}
            </div>
          </div>
        ))}
      </div>

      <Drawer open={!!selected} onClose={() => setSelected(null)} title={selected?.orderNo ?? ""} sub={selected ? `${selected.station} · ${selected.type}${selected.table ? ` · Meja ${selected.table}` : ""}` : undefined}>
        {selected && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <StatusBadge label={selected.urgency} />
              <span className={`mono text-[14px] font-semibold ${URGENCY_STYLE[selected.urgency]}`}>{selected.elapsedMin} menit</span>
            </div>
            <ul className="space-y-2">
              {selected.items.map((i, idx) => (
                <li key={idx} className="rounded-lg bg-cream px-3 py-2 text-[12.5px] ring-1 ring-black/5">
                  <span className="font-medium">{i.qty}× {i.name}</span>
                  {i.note && <p className="mt-0.5 text-[11.5px] italic text-mute">“{i.note}”</p>}
                </li>
              ))}
            </ul>
            {nextStatus(selected.status) && (
              <Btn className="w-full" onClick={() => {
                const next = nextStatus(selected.status)!;
                setTickets((p) => p.map((x) => (x.id === selected.id ? { ...x, status: next } : x)));
                setSelected({ ...selected, status: next });
              }}>
                {selected.status === "baru" ? "Mulai Proses" : "Tandai Siap"}
              </Btn>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}
