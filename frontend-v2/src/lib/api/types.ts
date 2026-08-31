export interface SessionUser {
  userId: string;
  tenantId: string;
  email: string;
  fullName: string;
  roles: string[];
  permissions: string[];
  outletIds: string[];
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  user: SessionUser;
}

export interface LoginPayload {
  tenantCode: string;
  email: string;
  password: string;
}

export interface TenantSummary {
  id: string;
  code: string;
  name: string;
  status: "active" | "trial" | "suspended" | "inactive";
}

export interface OutletSummary {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  isActive: boolean;
}

export type ApiClient = <T>(path: string, options?: RequestInit) => Promise<T>;

export type ApiErrorKind =
  | "validation"
  | "unauthorized"
  | "forbidden"
  | "not-found"
  | "locked"
  | "network"
  | "unavailable"
  | "unknown";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number | null,
    public readonly kind: ApiErrorKind,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
