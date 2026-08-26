"use client";

import { FormEvent, ReactNode, useEffect, useState } from "react";

export type SessionUser = {
  userId: string;
  tenantId: string;
  email: string;
  fullName: string;
  roles: string[];
  permissions: string[];
  outletIds: string[];
};

export type AuthSession = {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  user: SessionUser;
};

export type ApiClient = <T>(path: string, options?: RequestInit) => Promise<T>;

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api/v1").replace(/\/$/, "");
const STORAGE_KEY = "sajiflow.auth.session";

export function AuthGate({ children }: { children: (value: { session: AuthSession; api: ApiClient; logout: () => Promise<void> }) => ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) setSession(JSON.parse(stored) as AuthSession);
    } finally {
      setReady(true);
    }
  }, []);

  function saveSession(next: AuthSession | null) {
    setSession(next);
    if (next) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    else window.localStorage.removeItem(STORAGE_KEY);
  }

  async function request<T>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
    const current = session;
    const headers = new Headers(options.headers);
    if (options.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
    if (current?.accessToken) headers.set("Authorization", `Bearer ${current.accessToken}`);
    const response = await fetch(`${API_URL}${path}`, { ...options, headers });

    if (response.status === 401 && retry && current?.refreshToken) {
      const refreshResponse = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: current.refreshToken }),
      });
      if (refreshResponse.ok) {
        const refreshed = await refreshResponse.json() as AuthSession;
        saveSession(refreshed);
        const retryHeaders = new Headers(options.headers);
        if (options.body && !retryHeaders.has("Content-Type")) retryHeaders.set("Content-Type", "application/json");
        retryHeaders.set("Authorization", `Bearer ${refreshed.accessToken}`);
        const retryResponse = await fetch(`${API_URL}${path}`, { ...options, headers: retryHeaders });
        return parseResponse<T>(retryResponse);
      }
      saveSession(null);
    }
    return parseResponse<T>(response);
  }

  async function login(email: string, password: string, tenantCode: string) {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, tenantCode }),
    });
    const result = await parseResponse<AuthSession>(response);
    saveSession(result);
  }

  async function logout() {
    if (session?.refreshToken) {
      try {
        await fetch(`${API_URL}/auth/logout`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken: session.refreshToken }),
        });
      } catch {
        // A local logout must still complete when the API is temporarily unavailable.
      }
    }
    saveSession(null);
  }

  if (!ready) return <div className="auth-loading"><div className="auth-spinner" /><p>Menyiapkan Saji Flow…</p></div>;
  if (!session) return <LoginScreen onLogin={login} />;
  return <>{children({ session, api: request, logout })}</>;
}

function LoginScreen({ onLogin }: { onLogin: (email: string, password: string, tenantCode: string) => Promise<void> }) {
  const [email, setEmail] = useState("admin@sajiflow.local");
  const [password, setPassword] = useState("");
  const [tenantCode, setTenantCode] = useState("SAJIFLOW");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await onLogin(email.trim(), password, tenantCode.trim().toUpperCase());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Login gagal. Periksa kembali data login.");
    } finally {
      setLoading(false);
    }
  }

  return <main className="login-shell">
    <section className="login-brand-panel">
      <div className="login-brand"><span>S</span><div><strong>Saji Flow</strong><small>Restaurant Operating System</small></div></div>
      <div className="login-message"><p>OPERASIONAL DALAM SATU ALUR</p><h1>Dari stok hingga pesanan tersaji.</h1><span>Kelola outlet, tim, kasir, dapur, dan pengendalian bisnis melalui satu sistem yang terhubung.</span></div>
      <div className="login-flow"><i>Plan</i><b /> <i>Buy</i><b /> <i>Stock</i><b /> <i>Sell</i><b /> <i>Serve</i></div>
    </section>
    <section className="login-form-panel">
      <form onSubmit={submit} className="login-card">
        <p className="eyebrow">SELAMAT DATANG</p><h2>Masuk ke Saji Flow</h2><span className="login-subtitle">Gunakan akun yang sudah terdaftar pada tenant kamu.</span>
        <label>Kode tenant<input value={tenantCode} onChange={(event) => setTenantCode(event.target.value)} required autoComplete="organization" /></label>
        <label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="username" /></label>
        <label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete="current-password" minLength={8} /></label>
        {error && <div className="auth-error" role="alert">{error}</div>}
        <button className="login-button" disabled={loading}>{loading ? "Menghubungkan…" : "Masuk ke workspace"}</button>
        <small className="api-hint">API: {API_URL}</small>
      </form>
    </section>
  </main>;
}

async function parseResponse<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => null) as { message?: string | string[] } | null;
  if (!response.ok) {
    const message = Array.isArray(body?.message) ? body.message.join(", ") : body?.message;
    throw new Error(message ?? `Permintaan gagal (${response.status})`);
  }
  return body as T;
}
