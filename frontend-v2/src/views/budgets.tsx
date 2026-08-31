import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Btn, Card, DataTable, Row, Cell, Field, TextInput, SelectInput, TextArea, StatusBadge, Progress, Modal } from "@/components/ui";
import { BUDGETS, OUTLETS, idr, type Budget, type BudgetLine } from "@/lib/mock-data";

const CATEGORIES: BudgetLine["category"][] = ["purchase", "operational", "maintenance", "marketing", "other"];

export function BudgetsView() {
  const [budgets, setBudgets] = useState<Budget[]>(BUDGETS);
  const [selId, setSelId] = useState(BUDGETS[0]!.id);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [outlet, setOutlet] = useState("KMG");
  const [period, setPeriod] = useState("2026-09");
  const [note, setNote] = useState("");
  const [lines, setLines] = useState<BudgetLine[]>([{ category: "purchase", desc: "", planned: 0, realized: 0, threshold: 80 }]);

  const sel = budgets.find((b) => b.id === selId);
  const editable = sel ? sel.status === "draft" || sel.status === "rejected" : false;

  const patch = (id: string, status: Budget["status"], action: string, msg: string) => {
    setBudgets((p) => p.map((b) => (b.id === id ? { ...b, status, history: [...b.history, { at: "2026-08-29 13:20", by: "Raka Aditya", action }] } : b)));
    toast.success(msg);
  };

  const createBudget = (e: React.FormEvent) => {
    e.preventDefault();
    if (lines.some((l) => l.planned < 0)) { toast.error("Rencana tidak boleh negatif"); return; }
    setSaving(true);
    setTimeout(() => {
      const id = `BDG-${period}-${outlet}`;
      setBudgets((p) => [{ id, name, outlet, period, status: "draft", note: note || undefined, lines, history: [{ at: "2026-08-29 13:20", by: "Raka Aditya", action: "Dibuat" }] }, ...p]);
      setSelId(id); setCreating(false); setSaving(false);
      toast.success("Draft anggaran disimpan");
    }, 400);
  };

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Budget Planning</h1>
          <p className="mt-1 text-[13px] text-mute">Rencana anggaran per outlet dan periode</p>
        </div>
        <div className="flex items-center gap-2">
          <SelectInput value={selId} onChange={(e) => setSelId(e.target.value)} className="w-64">
            {budgets.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </SelectInput>
          <Btn onClick={() => { setCreating(true); setName(""); setLines([{ category: "purchase", desc: "", planned: 0, realized: 0, threshold: 80 }]); }}>
            <Plus className="size-3.5" /> Buat Anggaran
          </Btn>
        </div>
      </div>

      {sel && (
        <div className="space-y-4">
          <Card className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-[15px] font-semibold tracking-tight">{sel.name}</h2>
                  <StatusBadge label={sel.status} />
                </div>
                <p className="mt-1 text-[12px] text-mute">
                  Periode {sel.period} · outlet {sel.outlet}{sel.note && ` · ${sel.note}`}
                </p>
              </div>
              <div className="flex gap-2">
                {sel.status === "draft" && <Btn onClick={() => patch(sel.id, "submitted", "Diajukan", "Anggaran diajukan untuk approval")}>Ajukan (Submit)</Btn>}
                {sel.status === "submitted" && (
                  <>
                    <Btn onClick={() => patch(sel.id, "approved", "Disetujui", "Anggaran disetujui")}>Approve</Btn>
                    <Btn variant="danger" onClick={() => patch(sel.id, "rejected", "Ditolak", "Anggaran ditolak")}>Reject</Btn>
                  </>
                )}
                {sel.status === "approved" && <Btn variant="outline" onClick={() => patch(sel.id, "closed", "Ditutup", "Anggaran ditutup")}>Tutup Anggaran</Btn>}
              </div>
            </div>
          </Card>

          <Card className="overflow-hidden">
            <DataTable head={["Kategori", "Deskripsi", "Rencana", "Realisasi", "Sisa", "Pemakaian", "Ambang"]} wide>
              {sel.lines.map((l, i) => {
                const pct = l.planned > 0 ? Math.round((l.realized / l.planned) * 100) : 0;
                const warn = pct > l.threshold;
                return (
                  <Row key={i}>
                    <Cell className="capitalize">{l.category}</Cell>
                    <Cell className="text-mute">{l.desc}</Cell>
                    <Cell className="mono text-right">{idr(l.planned)}</Cell>
                    <Cell className="mono text-right">{idr(l.realized)}</Cell>
                    <Cell className={`mono text-right ${l.planned - l.realized < 0 ? "text-terra" : ""}`}>{idr(l.planned - l.realized)}</Cell>
                    <Cell className="w-40">
                      <div className="flex items-center gap-2">
                        <div className="flex-1"><Progress value={pct} warn={warn} /></div>
                        <span className={`mono w-10 text-right text-[11px] ${warn ? "font-semibold text-terra" : "text-mute"}`}>{pct}%</span>
                      </div>
                    </Cell>
                    <Cell className="mono text-right text-mute">{l.threshold}%</Cell>
                  </Row>
                );
              })}
            </DataTable>
          </Card>

          <Card className="p-4">
            <h2 className="text-[14px] font-semibold tracking-tight">Riwayat Revisi & Status</h2>
            <ol className="mt-3 space-y-2 border-l border-black/10 pl-3">
              {sel.history.map((h, i) => (
                <li key={i} className="text-[12.5px]"><p className="font-medium">{h.action}</p><p className="text-mute">{h.at} · {h.by}</p></li>
              ))}
            </ol>
          </Card>
        </div>
      )}

      <Modal open={creating} onClose={() => setCreating(false)} title="Buat Anggaran" wide>
        <form onSubmit={createBudget} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nama rencana" required><TextInput value={name} onChange={(e) => setName(e.target.value)} required maxLength={150} placeholder="Anggaran September — Kemang" /></Field>
            <Field label="Periode" required hint="Dikonversi ke tanggal awal & akhir bulan"><TextInput type="month" value={period} onChange={(e) => setPeriod(e.target.value)} required /></Field>
            <Field label="Outlet" required>
              <SelectInput value={outlet} onChange={(e) => setOutlet(e.target.value)} required>
                {OUTLETS.filter((o) => o.active).map((o) => <option key={o.code} value={o.code}>{o.name}</option>)}
              </SelectInput>
            </Field>
          </div>
          <Field label="Catatan"><TextArea value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} /></Field>
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[12px] font-medium text-ink/80">Alokasi per kategori <span className="text-terra">*</span></p>
              <Btn type="button" variant="outline" className="px-2 py-1 text-[12px]" onClick={() => setLines((p) => [...p, { category: "operational", desc: "", planned: 0, realized: 0, threshold: 80 }])}>
                <Plus className="size-3" /> Tambah baris
              </Btn>
            </div>
            <div className="space-y-2">
              {lines.map((l, i) => (
                <div key={i} className="flex items-center gap-2">
                  <SelectInput className="w-32" value={l.category} onChange={(e) => setLines((p) => p.map((x, xi) => (xi === i ? { ...x, category: e.target.value as BudgetLine["category"] } : x)))}>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </SelectInput>
                  <TextInput className="flex-1" placeholder="Deskripsi" maxLength={200} value={l.desc} onChange={(e) => setLines((p) => p.map((x, xi) => (xi === i ? { ...x, desc: e.target.value } : x)))} />
                  <TextInput type="number" min={0} step={1000} className="w-32" placeholder="Rencana" value={l.planned || ""} onChange={(e) => setLines((p) => p.map((x, xi) => (xi === i ? { ...x, planned: Number(e.target.value) } : x)))} />
                  <TextInput type="number" min={0} max={100} className="w-20" placeholder="Ambang" value={l.threshold} onChange={(e) => setLines((p) => p.map((x, xi) => (xi === i ? { ...x, threshold: Math.min(100, Math.max(0, Number(e.target.value))) } : x)))} />
                  <Btn type="button" variant="ghost" className="px-2" disabled={lines.length === 1} title="Minimal satu baris alokasi" onClick={() => setLines((p) => p.filter((_, xi) => xi !== i))}>✕</Btn>
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t border-black/5 pt-3">
            <Btn type="button" variant="ghost" onClick={() => setCreating(false)}>Batal</Btn>
            <Btn type="submit" disabled={saving}>{saving ? "Menyimpan…" : "Simpan Draft"}</Btn>
          </div>
        </form>
      </Modal>
      {!editable && null}
    </div>
  );
}
