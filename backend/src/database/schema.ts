import {
  boolean,
  char,
  customType,
  index,
  inet,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  time,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

const citext = customType<{ data: string }>({ dataType: () => 'citext' });

export const tenantStatus = pgEnum('tenant_status', ['active', 'trial', 'suspended', 'terminated']);
export const userStatus = pgEnum('user_status', ['invited', 'active', 'suspended', 'disabled']);

const auditColumns = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  createdBy: uuid('created_by'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  updatedBy: uuid('updated_by'),
};

export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: varchar('code', { length: 30 }).notNull().unique(),
  name: varchar('name', { length: 150 }).notNull(),
  timezone: varchar('timezone', { length: 50 }).notNull().default('Asia/Jakarta'),
  currencyCode: char('currency_code', { length: 3 }).notNull().default('IDR'),
  status: tenantStatus('status').notNull().default('active'),
  subscriptionStartAt: timestamp('subscription_start_at', { withTimezone: true }),
  subscriptionEndAt: timestamp('subscription_end_at', { withTimezone: true }),
  ...auditColumns,
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  deletedBy: uuid('deleted_by'),
});

export const outlets = pgTable(
  'outlets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    code: varchar('code', { length: 30 }).notNull(),
    name: varchar('name', { length: 150 }).notNull(),
    address: text('address'),
    phone: varchar('phone', { length: 30 }),
    timezone: varchar('timezone', { length: 50 }).notNull().default('Asia/Jakarta'),
    businessDayCutoff: time('business_day_cutoff').notNull().default('04:00'),
    isActive: boolean('is_active').notNull().default(true),
    ...auditColumns,
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    deletedBy: uuid('deleted_by'),
  },
  (table) => [
    uniqueIndex('uq_outlets_tenant_code_active')
      .on(table.tenantId, table.code)
      .where(sql`${table.deletedAt} IS NULL`),
  ],
);

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    authUserId: uuid('auth_user_id').notNull().unique(),
    employeeCode: varchar('employee_code', { length: 40 }),
    fullName: varchar('full_name', { length: 150 }).notNull(),
    email: citext('email').notNull().unique(),
    phone: varchar('phone', { length: 30 }),
    status: userStatus('status').notNull().default('invited'),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    ...auditColumns,
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    deletedBy: uuid('deleted_by'),
  },
  (table) => [index('ix_users_tenant_status').on(table.tenantId, table.status)],
);

export const roles = pgTable(
  'roles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    code: varchar('code', { length: 50 }).notNull(),
    name: varchar('name', { length: 100 }).notNull(),
    description: text('description'),
    isSystem: boolean('is_system').notNull().default(false),
    ...auditColumns,
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    deletedBy: uuid('deleted_by'),
  },
  (table) => [index('ix_roles_tenant_code').on(table.tenantId, table.code)],
);

export const permissions = pgTable('permissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: varchar('code', { length: 100 }).notNull().unique(),
  module: varchar('module', { length: 50 }).notNull(),
  description: text('description').notNull(),
  ...auditColumns,
});

export const userRoles = pgTable('user_roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  userId: uuid('user_id').notNull(),
  roleId: uuid('role_id').notNull(),
  outletId: uuid('outlet_id'),
  validFrom: timestamp('valid_from', { withTimezone: true }).notNull().defaultNow(),
  validUntil: timestamp('valid_until', { withTimezone: true }),
  ...auditColumns,
});

export const rolePermissions = pgTable('role_permissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  roleId: uuid('role_id').notNull(),
  permissionId: uuid('permission_id').notNull(),
  ...auditColumns,
});

export const userCredentials = pgTable('user_credentials', {
  userId: uuid('user_id').primaryKey(),
  tenantId: uuid('tenant_id').notNull(),
  passwordHash: text('password_hash').notNull(),
  failedAttempts: customType<{ data: number }>({ dataType: () => 'smallint' })('failed_attempts')
    .notNull()
    .default(0),
  lockedUntil: timestamp('locked_until', { withTimezone: true }),
  passwordChangedAt: timestamp('password_changed_at', { withTimezone: true }).notNull().defaultNow(),
  ...auditColumns,
});

export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    userId: uuid('user_id').notNull(),
    tokenHash: char('token_hash', { length: 64 }).notNull().unique(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    replacedByTokenId: uuid('replaced_by_token_id'),
    userAgent: text('user_agent'),
    ipAddress: inet('ip_address'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('ix_refresh_tokens_user_active').on(table.tenantId, table.userId, table.expiresAt),
  ],
);

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  outletId: uuid('outlet_id'),
  actorUserId: uuid('actor_user_id'),
  action: varchar('action', { length: 100 }).notNull(),
  entityType: varchar('entity_type', { length: 80 }).notNull(),
  entityId: uuid('entity_id'),
  beforeData: jsonb('before_data'),
  afterData: jsonb('after_data'),
  reason: text('reason'),
  ipAddress: inet('ip_address'),
  userAgent: text('user_agent'),
  occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
});
