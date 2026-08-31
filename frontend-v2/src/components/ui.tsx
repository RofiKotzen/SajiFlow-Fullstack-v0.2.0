import { X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// ---------- Card ----------
export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("rounded-xl bg-card ring-1 ring-black/5", className)}>{children}</div>;
}

export function CardHeader({ title, sub, action }: { title: string; sub?: string | undefined; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-black/5 px-4 py-3">
      <div>
        <h2 className="text-[14px] font-semibold tracking-tight">{title}</h2>
        {sub && <p className="mt-0.5 text-[11px] text-mute">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

// ---------- Button ----------
export function Btn({
  variant = "primary", className, ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" | "outline" }) {
  const styles = {
    primary: "bg-olive text-cream ring-1 ring-olive-deep/40 hover:bg-olive-deep disabled:opacity-40",
    ghost: "text-ink/70 hover:bg-black/5",
    outline: "ring-1 ring-black/10 text-ink/80 hover:bg-black/5 bg-card",
    danger: "bg-terra/10 text-terra ring-1 ring-terra/30 hover:bg-terra/15",
  } as const;
  return (
    <button
      className={cn("inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors disabled:cursor-not-allowed", styles[variant], className)}
      {...props}
    />
  );
}

// ---------- Badge ----------
const badgeTones = {
  olive: "bg-olive-soft text-olive-deep",
  terra: "bg-terra/15 text-terra",
  neutral: "bg-black/5 text-ink/70",
  mute: "bg-black/5 text-mute",
  amber: "bg-[oklch(0.72_0.11_75/15%)] text-[oklch(0.52_0.11_70)]",
} as const;
export type BadgeTone = keyof typeof badgeTones;

export function Badge({ tone = "neutral", children, className }: { tone?: BadgeTone; children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap", badgeTones[tone], className)}>
      {children}
    </span>
  );
}

export function StatusBadge({ label }: { label: string }) {
  const map: Record<string, BadgeTone> = {
    Diterima: "olive", received: "olive", approved: "olive", Disetujui: "olive", Aktif: "olive", active: "olive", posted: "olive", safe: "olive", approved_recipe: "olive", Siap: "olive",
    Tertunda: "terra", pending: "terra", rejected: "terra", Ditolak: "terra", void: "terra", out: "terra", critical: "terra", overdue: "terra", suspended: "terra", archived: "terra", Diarsipkan: "terra",
    Dikirim: "neutral", sent: "neutral", partially_received: "neutral", "Diterima sebagian": "neutral", submitted: "neutral", Diajukan: "neutral", warning: "amber", low: "amber", Menunggu: "amber", rush: "amber",
    draft: "mute", Draft: "mute", closed: "mute", Ditutup: "mute", cancelled: "mute", Dibatalkan: "mute", inactive: "mute", normal: "neutral",
  };
  const labels: Record<string, string> = {
    draft: "Draft", approved: "Disetujui", sent: "Dikirim", partially_received: "Diterima Sebagian", received: "Diterima", closed: "Ditutup", cancelled: "Dibatalkan",
    posted: "Posted", void: "Void", submitted: "Diajukan", rejected: "Ditolak", active: "Aktif", archived: "Diarsipkan", suspended: "Ditangguhkan",
    out: "Habis", critical: "Kritis", low: "Rendah", safe: "Aman", normal: "Normal", warning: "Perhatian", overdue: "Terlambat", rush: "Rush",
  };
  return <Badge tone={map[label] ?? "neutral"}>{labels[label] ?? label}</Badge>;
}

// ---------- Progress ----------
export function Progress({ value, warn }: { value: number; warn?: boolean }) {
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-black/10">
      <div className={cn("h-full rounded-full", warn ? "bg-terra" : "bg-olive")} style={{ width: `${Math.min(100, value)}%` }} />
    </div>
  );
}

// ---------- Form primitives ----------
export function Field({ label, hint, children, required }: { label: string; hint?: string; children: ReactNode; required?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[12px] font-medium text-ink/80">
        {label} {required && <span className="text-terra">*</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-mute">{hint}</span>}
    </label>
  );
}

export const inputCls =
  "h-9 w-full rounded-lg bg-cream px-3 text-[13px] ring-1 ring-black/10 placeholder:text-mute/60 focus:outline-none focus:ring-2 focus:ring-olive/40 disabled:opacity-50";

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={inputCls} {...props} />;
}

export function SelectInput({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(inputCls, "appearance-none pr-8", className)} {...props}>
      {children}
    </select>
  );
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(inputCls, "h-auto min-h-20 py-2")} {...props} />;
}

// ---------- Modal ----------
export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/30" onClick={onClose} />
      <div className={cn("relative max-h-[90vh] w-full overflow-y-auto rounded-2xl bg-card p-5 ring-1 ring-black/10 shadow-xl", wide ? "max-w-2xl" : "max-w-md")}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-[15px] font-semibold tracking-tight">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-mute hover:bg-black/5"><X className="size-4" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ---------- Drawer ----------
export function Drawer({ open, onClose, title, sub, children }: { open: boolean; onClose: () => void; title: string; sub?: string | undefined; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-ink/30" onClick={onClose} />
      <div className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-card ring-1 ring-black/10 shadow-xl">
        <div className="flex items-center justify-between border-b border-black/5 px-5 py-4">
          <div>
            <h3 className="text-[15px] font-semibold tracking-tight">{title}</h3>
            {sub && <p className="mt-0.5 text-[12px] text-mute">{sub}</p>}
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-mute hover:bg-black/5"><X className="size-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 scrollbar-thin">{children}</div>
      </div>
    </div>
  );
}

// ---------- Table ----------
export function DataTable({ head, children, wide }: { head: string[]; children: ReactNode; wide?: boolean }) {
  return (
    <div className={cn(wide && "overflow-x-auto scrollbar-thin")}>
      <table className="w-full min-w-max text-[13px]">
        <thead>
          <tr className="border-b border-black/5 text-left text-[11px] uppercase tracking-wide text-mute">
            {head.map((h, i) => (
              <th key={h + i} className="px-4 py-2 font-semibold first:pl-4 last:pr-4">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-black/5">{children}</tbody>
      </table>
    </div>
  );
}

export function Row({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return (
    <tr onClick={onClick} className={cn("hover:bg-black/[0.02]", onClick && "cursor-pointer")}>
      {children}
    </tr>
  );
}

export function Cell({ className, children }: { className?: string; children: ReactNode }) {
  return <td className={cn("px-4 py-2.5 align-middle", className)}>{children}</td>;
}

// ---------- Misc ----------
export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 py-10 text-center">
      <p className="text-[13px] font-medium text-ink/70">{title}</p>
      {hint && <p className="text-[12px] text-mute">{hint}</p>}
    </div>
  );
}

export function Tabs({ tabs, value, onChange }: { tabs: { id: string; label: string; count?: number }[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-1 rounded-lg bg-black/[0.04] p-1">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={cn(
            "rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors",
            value === t.id ? "bg-card text-ink ring-1 ring-black/10" : "text-mute hover:text-ink"
          )}
        >
          {t.label}
          {typeof t.count === "number" && <span className="ml-1.5 mono text-[11px] text-mute">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function Toolbar({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2">{children}</div>;
}
