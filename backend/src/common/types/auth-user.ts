export interface AuthUser {
  userId: string;
  tenantId: string;
  email: string;
  fullName: string;
  roles: string[];
  permissions: string[];
  outletIds: string[];
  tokenType: 'access';
}

export interface JwtPayload {
  sub: string;
  tenant_id: string;
  email: string;
  full_name: string;
  roles: string[];
  permissions: string[];
  outlet_ids: string[];
  type: 'access' | 'refresh';
  jti: string;
}
