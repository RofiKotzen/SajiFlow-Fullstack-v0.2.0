import { useState, type FormEvent } from "react";
import { LoaderCircle, LockKeyhole } from "lucide-react";
import { ApiError, type LoginPayload } from "@/lib/api/types";

export function LoginScreen({ onLogin, bootstrapError = "" }: { onLogin: (payload: LoginPayload) => Promise<void>; bootstrapError?: string }) {
  const [tenantCode, setTenantCode] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(bootstrapError);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await onLogin({ tenantCode: tenantCode.trim().toUpperCase(), email: email.trim().toLowerCase(), password });
    } catch (cause) {
      setError(loginErrorMessage(cause));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-screen bg-cream lg:grid-cols-[1.15fr_1fr]">
      <section className="relative hidden overflow-hidden bg-pine p-12 text-cream lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-3"><div className="grid size-11 place-items-center rounded-xl bg-pine-soft ring-1 ring-white/15"><span className="text-lg font-semibold">S</span></div><div><strong className="block text-lg">Saji Flow</strong><span className="mono text-xs text-pine-mute">restaurant operating system</span></div></div>
        <div className="max-w-xl"><p className="mb-4 text-xs font-semibold tracking-[0.16em] text-pine-mute">OPERASIONAL DALAM SATU ALUR</p><h1 className="text-5xl font-semibold leading-[1.08] tracking-tight">Dari stok hingga pesanan tersaji.</h1><p className="mt-5 max-w-lg text-base leading-relaxed text-pine-mute">Kelola outlet, tim, kasir, dapur, dan pengendalian bisnis melalui satu sistem yang terhubung.</p></div>
        <div className="mono flex items-center gap-3 text-xs text-pine-mute"><span>Plan</span><i className="h-px flex-1 bg-pine-line"/><span>Buy</span><i className="h-px flex-1 bg-pine-line"/><span>Stock</span><i className="h-px flex-1 bg-pine-line"/><span>Sell</span><i className="h-px flex-1 bg-pine-line"/><span>Serve</span></div>
      </section>
      <section className="flex items-center justify-center px-5 py-10 sm:px-10">
        <form className="w-full max-w-md rounded-2xl bg-card p-7 shadow-[0_18px_60px_oklch(0.28_0.02_125/0.08)] ring-1 ring-black/5 sm:p-9" onSubmit={submit}>
          <div className="mb-7"><div className="mb-5 grid size-11 place-items-center rounded-xl bg-olive-soft text-olive-deep lg:hidden"><LockKeyhole className="size-5" /></div><p className="text-xs font-semibold tracking-[0.14em] text-olive">SELAMAT DATANG</p><h1 className="mt-2 text-2xl font-semibold tracking-tight">Masuk ke Saji Flow</h1><p className="mt-2 text-sm leading-relaxed text-mute">Gunakan akun dan kode tenant yang telah terdaftar.</p></div>
          <div className="space-y-4">
            <label className="block text-sm font-medium">Kode tenant<input className="mt-1.5 h-11 w-full rounded-lg bg-white px-3 text-sm uppercase ring-1 ring-black/10 outline-none transition focus:ring-2 focus:ring-olive/40" value={tenantCode} onChange={(event) => setTenantCode(event.target.value)} autoComplete="organization" pattern="[A-Za-z0-9_-]+" required disabled={submitting}/></label>
            <label className="block text-sm font-medium">Email<input className="mt-1.5 h-11 w-full rounded-lg bg-white px-3 text-sm ring-1 ring-black/10 outline-none transition focus:ring-2 focus:ring-olive/40" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" required disabled={submitting}/></label>
            <label className="block text-sm font-medium">Password<input className="mt-1.5 h-11 w-full rounded-lg bg-white px-3 text-sm ring-1 ring-black/10 outline-none transition focus:ring-2 focus:ring-olive/40" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" minLength={8} maxLength={128} required disabled={submitting}/></label>
          </div>
          {error && <div className="mt-4 rounded-lg bg-terra/10 px-3 py-2.5 text-sm leading-relaxed text-terra" role="alert">{error}</div>}
          <button className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-olive px-4 text-sm font-semibold text-cream transition hover:bg-olive-deep disabled:cursor-wait disabled:opacity-60" type="submit" disabled={submitting}>{submitting && <LoaderCircle className="size-4 animate-spin"/>}{submitting ? "Menghubungkan…" : "Masuk ke workspace"}</button>
        </form>
      </section>
    </main>
  );
}

function loginErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return "Login gagal. Silakan coba lagi.";
  if (error.kind === "locked") return error.message;
  if (error.kind === "validation") return `Data login belum valid: ${error.message}`;
  if (error.kind === "network" || error.kind === "unavailable") return error.message;
  if (error.kind === "unauthorized") return "Kode tenant, email, atau password tidak sesuai, atau akun tidak aktif.";
  return error.message;
}
