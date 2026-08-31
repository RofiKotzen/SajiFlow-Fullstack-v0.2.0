import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createApiClient, loginRequest, logoutRequest } from "@/lib/api/client";
import { ApiError, type ApiClient, type AuthSession, type LoginPayload, type OutletSummary, type TenantSummary } from "@/lib/api/types";

const SESSION_KEY = "sajiflow.auth.session";
const OUTLET_KEY = "sajiflow.activeOutlet";

interface AuthContextValue {
  status: "bootstrapping" | "authenticated" | "unauthenticated";
  session: AuthSession | null;
  api: ApiClient;
  tenant: TenantSummary | null;
  outlets: OutletSummary[];
  activeOutletId: string;
  contextLoading: boolean;
  bootstrapError: string;
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => Promise<void>;
  setActiveOutletId: (outletId: string) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthContextValue["status"]>("bootstrapping");
  const [session, setSession] = useState<AuthSession | null>(null);
  const [tenant, setTenant] = useState<TenantSummary | null>(null);
  const [outlets, setOutlets] = useState<OutletSummary[]>([]);
  const [activeOutletId, setActiveOutletState] = useState("");
  const [contextLoading, setContextLoading] = useState(false);
  const [bootstrapError, setBootstrapError] = useState("");
  const sessionRef = useRef<AuthSession | null>(null);

  const saveSession = useCallback((next: AuthSession | null) => {
    sessionRef.current = next;
    setSession(next);
    if (typeof window !== "undefined") {
      if (next) window.localStorage.setItem(SESSION_KEY, JSON.stringify(next));
      else window.localStorage.removeItem(SESSION_KEY);
    }
  }, []);

  const api = useMemo(() => createApiClient({ get: () => sessionRef.current, save: saveSession }), [saveSession]);

  useEffect(() => {
    let active = true;
    async function bootstrap() {
      try {
        const stored = window.localStorage.getItem(SESSION_KEY);
        if (!stored) { if (active) setStatus("unauthenticated"); return; }
        const parsed = JSON.parse(stored) as AuthSession;
        if (!isSession(parsed)) throw new Error("Session storage tidak valid");
        sessionRef.current = parsed;
        setSession(parsed);
        const user = await api<AuthSession["user"]>("/auth/me");
        const current = sessionRef.current;
        if (active && current) {
          saveSession({ ...current, user });
          setStatus("authenticated");
        }
      } catch (error) {
        if (!active) return;
        if (!(error instanceof ApiError) || !["network", "unavailable"].includes(error.kind)) saveSession(null);
        setBootstrapError(error instanceof Error ? error.message : "Session tidak dapat dipulihkan.");
        setStatus("unauthenticated");
      }
    }
    void bootstrap();
    return () => { active = false; };
  }, [api, saveSession]);

  useEffect(() => {
    if (status !== "authenticated" || !session) return;
    let active = true;
    setContextLoading(true);
    const canReadTenant = session.user.permissions.includes("tenant.read");
    const canReadOutlets = session.user.permissions.includes("outlets.read");
    const requests: Promise<unknown>[] = [];
    if (canReadTenant) requests.push(api<TenantSummary>("/tenant").then((value) => { if (active) setTenant(value); }));
    if (canReadOutlets) requests.push(api<OutletSummary[]>("/outlets").then((value) => {
      if (!active) return;
      const accessible = session.user.outletIds.length
        ? value.filter((outlet) => session.user.outletIds.includes(outlet.id))
        : value;
      setOutlets(accessible.filter((outlet) => outlet.isActive));
    }));
    Promise.allSettled(requests).finally(() => { if (active) setContextLoading(false); });
    return () => { active = false; };
  }, [api, session, status]);

  useEffect(() => {
    if (status !== "authenticated") return;
    const stored = window.localStorage.getItem(OUTLET_KEY);
    const next = stored && outlets.some((outlet) => outlet.id === stored) ? stored : outlets[0]?.id ?? "";
    setActiveOutletState(next);
    if (next) window.localStorage.setItem(OUTLET_KEY, next);
    else window.localStorage.removeItem(OUTLET_KEY);
  }, [outlets, status]);

  const setActiveOutletId = useCallback((outletId: string) => {
    if (!outlets.some((outlet) => outlet.id === outletId)) return;
    setActiveOutletState(outletId);
    window.localStorage.setItem(OUTLET_KEY, outletId);
  }, [outlets]);

  const login = useCallback(async (payload: LoginPayload) => {
    const next = await loginRequest(payload);
    saveSession(next);
    setBootstrapError("");
    setStatus("authenticated");
  }, [saveSession]);

  const logout = useCallback(async () => {
    const refreshToken = sessionRef.current?.refreshToken;
    try {
      if (refreshToken) await logoutRequest(refreshToken);
    } catch {
      // Local logout must complete even when the revocation endpoint is unavailable.
    } finally {
      saveSession(null);
      setTenant(null);
      setOutlets([]);
      setActiveOutletState("");
      if (typeof window !== "undefined") window.localStorage.removeItem(OUTLET_KEY);
      setStatus("unauthenticated");
    }
  }, [saveSession]);

  const value = useMemo<AuthContextValue>(() => ({ status, session, api, tenant, outlets, activeOutletId, contextLoading, bootstrapError, login, logout, setActiveOutletId }), [status, session, api, tenant, outlets, activeOutletId, contextLoading, bootstrapError, login, logout, setActiveOutletId]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth harus digunakan di dalam AuthProvider");
  return value;
}

function isSession(value: AuthSession): boolean {
  return Boolean(value?.accessToken && value?.refreshToken && value?.user?.userId && Array.isArray(value.user.permissions));
}
