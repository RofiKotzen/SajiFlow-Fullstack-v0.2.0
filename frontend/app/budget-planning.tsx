"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { ApiClient, AuthSession } from "./sajiflow-api";
import "./budget-planning.css";

type BudgetStatus = "draft" | "submitted" | "approved" | "rejected" | "closed";
type BudgetCategory = "purchase" | "operational" | "maintenance" | "marketing" | "other";

type Outlet = { id: string; code: string; name: string; isActive: boolean };
type BudgetSummary = {
  id: string;
  outletId: string;
  outletName: string;
  budgetCode: string;
  name: string;
  periodStart: string;
  periodEnd: string;
  status: BudgetStatus;
  totalAmount: number;
  updatedAt: string;
};
type BudgetLine = {
  id: string;
  category: BudgetCategory;
  description: string;
  plannedAmount: number;
  actualAmount: number;
  varianceAmount: number;
  warningThresholdPct: number;
};
type BudgetHistory = {
  id: string;
  fromStatus: BudgetStatus | null;
  toStatus: BudgetStatus;
  changedByName: string | null;
  reason: string | null;
  changedAt: string;
};
type BudgetDetail = BudgetSummary & {
  notes: string | null;
  createdAt: string;
  submittedAt: string | null;
  approvedAt: string | null;
  lines: BudgetLine[];
  history: BudgetHistory[];
};
type EditableLine = {
  key: string;
  category: BudgetCategory;
  description: string;
  plannedAmount: number;
  actualAmount: number;
  warningThresholdPct: number;
};
type BudgetForm = {
  outletId: string;
  name: string;
  month: string;
  notes: string;
  lines: EditableLine[];
};

const CATEGORY_OPTIONS: { value: BudgetCategory; label: string; color: string }[] = [
  { value: "purchase", label: "Pembelian", color: "#397865" },
  { value: "operational", label: "Operasional", color: "#b26e60" },
  { value: "maintenance", label: "Pemeliharaan", color: "#c8964b" },
  { value: "marketing", label: "Pemasaran", color: "#7094aa" },
  { value: "other", label: "Lainnya", color: "#78688d" },
];

const STATUS_LABEL: Record<BudgetStatus, string> = {
  draft: "Draft",
  submitted: "Menunggu Persetujuan",
  approved: "Disetujui",
  rejected: "Ditolak",
  closed: "Ditutup",
};

function newLine(category: BudgetCategory = "purchase"): EditableLine {
  return {
    key: crypto.randomUUID(),
    category,
    description: "",
    plannedAmount: 0,
    actualAmount: 0,
    warningThresholdPct: 80,
  };
}

function emptyForm(outletId = ""): BudgetForm {
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  return { outletId, name: "", month, notes: "", lines: [newLine()] };
}

function formFromBudget(budget: BudgetDetail): BudgetForm {
  return {
    outletId: budget.outletId,
    name: budget.name,
    month: budget.periodStart.slice(0, 7),
    notes: budget.notes ?? "",
    lines: budget.lines.map((line) => ({
      key: line.id,
      category: line.category,
      description: line.description,
      plannedAmount: Number(line.plannedAmount),
      actualAmount: Number(line.actualAmount),
      warningThresholdPct: Number(line.warningThresholdPct),
    })),
  };
}

function monthPeriod(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const lastDay = new Date(year, monthNumber, 0).getDate();
  return { periodStart: `${month}-01`, periodEnd: `${month}-${String(lastDay).padStart(2, "0")}` };
}

function rupiah(value: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value || 0);
}

function formatPeriod(start: string, end: string) {
  const startDate = new Date(`${start}T00:00:00`);
  const endDate = new Date(`${end}T00:00:00`);
  if (start.slice(0, 7) === end.slice(0, 7)) {
    return new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(startDate);
  }
  const format = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" });
  return `${format.format(startDate)} – ${format.format(endDate)}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function permission(session: AuthSession, code: string) {
  return session.user.permissions.includes(code);
}

export function ConnectedBudgetPlanning({ session, api, onNotify }: { session: AuthSession; api: ApiClient; onNotify: (message: string) => void }) {
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [budgets, setBudgets] = useState<BudgetSummary[]>([]);
  const [budget, setBudget] = useState<BudgetDetail | null>(null);
  const [form, setForm] = useState<BudgetForm>(() => emptyForm());
  const [isNew, setIsNew] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [actionReason, setActionReason] = useState("");

  const editable = isNew || budget?.status === "draft" || budget?.status === "rejected";
  const allocated = useMemo(() => form.lines.reduce((sum, line) => sum + Number(line.plannedAmount || 0), 0), [form.lines]);
  const actual = useMemo(() => form.lines.reduce((sum, line) => sum + Number(line.actualAmount || 0), 0), [form.lines]);
  const remaining = allocated - actual;
  const usage = allocated > 0 ? (actual / allocated) * 100 : 0;

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const [outletResult, budgetResult] = await Promise.allSettled([api<Outlet[]>("/outlets"), api<BudgetSummary[]>("/budgets")]);
        if (!active) return;
        if (budgetResult.status === "rejected") throw budgetResult.reason;
        const outletRows = outletResult.status === "fulfilled" ? outletResult.value : session.user.outletIds.map((id) => ({ id, code: id.slice(0, 8), name: `Outlet ${id.slice(0, 8)}`, isActive: true }));
        const budgetRows = budgetResult.value;
        const visibleOutlets = outletRows.filter((item) => item.isActive !== false);
        setOutlets(visibleOutlets);
        setBudgets(budgetRows);
        if (budgetRows[0]) {
          const detail = await api<BudgetDetail>(`/budgets/${budgetRows[0].id}`);
          if (!active) return;
          setBudget(detail);
          setForm(formFromBudget(detail));
        } else {
          setIsNew(true);
          setForm(emptyForm(visibleOutlets[0]?.id));
        }
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "Data anggaran gagal dimuat.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [api, session.user.outletIds]);

  async function openBudget(id: string) {
    if (!id) return;
    setLoading(true);
    setError("");
    try {
      const detail = await api<BudgetDetail>(`/budgets/${id}`);
      setBudget(detail);
      setForm(formFromBudget(detail));
      setIsNew(false);
      setActionReason("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Detail anggaran gagal dimuat.");
    } finally {
      setLoading(false);
    }
  }

  function startNew() {
    setBudget(null);
    setIsNew(true);
    setError("");
    setActionReason("");
    setForm(emptyForm(outlets[0]?.id));
  }

  function updateLine(key: string, field: keyof EditableLine, value: string | number) {
    setForm((current) => ({ ...current, lines: current.lines.map((line) => line.key === key ? { ...line, [field]: value } : line) }));
  }

  function addLine() {
    const nextCategory = CATEGORY_OPTIONS.find((option) => !form.lines.some((line) => line.category === option.value))?.value ?? "other";
    setForm((current) => ({ ...current, lines: [...current.lines, newLine(nextCategory)] }));
  }

  function removeLine(key: string) {
    setForm((current) => ({ ...current, lines: current.lines.filter((line) => line.key !== key) }));
  }

  function payload() {
    const period = monthPeriod(form.month);
    return {
      outletId: form.outletId,
      name: form.name.trim(),
      ...period,
      notes: form.notes.trim() || undefined,
      lines: form.lines.map(({ category, description, plannedAmount, warningThresholdPct }) => ({
        category,
        description: description.trim(),
        plannedAmount: Number(plannedAmount),
        warningThresholdPct: Number(warningThresholdPct),
      })),
    };
  }

  function validateForm() {
    if (!form.outletId) return "Outlet wajib dipilih.";
    if (form.name.trim().length < 2) return "Nama anggaran minimal 2 karakter.";
    if (!form.month) return "Periode anggaran wajib dipilih.";
    if (!form.lines.length) return "Tambahkan minimal satu alokasi.";
    if (form.lines.some((line) => line.description.trim().length < 2)) return "Setiap alokasi harus memiliki deskripsi minimal 2 karakter.";
    if (form.lines.some((line) => Number(line.plannedAmount) < 0)) return "Nominal alokasi tidak boleh negatif.";
    if (allocated <= 0) return "Total alokasi harus lebih dari nol.";
    return "";
  }

  async function save(event?: FormEvent) {
    event?.preventDefault();
    const validation = validateForm();
    if (validation) { setError(validation); return null; }
    setSaving(true);
    setError("");
    try {
      const saved = await api<BudgetDetail>(isNew ? "/budgets" : `/budgets/${budget?.id}`, {
        method: isNew ? "POST" : "PATCH",
        body: JSON.stringify(payload()),
      });
      setBudget(saved);
      setForm(formFromBudget(saved));
      setIsNew(false);
      const rows = await api<BudgetSummary[]>("/budgets");
      setBudgets(rows);
      onNotify(isNew ? "Rencana anggaran berhasil dibuat." : "Draft anggaran berhasil disimpan.");
      return saved;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Anggaran gagal disimpan.");
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function runAction(action: "submit" | "approve" | "reject" | "close") {
    if (!budget) return;
    if (action === "reject" && actionReason.trim().length < 3) {
      setError("Alasan penolakan minimal 3 karakter.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const updated = await api<BudgetDetail>(`/budgets/${budget.id}/${action}`, {
        method: "POST",
        body: JSON.stringify({ reason: actionReason.trim() || undefined }),
      });
      setBudget(updated);
      setForm(formFromBudget(updated));
      setActionReason("");
      const rows = await api<BudgetSummary[]>("/budgets");
      setBudgets(rows);
      onNotify({ submit: "Anggaran berhasil diajukan.", approve: "Anggaran berhasil disetujui.", reject: "Anggaran dikembalikan untuk revisi.", close: "Periode anggaran berhasil ditutup." }[action]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Status anggaran gagal diperbarui.");
    } finally {
      setSaving(false);
    }
  }

  if (loading && !budget && !isNew) return <div className="budget-api-state"><span className="budget-api-spinner"/><strong>Memuat rencana anggaran…</strong></div>;

  return <form onSubmit={save} className="connected-budget">
    <section className="budget-commandbar panel">
      <label><span>Rencana anggaran</span><select value={isNew ? "" : budget?.id ?? ""} onChange={(event) => void openBudget(event.target.value)} disabled={loading || saving}><option value="" disabled>{budgets.length ? "Pilih anggaran" : "Belum ada anggaran"}</option>{budgets.map((item) => <option value={item.id} key={item.id}>{item.budgetCode} — {item.name} ({STATUS_LABEL[item.status]})</option>)}</select></label>
      {permission(session, "budgets.create") && <button type="button" className="primary-button" onClick={startNew} disabled={saving}>＋ Buat Anggaran</button>}
    </section>

    {error && <div className="budget-api-error" role="alert"><strong>Belum dapat diproses</strong><span>{error}</span><button type="button" onClick={() => setError("")}>×</button></div>}

    <div className="budget-status-banner"><div><span className="budget-status-icon">Rp</span><div><strong>{isNew ? "Rencana anggaran baru" : budget?.name}</strong><small>{budget ? `${budget.budgetCode} • ${formatPeriod(budget.periodStart, budget.periodEnd)} • ${budget.outletName}` : "Lengkapi data dan alokasi anggaran"}</small></div></div><span className={`budget-state budget-state-${budget?.status ?? "draft"}`}>{isNew ? "Draft Baru" : STATUS_LABEL[budget!.status]}</span></div>

    <div className="stats-grid budget-stats">
      <article className="stat-card"><div className="stat-icon green">Rp</div><div><span>Total anggaran</span><strong>{rupiah(allocated)}</strong><small>Dihitung dari seluruh alokasi</small></div></article>
      <article className="stat-card"><div className="stat-icon gold">↗</div><div><span>Realisasi</span><strong>{rupiah(actual)}</strong><small>{usage.toFixed(1)}% dari anggaran</small></div></article>
      <article className="stat-card"><div className="stat-icon blue">◷</div><div><span>Status</span><strong>{isNew ? "Belum disimpan" : STATUS_LABEL[budget!.status]}</strong><small>{budget?.submittedAt ? `Diajukan ${formatDate(budget.submittedAt)}` : "Belum diajukan"}</small></div></article>
      <article className="stat-card"><div className="stat-icon purple">=</div><div><span>Sisa anggaran</span><strong>{rupiah(remaining)}</strong><small>Anggaran dikurangi realisasi</small></div></article>
    </div>

    <div className="budget-planning-grid">
      <section className="panel budget-form-panel">
        <div className="panel-heading"><div><h2>Pengaturan Anggaran</h2><p>Identitas, outlet, dan periode rencana</p></div><span className="edit-indicator">{editable ? "Dapat diedit" : "Terkunci"}</span></div>
        <div className="budget-form">
          <label className="full"><span>Nama rencana anggaran</span><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} disabled={!editable || saving} maxLength={150} placeholder="Contoh: Anggaran Operasional September 2026"/></label>
          <label><span>Outlet</span><select value={form.outletId} onChange={(event) => setForm({ ...form, outletId: event.target.value })} disabled={!editable || saving}><option value="">Pilih outlet</option>{outlets.map((outlet) => <option value={outlet.id} key={outlet.id}>{outlet.name} ({outlet.code})</option>)}</select></label>
          <label><span>Periode anggaran</span><input type="month" value={form.month} onChange={(event) => setForm({ ...form, month: event.target.value })} disabled={!editable || saving}/></label>
          <label className="full"><span>Catatan</span><textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} disabled={!editable || saving} maxLength={2000} placeholder="Tujuan, asumsi, atau batasan anggaran (opsional)"/></label>
        </div>
        {editable && <div className="budget-form-actions"><button type="submit" className="primary-button" disabled={saving || (isNew ? !permission(session, "budgets.create") : !permission(session, "budgets.update"))}>{saving ? "Menyimpan…" : isNew ? "Simpan Rencana" : "Simpan Draft"}</button></div>}
      </section>
      <aside className="panel allocation-overview">
        <div className="panel-heading"><div><h2>Ringkasan Alokasi</h2><p>Nilai selalu dihitung oleh sistem</p></div></div>
        <div className="allocation-total"><div className="allocation-ring connected-ring" style={{ "--budget-usage": `${Math.min(100, usage)}%` } as React.CSSProperties}><div><strong>{usage.toFixed(0)}%</strong><span>Terealisasi</span></div></div><div className="allocation-summary"><div><span>Dialokasikan</span><strong>{rupiah(allocated)}</strong></div><div><span>Realisasi</span><strong>{rupiah(actual)}</strong></div><div><span>Sisa</span><strong className={remaining < 0 ? "negative" : ""}>{rupiah(remaining)}</strong></div></div></div>
        <div className={`allocation-validation ${allocated > 0 ? "valid" : "warning"}`}><span>{allocated > 0 ? "✓" : "!"}</span><p>{allocated > 0 ? "Total header otomatis mengikuti jumlah alokasi. Realisasi tidak dapat diubah manual." : "Tambahkan nominal alokasi sebelum menyimpan atau mengajukan."}</p></div>
      </aside>
    </div>

    <section className="panel category-budget-panel">
      <div className="panel-heading"><div><h2>Alokasi Anggaran</h2><p>Satu baris mewakili kebutuhan dan kategori biaya</p></div>{editable && <button type="button" className="secondary-button" onClick={addLine} disabled={saving}>＋ Tambah Alokasi</button>}</div>
      <div className="table-wrap"><table className="budget-table connected-budget-table"><thead><tr><th>Kategori</th><th>Deskripsi</th><th>Rencana</th><th>Realisasi</th><th>Sisa</th><th>Ambang</th>{editable && <th/>}</tr></thead><tbody>{form.lines.map((line) => { const lineUsage = line.plannedAmount > 0 ? (line.actualAmount / line.plannedAmount) * 100 : 0; const category = CATEGORY_OPTIONS.find((item) => item.value === line.category)!; return <tr key={line.key}><td><div className="category-name"><i style={{ background: category.color }}/><select value={line.category} onChange={(event) => updateLine(line.key, "category", event.target.value as BudgetCategory)} disabled={!editable || saving}>{CATEGORY_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div></td><td><input className="budget-description-input" value={line.description} onChange={(event) => updateLine(line.key, "description", event.target.value)} disabled={!editable || saving} maxLength={200} placeholder="Kebutuhan anggaran"/></td><td><div className="table-money-input"><span>Rp</span><input type="number" min="0" step="1000" value={line.plannedAmount} onChange={(event) => updateLine(line.key, "plannedAmount", Math.max(0, Number(event.target.value)))} disabled={!editable || saving}/></div></td><td><b>{rupiah(line.actualAmount)}</b></td><td><b className={line.plannedAmount - line.actualAmount < 0 ? "negative" : ""}>{rupiah(line.plannedAmount - line.actualAmount)}</b></td><td><div className="threshold-input"><input type="number" min="0" max="100" step="1" value={line.warningThresholdPct} onChange={(event) => updateLine(line.key, "warningThresholdPct", Math.min(100, Math.max(0, Number(event.target.value))))} disabled={!editable || saving}/><span>%</span><small className={lineUsage >= line.warningThresholdPct ? "threshold-warn" : ""}>{lineUsage.toFixed(0)}% terpakai</small></div></td>{editable && <td><button type="button" className="budget-remove" onClick={() => removeLine(line.key)} disabled={form.lines.length === 1 || saving} aria-label={`Hapus ${line.description || "alokasi"}`}>×</button></td>}</tr>})}</tbody></table></div>
      <div className="category-budget-footer"><div><span>Total alokasi</span><strong>{rupiah(allocated)}</strong></div><div><span>Total realisasi</span><strong>{rupiah(actual)}</strong></div><div><span>Sisa keseluruhan</span><strong>{rupiah(remaining)}</strong></div></div>
    </section>

    {!isNew && budget && <div className="budget-bottom-grid">
      <section className="panel approval-panel"><div className="panel-heading"><div><h2>Kontrol Status</h2><p>Transisi mengikuti permission dan business rule</p></div></div><div className="budget-actions-panel"><div className="budget-current-state"><span>Status saat ini</span><strong>{STATUS_LABEL[budget.status]}</strong><small>{budget.updatedAt ? `Diperbarui ${formatDate(budget.updatedAt)}` : ""}</small></div>{budget.status !== "closed" && <label><span>Catatan tindakan</span><textarea value={actionReason} onChange={(event) => setActionReason(event.target.value)} disabled={saving} placeholder={budget.status === "submitted" ? "Alasan wajib saat menolak" : "Catatan opsional"}/></label>}<div className="budget-action-buttons">{["draft", "rejected"].includes(budget.status) && permission(session, "budgets.submit") && <button type="button" className="primary-button" onClick={() => void runAction("submit")} disabled={saving}>Ajukan Persetujuan</button>}{budget.status === "submitted" && permission(session, "budgets.approve") && <button type="button" className="primary-button" onClick={() => void runAction("approve")} disabled={saving}>Setujui</button>}{budget.status === "submitted" && permission(session, "budgets.reject") && <button type="button" className="danger-button" onClick={() => void runAction("reject")} disabled={saving}>Tolak & Revisi</button>}{budget.status === "approved" && permission(session, "budgets.close") && <button type="button" className="secondary-button" onClick={() => void runAction("close")} disabled={saving}>Tutup Periode</button>}</div></div></section>
      <section className="panel revision-panel"><div className="panel-heading"><div><h2>Riwayat Status</h2><p>Jejak perubahan tidak dapat diedit</p></div></div><div className="revision-list">{budget.history.length ? budget.history.map((item) => <div key={item.id}><span>{STATUS_LABEL[item.toStatus]}</span><div><strong>{item.fromStatus ? `${STATUS_LABEL[item.fromStatus]} → ${STATUS_LABEL[item.toStatus]}` : "Rencana anggaran dibuat"}</strong><small>{formatDate(item.changedAt)} • {item.changedByName ?? "User"}</small>{item.reason && <p>{item.reason}</p>}</div></div>) : <div className="budget-empty-history">Belum ada riwayat status.</div>}</div></section>
    </div>}
  </form>;
}
