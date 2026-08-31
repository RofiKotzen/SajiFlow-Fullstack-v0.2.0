import { ApiError, type ApiClient, type AuthSession, type LoginPayload } from "./types";

export const API_URL = (import.meta.env.VITE_API_URL ?? "http://localhost:3000/api/v1").replace(/\/$/, "");

interface SessionAccess {
  get: () => AuthSession | null;
  save: (session: AuthSession | null) => void;
}

export function createApiClient(sessionAccess: SessionAccess): ApiClient {
  let refreshInFlight: Promise<AuthSession> | null = null;

  async function refreshSession(): Promise<AuthSession> {
    const current = sessionAccess.get();
    if (!current?.refreshToken) throw new ApiError("Sesi tidak tersedia.", 401, "unauthorized");

    const response = await safeFetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: current.refreshToken }),
    });
    const refreshed = await parseResponse<AuthSession>(response);
    sessionAccess.save(refreshed);
    return refreshed;
  }

  return async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const send = async (session: AuthSession | null) => {
      const headers = new Headers(options.headers);
      if (options.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
      if (session?.accessToken) headers.set("Authorization", `Bearer ${session.accessToken}`);
      return safeFetch(`${API_URL}${path}`, { ...options, headers });
    };

    const attemptedSession = sessionAccess.get();
    let response = await send(attemptedSession);
    if (response.status !== 401 || !sessionAccess.get()?.refreshToken) return parseResponse<T>(response);

    try {
      const latestSession = sessionAccess.get();
      if (attemptedSession && latestSession && attemptedSession.refreshToken !== latestSession.refreshToken) {
        response = await send(latestSession);
        return parseResponse<T>(response);
      }
      refreshInFlight ??= refreshSession().finally(() => { refreshInFlight = null; });
      const refreshed = await refreshInFlight;
      response = await send(refreshed);
      return parseResponse<T>(response);
    } catch (error) {
      sessionAccess.save(null);
      throw error;
    }
  };
}

export async function loginRequest(payload: LoginPayload): Promise<AuthSession> {
  const response = await safeFetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseResponse<AuthSession>(response);
}

export async function logoutRequest(refreshToken: string): Promise<void> {
  const response = await safeFetch(`${API_URL}/auth/logout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });
  await parseResponse<{ success: true }>(response);
}

async function safeFetch(input: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(input, init);
  } catch {
    throw new ApiError("Backend tidak dapat dihubungi. Periksa koneksi dan coba lagi.", null, "network");
  }
}

export async function parseResponse<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => null) as { message?: string | string[] } | null;
  if (response.ok) return body as T;

  const rawMessage = Array.isArray(body?.message) ? body.message.join(", ") : body?.message;
  const message = rawMessage ?? `Permintaan gagal (${response.status})`;
  const lower = message.toLowerCase();
  const kind = lower.includes("terkunci")
    ? "locked"
    : response.status === 400
      ? "validation"
      : response.status === 401
        ? "unauthorized"
        : response.status === 403
          ? "forbidden"
          : response.status === 404
            ? "not-found"
            : response.status >= 500
              ? "unavailable"
              : "unknown";
  throw new ApiError(message, response.status, kind);
}
