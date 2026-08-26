import {
  boolean,
  char,
  customType,
  date,
  index,
  inet,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  time,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

const citext = customType<{ data: string }>({ dataType: () => "citext" });

export const tenantStatus = pgEnum("tenant_status", [
  "active",
  "trial",
  "suspended",
  "terminated",
]);
export const userStatus = pgEnum("user_status", [
  "invited",
  "active",
  "suspended",
  "disabled",
]);
export const budgetStatus = pgEnum("budget_status", [
  "draft",
  "submitted",
  "approved",
  "rejected",
  "closed",
]);
export const budgetCategory = pgEnum("budget_category", [
  "purchase",
  "operational",
  "maintenance",
  "marketing",
  "other",
]);

const auditColumns = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  createdBy: uuid("created_by"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedBy: uuid("updated_by"),
};

export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: varchar("code", { length: 30 }).notNull().unique(),
  name: varchar("name", { length: 150 }).notNull(),
  timezone: varchar("timezone", { length: 50 })
    .notNull()
    .default("Asia/Jakarta"),
  currencyCode: char("currency_code", { length: 3 }).notNull().default("IDR"),
  status: tenantStatus("status").notNull().default("active"),
  subscriptionStartAt: timestamp("subscription_start_at", {
    withTimezone: true,
  }),
  subscriptionEndAt: timestamp("subscription_end_at", { withTimezone: true }),
  ...auditColumns,
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  deletedBy: uuid("deleted_by"),
});

export const outlets = pgTable(
  "outlets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull(),
    code: varchar("code", { length: 30 }).notNull(),
    name: varchar("name", { length: 150 }).notNull(),
    address: text("address"),
    phone: varchar("phone", { length: 30 }),
    timezone: varchar("timezone", { length: 50 })
      .notNull()
      .default("Asia/Jakarta"),
    businessDayCutoff: time("business_day_cutoff").notNull().default("04:00"),
    isActive: boolean("is_active").notNull().default(true),
    ...auditColumns,
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    deletedBy: uuid("deleted_by"),
  },
  (table) => [
    uniqueIndex("uq_outlets_tenant_code_active")
      .on(table.tenantId, table.code)
      .where(sql`${table.deletedAt} IS NULL`),
  ],
);

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull(),
    authUserId: uuid("auth_user_id").notNull().unique(),
    employeeCode: varchar("employee_code", { length: 40 }),
    fullName: varchar("full_name", { length: 150 }).notNull(),
    email: citext("email").notNull().unique(),
    phone: varchar("phone", { length: 30 }),
    status: userStatus("status").notNull().default("invited"),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    ...auditColumns,
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    deletedBy: uuid("deleted_by"),
  },
  (table) => [index("ix_users_tenant_status").on(table.tenantId, table.status)],
);

export const roles = pgTable(
  "roles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull(),
    code: varchar("code", { length: 50 }).notNull(),
    name: varchar("name", { length: 100 }).notNull(),
    description: text("description"),
    isSystem: boolean("is_system").notNull().default(false),
    ...auditColumns,
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    deletedBy: uuid("deleted_by"),
  },
  (table) => [index("ix_roles_tenant_code").on(table.tenantId, table.code)],
);

export const permissions = pgTable("permissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: varchar("code", { length: 100 }).notNull().unique(),
  module: varchar("module", { length: 50 }).notNull(),
  description: text("description").notNull(),
  ...auditColumns,
});

export const userRoles = pgTable("user_roles", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  userId: uuid("user_id").notNull(),
  roleId: uuid("role_id").notNull(),
  outletId: uuid("outlet_id"),
  validFrom: timestamp("valid_from", { withTimezone: true })
    .notNull()
    .defaultNow(),
  validUntil: timestamp("valid_until", { withTimezone: true }),
  ...auditColumns,
});

export const rolePermissions = pgTable("role_permissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  roleId: uuid("role_id").notNull(),
  permissionId: uuid("permission_id").notNull(),
  ...auditColumns,
});

export const userCredentials = pgTable("user_credentials", {
  userId: uuid("user_id").primaryKey(),
  tenantId: uuid("tenant_id").notNull(),
  passwordHash: text("password_hash").notNull(),
  failedAttempts: customType<{ data: number }>({ dataType: () => "smallint" })(
    "failed_attempts",
  )
    .notNull()
    .default(0),
  lockedUntil: timestamp("locked_until", { withTimezone: true }),
  passwordChangedAt: timestamp("password_changed_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  ...auditColumns,
});

export const refreshTokens = pgTable(
  "refresh_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull(),
    userId: uuid("user_id").notNull(),
    tokenHash: char("token_hash", { length: 64 }).notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    replacedByTokenId: uuid("replaced_by_token_id"),
    userAgent: text("user_agent"),
    ipAddress: inet("ip_address"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("ix_refresh_tokens_user_active").on(
      table.tenantId,
      table.userId,
      table.expiresAt,
    ),
  ],
);

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  outletId: uuid("outlet_id"),
  actorUserId: uuid("actor_user_id"),
  action: varchar("action", { length: 100 }).notNull(),
  entityType: varchar("entity_type", { length: 80 }).notNull(),
  entityId: uuid("entity_id"),
  beforeData: jsonb("before_data"),
  afterData: jsonb("after_data"),
  reason: text("reason"),
  ipAddress: inet("ip_address"),
  userAgent: text("user_agent"),
  occurredAt: timestamp("occurred_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const budgets = pgTable(
  "budgets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull(),
    outletId: uuid("outlet_id").notNull(),
    budgetCode: varchar("budget_code", { length: 50 }).notNull(),
    name: varchar("name", { length: 150 }).notNull(),
    periodStart: date("period_start").notNull(),
    periodEnd: date("period_end").notNull(),
    status: budgetStatus("status").notNull().default("draft"),
    totalAmount: numeric("total_amount", {
      precision: 18,
      scale: 2,
      mode: "number",
    })
      .notNull()
      .default(0),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    approvedBy: uuid("approved_by"),
    notes: text("notes"),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex("uq_budget_code").on(table.tenantId, table.budgetCode),
    index("ix_budgets_tenant_id").on(table.tenantId),
    index("ix_budgets_outlet_id").on(table.outletId),
  ],
);

export const budgetLines = pgTable(
  "budget_lines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull(),
    budgetId: uuid("budget_id").notNull(),
    category: budgetCategory("category").notNull(),
    description: varchar("description", { length: 200 }).notNull(),
    plannedAmount: numeric("planned_amount", {
      precision: 18,
      scale: 2,
      mode: "number",
    }).notNull(),
    actualAmount: numeric("actual_amount", {
      precision: 18,
      scale: 2,
      mode: "number",
    })
      .notNull()
      .default(0),
    varianceAmount: numeric("variance_amount", {
      precision: 18,
      scale: 2,
      mode: "number",
    })
      .notNull()
      .default(0),
    warningThresholdPct: numeric("warning_threshold_pct", {
      precision: 5,
      scale: 2,
      mode: "number",
    })
      .notNull()
      .default(80),
    ...auditColumns,
  },
  (table) => [
    index("ix_budget_lines_tenant_id").on(table.tenantId),
    index("ix_budget_lines_budget_id").on(table.budgetId),
  ],
);

export const budgetStatusHistory = pgTable(
  "budget_status_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull(),
    budgetId: uuid("budget_id").notNull(),
    fromStatus: budgetStatus("from_status"),
    toStatus: budgetStatus("to_status").notNull(),
    changedBy: uuid("changed_by").notNull(),
    reason: text("reason"),
    changedAt: timestamp("changed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("ix_budget_status_history_tenant_id").on(table.tenantId),
    index("ix_budget_status_history_budget_id").on(table.budgetId),
  ],
);
