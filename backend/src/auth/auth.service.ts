import { createHash, randomUUID } from "node:crypto";
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { compare } from "bcryptjs";
import { and, eq, gt, isNull, or } from "drizzle-orm";
import { DatabaseService } from "../database/database.service";
import {
  permissions,
  refreshTokens,
  rolePermissions,
  roles,
  tenants,
  userCredentials,
  userRoles,
  users,
} from "../database/schema";
import { JwtPayload } from "../common/types/auth-user";
import { LoginDto } from "./dto/login.dto";

interface RequestMeta {
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly database: DatabaseService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(dto: LoginDto, meta: RequestMeta) {
    const normalizedEmail = dto.email.trim().toLowerCase();
    const conditions = [
      eq(users.email, normalizedEmail),
      isNull(users.deletedAt),
    ];
    if (dto.tenantCode) conditions.push(eq(tenants.code, dto.tenantCode));

    const [account] = await this.database.db
      .select({
        userId: users.id,
        tenantId: users.tenantId,
        email: users.email,
        fullName: users.fullName,
        userStatus: users.status,
        tenantStatus: tenants.status,
      })
      .from(users)
      .innerJoin(tenants, eq(tenants.id, users.tenantId))
      .where(and(...conditions))
      .limit(1);

    if (
      !account ||
      account.userStatus !== "active" ||
      !["active", "trial"].includes(account.tenantStatus)
    ) {
      throw new UnauthorizedException("Email atau password salah");
    }

    const [credential] = await this.database.db
      .select()
      .from(userCredentials)
      .where(
        and(
          eq(userCredentials.userId, account.userId),
          eq(userCredentials.tenantId, account.tenantId),
        ),
      )
      .limit(1);

    if (!credential)
      throw new UnauthorizedException("Email atau password salah");
    if (credential.lockedUntil && credential.lockedUntil > new Date()) {
      throw new UnauthorizedException(
        "Akun terkunci sementara. Coba lagi setelah 15 menit.",
      );
    }

    const validPassword = await compare(dto.password, credential.passwordHash);
    if (!validPassword) {
      const attempts = credential.failedAttempts + 1;
      await this.database.db
        .update(userCredentials)
        .set({
          failedAttempts: attempts,
          lockedUntil:
            attempts >= 5 ? new Date(Date.now() + 15 * 60_000) : null,
        })
        .where(eq(userCredentials.userId, account.userId));
      throw new UnauthorizedException("Email atau password salah");
    }

    await this.database.db
      .update(userCredentials)
      .set({ failedAttempts: 0, lockedUntil: null })
      .where(eq(userCredentials.userId, account.userId));
    await this.database.db
      .update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, account.userId));

    const { refreshTokenId: _refreshTokenId, ...response } =
      await this.issueSession(account, meta);
    return response;
  }

  async refresh(rawToken: string, meta: RequestMeta) {
    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(rawToken, {
        secret: this.config.getOrThrow<string>("JWT_REFRESH_SECRET"),
      });
      if (payload.type !== "refresh") throw new Error("Wrong token type");
    } catch {
      throw new UnauthorizedException(
        "Refresh token tidak valid atau kedaluwarsa",
      );
    }

    const tokenHash = this.hashToken(rawToken);
    const [stored] = await this.database.db
      .select()
      .from(refreshTokens)
      .where(
        and(
          eq(refreshTokens.tokenHash, tokenHash),
          eq(refreshTokens.userId, payload.sub),
          isNull(refreshTokens.revokedAt),
          gt(refreshTokens.expiresAt, new Date()),
        ),
      )
      .limit(1);
    if (!stored)
      throw new UnauthorizedException(
        "Refresh token sudah dicabut atau kedaluwarsa",
      );

    const account = await this.getAccount(payload.sub, payload.tenant_id);
    if (!account) throw new UnauthorizedException("Akun tidak lagi aktif");

    await this.database.db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokens.id, stored.id));
    const session = await this.issueSession(account, meta);
    await this.database.db
      .update(refreshTokens)
      .set({ replacedByTokenId: session.refreshTokenId })
      .where(eq(refreshTokens.id, stored.id));
    const { refreshTokenId: _refreshTokenId, ...response } = session;
    return response;
  }

  async logout(rawToken: string): Promise<{ success: true }> {
    await this.database.db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(refreshTokens.tokenHash, this.hashToken(rawToken)),
          isNull(refreshTokens.revokedAt),
        ),
      );
    return { success: true };
  }

  async me(userId: string, tenantId: string) {
    const account = await this.getAccount(userId, tenantId);
    if (!account) throw new UnauthorizedException("Akun tidak ditemukan");
    const context = await this.getAccessContext(userId, tenantId);
    return { ...account, ...context };
  }

  private async issueSession(
    account: {
      userId: string;
      tenantId: string;
      email: string;
      fullName: string;
    },
    meta: RequestMeta,
  ) {
    const context = await this.getAccessContext(
      account.userId,
      account.tenantId,
    );
    const base = {
      sub: account.userId,
      tenant_id: account.tenantId,
      email: account.email,
      full_name: account.fullName,
      roles: context.roles,
      permissions: context.permissions,
      outlet_ids: context.outletIds,
    };
    const accessTtl = parseDuration(
      this.config.get<string>("JWT_ACCESS_TTL") ?? "15m",
    );
    const refreshTtl = parseDuration(
      this.config.get<string>("JWT_REFRESH_TTL") ?? "7d",
    );
    const accessToken = await this.jwt.signAsync(
      { ...base, type: "access", jti: randomUUID() },
      {
        secret: this.config.getOrThrow("JWT_ACCESS_SECRET"),
        expiresIn: accessTtl,
      },
    );
    const refreshToken = await this.jwt.signAsync(
      { ...base, type: "refresh", jti: randomUUID() },
      {
        secret: this.config.getOrThrow("JWT_REFRESH_SECRET"),
        expiresIn: refreshTtl,
      },
    );
    const [stored] = await this.database.db
      .insert(refreshTokens)
      .values({
        tenantId: account.tenantId,
        userId: account.userId,
        tokenHash: this.hashToken(refreshToken),
        expiresAt: new Date(Date.now() + refreshTtl * 1000),
        userAgent: meta.userAgent,
        ipAddress: normalizeIp(meta.ipAddress),
      })
      .returning({ id: refreshTokens.id });

    return {
      accessToken,
      refreshToken,
      tokenType: "Bearer",
      expiresIn: accessTtl,
      refreshTokenId: stored.id,
      user: { ...account, ...context },
    };
  }

  private async getAccount(userId: string, tenantId: string) {
    const [account] = await this.database.db
      .select({
        userId: users.id,
        tenantId: users.tenantId,
        email: users.email,
        fullName: users.fullName,
      })
      .from(users)
      .innerJoin(tenants, eq(tenants.id, users.tenantId))
      .where(
        and(
          eq(users.id, userId),
          eq(users.tenantId, tenantId),
          eq(users.status, "active"),
          or(eq(tenants.status, "active"), eq(tenants.status, "trial")),
          isNull(users.deletedAt),
        ),
      )
      .limit(1);
    return account;
  }

  private async getAccessContext(userId: string, tenantId: string) {
    const assignments = await this.database.db
      .select({ roleCode: roles.code, outletId: userRoles.outletId })
      .from(userRoles)
      .innerJoin(roles, eq(roles.id, userRoles.roleId))
      .where(
        and(
          eq(userRoles.userId, userId),
          eq(userRoles.tenantId, tenantId),
          or(
            isNull(userRoles.validUntil),
            gt(userRoles.validUntil, new Date()),
          ),
          isNull(roles.deletedAt),
        ),
      );
    const granted = await this.database.db
      .selectDistinct({ code: permissions.code })
      .from(userRoles)
      .innerJoin(rolePermissions, eq(rolePermissions.roleId, userRoles.roleId))
      .innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
      .where(
        and(
          eq(userRoles.userId, userId),
          eq(userRoles.tenantId, tenantId),
          or(
            isNull(userRoles.validUntil),
            gt(userRoles.validUntil, new Date()),
          ),
        ),
      );
    return {
      roles: [...new Set(assignments.map((item) => item.roleCode))],
      outletIds: [
        ...new Set(
          assignments.flatMap((item) => (item.outletId ? [item.outletId] : [])),
        ),
      ],
      permissions: granted.map((item) => item.code),
    };
  }

  private hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }
}

function parseDuration(value: string): number {
  const match = /^(\d+)(s|m|h|d)$/.exec(value);
  if (!match) throw new Error(`Durasi JWT tidak valid: ${value}`);
  const amount = Number(match[1]);
  const units: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
  return amount * units[match[2]];
}

function normalizeIp(value?: string): string | undefined {
  if (!value) return undefined;
  return value
    .replace(/^::ffff:/, "")
    .split(",")[0]
    .trim();
}
