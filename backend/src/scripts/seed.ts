import "dotenv/config";
import { randomUUID } from "node:crypto";
import { hash } from "bcryptjs";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
  outlets,
  permissions,
  rolePermissions,
  roles,
  tenants,
  userCredentials,
  userRoles,
  users,
} from "../database/schema";

const permissionSeed = [
  ["tenant.read", "tenant", "Melihat profil tenant"],
  ["tenant.update", "tenant", "Mengubah profil dan status tenant"],
  ["outlets.read", "outlets", "Melihat outlet"],
  ["outlets.create", "outlets", "Membuat outlet"],
  ["outlets.update", "outlets", "Mengubah outlet"],
  ["users.read", "users", "Melihat user"],
  ["users.create", "users", "Membuat user"],
  ["users.update", "users", "Mengubah status dan profil user"],
  [
    "users.reset_password",
    "users",
    "Mengatur ulang password user dan mencabut sesi lama",
  ],
  ["users.assign_roles", "users", "Menetapkan role user"],
  ["roles.read", "roles", "Melihat role"],
  ["roles.create", "roles", "Membuat role"],
  ["roles.update", "roles", "Mengubah role"],
  ["roles.assign_permissions", "roles", "Menetapkan permission role"],
  ["permissions.read", "permissions", "Melihat katalog permission"],
] as const;

async function main(): Promise<void> {
  const databaseUrl = required("DATABASE_URL");
  const client = postgres(databaseUrl, {
    ssl: process.env.DATABASE_SSL === "true" ? "require" : false,
    max: 1,
  });
  const db = drizzle(client);
  try {
    const tenantCode = process.env.SEED_TENANT_CODE ?? "SAJIFLOW";
    let [tenant] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.code, tenantCode))
      .limit(1);
    if (!tenant) {
      [tenant] = await db
        .insert(tenants)
        .values({
          code: tenantCode,
          name: process.env.SEED_TENANT_NAME ?? "Saji Flow",
          status: "active",
        })
        .returning();
    }

    const outletCode = process.env.SEED_OUTLET_CODE ?? "MAIN";
    let [outlet] = await db
      .select()
      .from(outlets)
      .where(and(eq(outlets.tenantId, tenant.id), eq(outlets.code, outletCode)))
      .limit(1);
    if (!outlet) {
      [outlet] = await db
        .insert(outlets)
        .values({
          tenantId: tenant.id,
          code: outletCode,
          name: process.env.SEED_OUTLET_NAME ?? "Outlet Utama",
        })
        .returning();
    }

    for (const [code, module, description] of permissionSeed) {
      await db
        .insert(permissions)
        .values({ code, module, description })
        .onConflictDoNothing({ target: permissions.code });
    }
    const allPermissions = await db
      .select({ id: permissions.id })
      .from(permissions);

    let [adminRole] = await db
      .select()
      .from(roles)
      .where(and(eq(roles.tenantId, tenant.id), eq(roles.code, "SUPER_ADMIN")))
      .limit(1);
    if (!adminRole) {
      [adminRole] = await db
        .insert(roles)
        .values({
          tenantId: tenant.id,
          code: "SUPER_ADMIN",
          name: "Super Administrator",
          description: "Akses penuh tenant",
          isSystem: true,
        })
        .returning();
    }
    for (const permission of allPermissions) {
      await db
        .insert(rolePermissions)
        .values({
          tenantId: tenant.id,
          roleId: adminRole.id,
          permissionId: permission.id,
        })
        .onConflictDoNothing();
    }

    const adminEmail = (
      process.env.SEED_ADMIN_EMAIL ?? "admin@sajiflow.local"
    ).toLowerCase();
    let [admin] = await db
      .select()
      .from(users)
      .where(eq(users.email, adminEmail))
      .limit(1);
    if (!admin) {
      [admin] = await db
        .insert(users)
        .values({
          tenantId: tenant.id,
          authUserId: randomUUID(),
          fullName: process.env.SEED_ADMIN_NAME ?? "Administrator",
          email: adminEmail,
          status: "active",
        })
        .returning();
      await db.insert(userCredentials).values({
        userId: admin.id,
        tenantId: tenant.id,
        passwordHash: await hash(required("SEED_ADMIN_PASSWORD"), 12),
      });
    }
    const [assignment] = await db
      .select()
      .from(userRoles)
      .where(
        and(
          eq(userRoles.tenantId, tenant.id),
          eq(userRoles.userId, admin.id),
          eq(userRoles.roleId, adminRole.id),
        ),
      )
      .limit(1);
    if (!assignment) {
      await db.insert(userRoles).values({
        tenantId: tenant.id,
        userId: admin.id,
        roleId: adminRole.id,
        outletId: null,
      });
    }

    console.log("Seed selesai");
    console.log(`Tenant : ${tenant.code} (${tenant.id})`);
    console.log(`Outlet : ${outlet.code} (${outlet.id})`);
    console.log(`Admin  : ${admin.email}`);
  } finally {
    await client.end({ timeout: 5 });
  }
}

function required(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`${key} belum diisi pada .env`);
  return value;
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
