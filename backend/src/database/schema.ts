import {
  boolean,
  bigint,
  char,
  customType,
  date,
  index,
  inet,
  jsonb,
  integer,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
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
export const unitDimension = pgEnum("unit_dimension", [
  "mass",
  "volume",
  "count",
  "length",
]);
export const valuationMethod = pgEnum("valuation_method", [
  "weighted_average",
  "fifo",
]);
export const purchaseOrderStatus = pgEnum("purchase_order_status", [
  "draft",
  "approved",
  "sent",
  "partially_received",
  "received",
  "closed",
  "cancelled",
]);
export const goodsReceiptStatus = pgEnum("goods_receipt_status", [
  "draft",
  "posted",
  "void",
]);
export const menuItemType = pgEnum("menu_item_type", [
  "recipe",
  "retail",
  "service",
]);
export const recipeStatus = pgEnum("recipe_status", [
  "draft",
  "approved",
  "retired",
  "archived",
]);
export const storageLocationType = pgEnum("storage_location_type", [
  "storage",
  "kitchen",
  "bar",
  "chiller",
  "freezer",
]);
export const stockMovementType = pgEnum("stock_movement_type", [
  "receipt",
  "sale_consumption",
  "transfer_out",
  "transfer_in",
  "waste",
  "opname_adjustment",
  "reversal",
]);
export const stockMovementStatus = pgEnum("stock_movement_status", [
  "posted",
  "reversed",
]);
export const salesOrderType = pgEnum("sales_order_type", [
  "dine_in",
  "takeaway",
]);
export const salesOrderStatus = pgEnum("sales_order_status", [
  "draft",
  "submitted",
  "preparing",
  "ready",
  "completed",
  "cancelled",
]);
export const salesOrderItemStatus = pgEnum("sales_order_item_status", [
  "draft",
  "queued",
  "preparing",
  "ready",
  "completed",
  "cancelled",
]);
export const posPaymentMethod = pgEnum("pos_payment_method", [
  "cash",
  "qris_manual",
  "card_manual",
]);
export const posPaymentStatus = pgEnum("pos_payment_status", [
  "unpaid",
  "paid",
  "voided",
]);
export const posPaymentEntryType = pgEnum("pos_payment_entry_type", [
  "payment",
  "manual_refund",
]);
export const posOperationStatus = pgEnum("pos_operation_status", [
  "processing",
  "completed",
  "failed",
]);
export const salesConsumptionStatus = pgEnum("sales_consumption_status", [
  "planned",
  "posted",
  "reversed",
  "skipped_optional",
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

export const documentSequences = pgTable(
  "document_sequences",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull(),
    outletId: uuid("outlet_id").notNull(),
    documentType: varchar("document_type", { length: 40 }).notNull(),
    businessDate: date("business_date").notNull(),
    lastNumber: bigint("last_number", { mode: "number" }).notNull().default(0),
    prefixPattern: varchar("prefix_pattern", { length: 80 }).notNull(),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex("uq_document_sequence").on(
      table.tenantId,
      table.outletId,
      table.documentType,
      table.businessDate,
    ),
  ],
);

export const units = pgTable(
  "units",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull(),
    code: varchar("code", { length: 20 }).notNull(),
    name: varchar("name", { length: 80 }).notNull(),
    dimension: unitDimension("dimension").notNull(),
    isBase: boolean("is_base").notNull().default(false),
    decimalScale: smallint("decimal_scale").notNull().default(3),
    isActive: boolean("is_active").notNull().default(true),
    ...auditColumns,
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    deletedBy: uuid("deleted_by"),
  },
  (table) => [
    uniqueIndex("uq_units_tenant_code")
      .on(table.tenantId, table.code)
      .where(sql`${table.deletedAt} is null`),
    index("ix_units_tenant_id").on(table.tenantId),
  ],
);

export const ingredientCategories = pgTable("ingredient_categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  code: varchar("code", { length: 40 }).notNull().default(sql`'CATEGORY-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))`),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  displayOrder: integer("display_order").notNull().default(0),
  parentId: uuid("parent_id"),
  isActive: boolean("is_active").notNull().default(true),
  lockVersion: integer("lock_version").notNull().default(1),
  ...auditColumns,
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  deletedBy: uuid("deleted_by"),
});

export const ingredients = pgTable(
  "ingredients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull(),
    sku: varchar("sku", { length: 50 }).notNull(),
    name: varchar("name", { length: 150 }).notNull(),
    categoryId: uuid("category_id"),
    baseUnitId: uuid("base_unit_id").notNull(),
    valuationMethod: valuationMethod("valuation_method")
      .notNull()
      .default("weighted_average"),
    isPerishable: boolean("is_perishable").notNull().default(false),
    shelfLifeDays: integer("shelf_life_days"),
    barcode: varchar("barcode", { length: 100 }),
    isActive: boolean("is_active").notNull().default(true),
    ...auditColumns,
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    deletedBy: uuid("deleted_by"),
  },
  (table) => [
    uniqueIndex("uq_ingredients_tenant_sku")
      .on(table.tenantId, table.sku)
      .where(sql`${table.deletedAt} is null`),
    index("ix_ingredients_tenant_id").on(table.tenantId),
    index("ix_ingredients_category_id").on(table.categoryId),
  ],
);

export const unitConversions = pgTable(
  "unit_conversions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull(),
    fromUnitId: uuid("from_unit_id").notNull(),
    toUnitId: uuid("to_unit_id").notNull(),
    factor: numeric("factor", { precision: 18, scale: 6 }).notNull(),
    isActive: boolean("is_active").notNull().default(true),
    lockVersion: integer("lock_version").notNull().default(1),
    ...auditColumns,
  },
  (table) => [index("ix_unit_conversions_tenant_id").on(table.tenantId)],
);

export const ingredientOutletSettings = pgTable(
  "ingredient_outlet_settings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull(),
    outletId: uuid("outlet_id").notNull(),
    ingredientId: uuid("ingredient_id").notNull(),
    minimumStock: numeric("minimum_stock", {
      precision: 18,
      scale: 3,
      mode: "number",
    })
      .notNull()
      .default(0),
    reorderPoint: numeric("reorder_point", {
      precision: 18,
      scale: 3,
      mode: "number",
    })
      .notNull()
      .default(0),
    parStock: numeric("par_stock", {
      precision: 18,
      scale: 3,
      mode: "number",
    })
      .notNull()
      .default(0),
    defaultStorageLocationId: uuid("default_storage_location_id"),
    isAvailable: boolean("is_available").notNull().default(true),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex("uq_ing_outlet").on(table.outletId, table.ingredientId),
    index("ix_ingredient_outlet_settings_tenant_id").on(table.tenantId),
    index("ix_ingredient_outlet_settings_outlet_id").on(table.outletId),
    index("ix_ingredient_outlet_settings_ingredient_id").on(table.ingredientId),
  ],
);

export const suppliers = pgTable(
  "suppliers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull(),
    code: varchar("code", { length: 40 }).notNull(),
    name: varchar("name", { length: 150 }).notNull(),
    taxId: varchar("tax_id", { length: 40 }),
    contactName: varchar("contact_name", { length: 120 }),
    phone: varchar("phone", { length: 30 }),
    email: citext("email"),
    address: text("address"),
    paymentTermDays: integer("payment_term_days").notNull().default(0),
    leadTimeDays: integer("lead_time_days").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    ...auditColumns,
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    deletedBy: uuid("deleted_by"),
  },
  (table) => [
    uniqueIndex("uq_suppliers_tenant_code_permanent").on(
      table.tenantId,
      table.code,
    ),
    index("ix_suppliers_tenant_id").on(table.tenantId),
    index("ix_suppliers_tenant_active").on(table.tenantId, table.isActive),
    index("ix_suppliers_created_by").on(table.createdBy),
  ],
);

export const supplierIngredients = pgTable(
  "supplier_ingredients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull(),
    supplierId: uuid("supplier_id").notNull(),
    ingredientId: uuid("ingredient_id").notNull(),
    supplierSku: varchar("supplier_sku", { length: 80 }),
    purchaseUnitId: uuid("purchase_unit_id").notNull(),
    conversionToBase: numeric("conversion_to_base", {
      precision: 18,
      scale: 6,
      mode: "number",
    }).notNull(),
    lastPrice: numeric("last_price", {
      precision: 18,
      scale: 2,
      mode: "number",
    }),
    minimumOrderQty: numeric("minimum_order_qty", {
      precision: 18,
      scale: 3,
      mode: "number",
    })
      .notNull()
      .default(1),
    isPreferred: boolean("is_preferred").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    currencyCode: char("currency_code", { length: 3 }).notNull(),
    ...auditColumns,
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    deletedBy: uuid("deleted_by"),
  },
  (table) => [
    uniqueIndex("uq_supplier_catalog").on(
      table.supplierId,
      table.ingredientId,
      table.purchaseUnitId,
    ),
    index("ix_supplier_ingredients_tenant_id").on(table.tenantId),
    index("ix_supplier_ingredients_supplier_active").on(
      table.tenantId,
      table.supplierId,
      table.isActive,
    ),
    index("ix_supplier_ingredients_ingredient").on(
      table.tenantId,
      table.ingredientId,
    ),
    uniqueIndex("uq_supplier_catalog_preferred_active")
      .on(table.tenantId, table.ingredientId, table.purchaseUnitId)
      .where(
        sql`${table.isPreferred} = true and ${table.isActive} = true and ${table.deletedAt} is null`,
      ),
  ],
);

export const menuCategories = pgTable(
  "menu_categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull(),
    code: varchar("code", { length: 40 }).notNull(),
    name: varchar("name", { length: 100 }).notNull(),
    displayOrder: integer("display_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    archivedBy: uuid("archived_by"),
    archiveReason: text("archive_reason"),
    lockVersion: integer("lock_version").notNull().default(1),
    ...auditColumns,
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    deletedBy: uuid("deleted_by"),
  },
  (table) => [
    index("ix_menu_categories_tenant_active_order").on(
      table.tenantId,
      table.isActive,
      table.displayOrder,
    ),
  ],
);

export const menus = pgTable(
  "menus",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull(),
    sku: varchar("sku", { length: 50 }).notNull(),
    name: varchar("name", { length: 150 }).notNull(),
    categoryId: uuid("category_id").notNull(),
    description: text("description"),
    itemType: menuItemType("item_type").notNull().default("recipe"),
    taxProfileId: uuid("tax_profile_id"),
    serviceChargeProfileId: uuid("service_charge_profile_id"),
    isActive: boolean("is_active").notNull().default(true),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    archivedBy: uuid("archived_by"),
    archiveReason: text("archive_reason"),
    lockVersion: integer("lock_version").notNull().default(1),
    ...auditColumns,
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    deletedBy: uuid("deleted_by"),
  },
  (table) => [index("ix_menus_tenant_id").on(table.tenantId)],
);

export const menuVariants = pgTable(
  "menu_variants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull(),
    menuId: uuid("menu_id").notNull(),
    outletId: uuid("outlet_id"),
    code: varchar("code", { length: 40 }).notNull(),
    name: varchar("name", { length: 100 }).notNull(),
    sellingPrice: numeric("selling_price", { precision: 18, scale: 2 }),
    currencyCode: char("currency_code", { length: 3 }).notNull(),
    barcode: varchar("barcode", { length: 100 }),
    isDefault: boolean("is_default").notNull().default(false),
    displayOrder: integer("display_order").notNull().default(0),
    requiresRecipe: boolean("requires_recipe").notNull().default(true),
    requiresKitchen: boolean("requires_kitchen").notNull().default(true),
    isActive: boolean("is_active").notNull().default(true),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    archivedBy: uuid("archived_by"),
    archiveReason: text("archive_reason"),
    lockVersion: integer("lock_version").notNull().default(1),
    ...auditColumns,
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    deletedBy: uuid("deleted_by"),
  },
  (table) => [index("ix_menu_variants_tenant_id").on(table.tenantId)],
);

export const menuVariantOutletSettings = pgTable(
  "menu_variant_outlet_settings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull(),
    outletId: uuid("outlet_id").notNull(),
    menuVariantId: uuid("menu_variant_id").notNull(),
    isAvailable: boolean("is_available").notNull().default(true),
    priceOverride: numeric("price_override", { precision: 18, scale: 2 }),
    isActive: boolean("is_active").notNull().default(true),
    lockVersion: integer("lock_version").notNull().default(1),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex("uq_menu_variant_outlet_setting").on(
      table.tenantId,
      table.outletId,
      table.menuVariantId,
    ),
    index("ix_menu_variant_outlet_lookup").on(
      table.tenantId,
      table.outletId,
      table.isActive,
      table.isAvailable,
    ),
  ],
);

export const recipeHeaders = pgTable(
  "recipe_headers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull(),
    code: varchar("code", { length: 50 }).notNull(),
    name: varchar("name", { length: 150 }).notNull(),
    menuVariantId: uuid("menu_variant_id").notNull(),
    currentApprovedVersionId: uuid("current_approved_version_id"),
    isArchived: boolean("is_archived").notNull().default(false),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    archivedBy: uuid("archived_by"),
    archiveReason: text("archive_reason"),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex("uq_recipe_headers_tenant_code").on(table.tenantId, table.code),
    uniqueIndex("uq_recipe_headers_tenant_variant").on(
      table.tenantId,
      table.menuVariantId,
    ),
  ],
);

export const recipes = pgTable(
  "recipes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull(),
    recipeHeaderId: uuid("recipe_header_id").notNull(),
    menuVariantId: uuid("menu_variant_id").notNull(),
    versionNo: integer("version_no").notNull(),
    yieldQty: numeric("yield_qty", { precision: 18, scale: 3 }).notNull(),
    yieldUnitId: uuid("yield_unit_id"),
    servingCount: numeric("serving_count", {
      precision: 18,
      scale: 3,
    }).notNull(),
    servingSize: numeric("serving_size", { precision: 18, scale: 3 }).notNull(),
    servingUnitId: uuid("serving_unit_id"),
    effectiveFrom: timestamp("effective_from", { withTimezone: true })
      .notNull()
      .defaultNow(),
    effectiveUntil: timestamp("effective_until", { withTimezone: true }),
    status: recipeStatus("status").notNull().default("draft"),
    notes: text("notes"),
    productionInstructions: text("production_instructions"),
    revisionOfId: uuid("revision_of_id"),
    revisionReason: text("revision_reason"),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    approvedBy: uuid("approved_by"),
    approvedOutletId: uuid("approved_outlet_id"),
    approvedCostingRunId: uuid("approved_costing_run_id"),
    costingComplete: boolean("costing_complete").notNull().default(false),
    costingCalculatedAt: timestamp("costing_calculated_at", {
      withTimezone: true,
    }),
    isLegacy: boolean("is_legacy").notNull().default(false),
    lockVersion: integer("lock_version").notNull().default(1),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex("uq_recipe_header_version").on(
      table.recipeHeaderId,
      table.versionNo,
    ),
    index("ix_recipes_tenant_header_status").on(
      table.tenantId,
      table.recipeHeaderId,
      table.status,
    ),
  ],
);

export const recipeItems = pgTable(
  "recipe_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull(),
    recipeId: uuid("recipe_id").notNull(),
    lineNo: integer("line_no").notNull(),
    ingredientId: uuid("ingredient_id").notNull(),
    quantity: numeric("quantity", { precision: 18, scale: 3 }).notNull(),
    unitId: uuid("unit_id").notNull(),
    wastePercentage: numeric("waste_percentage", {
      precision: 5,
      scale: 2,
    }).notNull(),
    netQuantity: numeric("net_quantity", { precision: 18, scale: 6 }).notNull(),
    grossQuantity: numeric("gross_quantity", {
      precision: 18,
      scale: 6,
    }).notNull(),
    conversionToBase: numeric("conversion_to_base", {
      precision: 18,
      scale: 9,
    }),
    baseQuantity: numeric("base_quantity", { precision: 18, scale: 6 }),
    isOptional: boolean("is_optional").notNull().default(false),
    ingredientSkuSnapshot: varchar("ingredient_sku_snapshot", { length: 50 }),
    ingredientNameSnapshot: varchar("ingredient_name_snapshot", {
      length: 150,
    }),
    unitCodeSnapshot: varchar("unit_code_snapshot", { length: 20 }),
    unitNameSnapshot: varchar("unit_name_snapshot", { length: 80 }),
    unitDimensionSnapshot: unitDimension("unit_dimension_snapshot"),
    baseUnitCodeSnapshot: varchar("base_unit_code_snapshot", { length: 20 }),
    baseUnitNameSnapshot: varchar("base_unit_name_snapshot", { length: 80 }),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex("uq_recipe_item_line").on(table.recipeId, table.lineNo),
  ],
);

export const recipeCostingRuns = pgTable(
  "recipe_costing_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull(),
    recipeId: uuid("recipe_id").notNull(),
    outletId: uuid("outlet_id").notNull(),
    runType: varchar("run_type", { length: 24 }).notNull(),
    status: varchar("status", { length: 16 }).notNull(),
    currencyCode: char("currency_code", { length: 3 }).notNull(),
    sellingPriceSnapshot: numeric("selling_price_snapshot", {
      precision: 18,
      scale: 2,
    }),
    totalRecipeCost: numeric("total_recipe_cost", { precision: 18, scale: 2 }),
    costPerYield: numeric("cost_per_yield", { precision: 18, scale: 6 }),
    costPerServing: numeric("cost_per_serving", { precision: 18, scale: 2 }),
    foodCostPercentage: numeric("food_cost_percentage", {
      precision: 9,
      scale: 4,
    }),
    grossProfit: numeric("gross_profit", { precision: 18, scale: 2 }),
    grossMarginPercentage: numeric("gross_margin_percentage", {
      precision: 9,
      scale: 4,
    }),
    warningCodes: jsonb("warning_codes").notNull().default([]),
    calculatedAt: timestamp("calculated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    sourceVersionAt: timestamp("source_version_at", {
      withTimezone: true,
    }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdBy: uuid("created_by"),
  },
  (table) => [
    index("ix_recipe_costing_lookup").on(
      table.tenantId,
      table.recipeId,
      table.outletId,
      table.calculatedAt,
    ),
  ],
);

export const recipeCostingLines = pgTable(
  "recipe_costing_lines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull(),
    costingRunId: uuid("costing_run_id").notNull(),
    recipeItemId: uuid("recipe_item_id").notNull(),
    ingredientId: uuid("ingredient_id").notNull(),
    lineNo: integer("line_no").notNull(),
    ingredientSkuSnapshot: varchar("ingredient_sku_snapshot", {
      length: 50,
    }).notNull(),
    ingredientNameSnapshot: varchar("ingredient_name_snapshot", {
      length: 150,
    }).notNull(),
    unitCodeSnapshot: varchar("unit_code_snapshot", { length: 20 }).notNull(),
    baseUnitCodeSnapshot: varchar("base_unit_code_snapshot", {
      length: 20,
    }).notNull(),
    netQuantity: numeric("net_quantity", { precision: 18, scale: 6 }).notNull(),
    wastePercentage: numeric("waste_percentage", {
      precision: 5,
      scale: 2,
    }).notNull(),
    grossQuantity: numeric("gross_quantity", {
      precision: 18,
      scale: 6,
    }).notNull(),
    conversionToBase: numeric("conversion_to_base", {
      precision: 18,
      scale: 9,
    }).notNull(),
    baseQuantity: numeric("base_quantity", {
      precision: 18,
      scale: 6,
    }).notNull(),
    costSource: varchar("cost_source", { length: 32 }).notNull(),
    costPerBaseUnit: numeric("cost_per_base_unit", { precision: 18, scale: 6 }),
    totalCost: numeric("total_cost", { precision: 18, scale: 2 }),
    currencyCode: char("currency_code", { length: 3 }).notNull(),
    inventorySourceAt: timestamp("inventory_source_at", { withTimezone: true }),
    inventoryBatchIds: jsonb("inventory_batch_ids"),
    supplierCatalogId: uuid("supplier_catalog_id"),
    supplierSourceAt: timestamp("supplier_source_at", { withTimezone: true }),
    warningCode: varchar("warning_code", { length: 80 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("uq_recipe_costing_line").on(
      table.costingRunId,
      table.recipeItemId,
    ),
  ],
);

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

export const purchaseOrders = pgTable(
  "purchase_orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull(),
    outletId: uuid("outlet_id").notNull(),
    poNo: varchar("po_no", { length: 50 }).notNull(),
    supplierId: uuid("supplier_id").notNull(),
    supplierCodeSnapshot: varchar("supplier_code_snapshot", {
      length: 40,
    }).notNull(),
    supplierNameSnapshot: varchar("supplier_name_snapshot", {
      length: 150,
    }).notNull(),
    supplierContactNameSnapshot: varchar("supplier_contact_name_snapshot", {
      length: 120,
    }),
    supplierPhoneSnapshot: varchar("supplier_phone_snapshot", { length: 30 }),
    supplierEmailSnapshot: text("supplier_email_snapshot"),
    supplierAddressSnapshot: text("supplier_address_snapshot"),
    paymentTermDaysSnapshot: integer("payment_term_days_snapshot"),
    leadTimeDaysSnapshot: integer("lead_time_days_snapshot"),
    purchaseRequestId: uuid("purchase_request_id"),
    orderDate: date("order_date").notNull(),
    expectedDate: date("expected_date"),
    status: purchaseOrderStatus("status").notNull().default("draft"),
    subtotal: numeric("subtotal", { precision: 18, scale: 2, mode: "number" })
      .notNull()
      .default(0),
    discountAmount: numeric("discount_amount", {
      precision: 18,
      scale: 2,
      mode: "number",
    })
      .notNull()
      .default(0),
    taxAmount: numeric("tax_amount", {
      precision: 18,
      scale: 2,
      mode: "number",
    })
      .notNull()
      .default(0),
    shippingAmount: numeric("shipping_amount", {
      precision: 18,
      scale: 2,
      mode: "number",
    })
      .notNull()
      .default(0),
    grandTotal: numeric("grand_total", {
      precision: 18,
      scale: 2,
      mode: "number",
    })
      .notNull()
      .default(0),
    currencyCode: char("currency_code", { length: 3 }).notNull().default("IDR"),
    notes: text("notes"),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex("uq_po_no").on(table.outletId, table.poNo),
    index("ix_purchase_orders_tenant_id").on(table.tenantId),
    index("ix_purchase_orders_outlet_id").on(table.outletId),
    index("ix_purchase_orders_supplier_id").on(table.supplierId),
  ],
);

export const purchaseOrderItems = pgTable(
  "purchase_order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull(),
    purchaseOrderId: uuid("purchase_order_id").notNull(),
    ingredientId: uuid("ingredient_id").notNull(),
    ingredientSkuSnapshot: varchar("ingredient_sku_snapshot", {
      length: 50,
    }).notNull(),
    ingredientNameSnapshot: varchar("ingredient_name_snapshot", {
      length: 150,
    }).notNull(),
    supplierCatalogId: uuid("supplier_catalog_id"),
    supplierSkuSnapshot: varchar("supplier_sku_snapshot", { length: 80 }),
    quantityOrdered: numeric("quantity_ordered", {
      precision: 18,
      scale: 3,
      mode: "number",
    }).notNull(),
    purchaseUnitId: uuid("purchase_unit_id").notNull(),
    purchaseUnitCodeSnapshot: varchar("purchase_unit_code_snapshot", {
      length: 20,
    }).notNull(),
    purchaseUnitNameSnapshot: varchar("purchase_unit_name_snapshot", {
      length: 80,
    }).notNull(),
    conversionToBase: numeric("conversion_to_base", {
      precision: 18,
      scale: 6,
      mode: "number",
    }).notNull(),
    minimumOrderQtySnapshot: numeric("minimum_order_qty_snapshot", {
      precision: 18,
      scale: 3,
      mode: "number",
    }).notNull(),
    unitPrice: numeric("unit_price", {
      precision: 18,
      scale: 2,
      mode: "number",
    }).notNull(),
    discountAmount: numeric("discount_amount", {
      precision: 18,
      scale: 2,
      mode: "number",
    })
      .notNull()
      .default(0),
    taxAmount: numeric("tax_amount", {
      precision: 18,
      scale: 2,
      mode: "number",
    })
      .notNull()
      .default(0),
    lineTotal: numeric("line_total", {
      precision: 18,
      scale: 2,
      mode: "number",
    }).notNull(),
    quantityReceived: numeric("quantity_received", {
      precision: 18,
      scale: 3,
      mode: "number",
    })
      .notNull()
      .default(0),
    ...auditColumns,
  },
  (table) => [
    index("ix_purchase_order_items_tenant_id").on(table.tenantId),
    index("ix_purchase_order_items_purchase_order_id").on(
      table.purchaseOrderId,
    ),
    index("ix_purchase_order_items_ingredient_id").on(table.ingredientId),
  ],
);

export const goodsReceipts = pgTable(
  "goods_receipts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull(),
    outletId: uuid("outlet_id").notNull(),
    receiptNo: varchar("receipt_no", { length: 50 }).notNull(),
    purchaseOrderId: uuid("purchase_order_id").notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull(),
    receivedBy: uuid("received_by").notNull(),
    status: goodsReceiptStatus("status").notNull().default("draft"),
    supplierDeliveryNo: varchar("supplier_delivery_no", { length: 80 }),
    supplierInvoiceNo: varchar("supplier_invoice_no", { length: 80 }),
    notes: text("notes"),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex("uq_gr_no").on(table.outletId, table.receiptNo),
    index("ix_goods_receipts_tenant_id").on(table.tenantId),
    index("ix_goods_receipts_outlet_id").on(table.outletId),
    index("ix_goods_receipts_purchase_order_id").on(table.purchaseOrderId),
  ],
);

export const goodsReceiptItems = pgTable(
  "goods_receipt_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull(),
    goodsReceiptId: uuid("goods_receipt_id").notNull(),
    purchaseOrderItemId: uuid("purchase_order_item_id").notNull(),
    ingredientId: uuid("ingredient_id").notNull(),
    quantityReceived: numeric("quantity_received", {
      precision: 18,
      scale: 3,
      mode: "number",
    }).notNull(),
    quantityRejected: numeric("quantity_rejected", {
      precision: 18,
      scale: 3,
      mode: "number",
    })
      .notNull()
      .default(0),
    rejectionReason: varchar("rejection_reason", { length: 500 }),
    purchaseUnitId: uuid("purchase_unit_id").notNull(),
    baseQuantity: numeric("base_quantity", {
      precision: 18,
      scale: 3,
      mode: "number",
    }).notNull(),
    unitCostBase: numeric("unit_cost_base", {
      precision: 18,
      scale: 6,
      mode: "number",
    }).notNull(),
    batchNo: varchar("batch_no", { length: 80 }),
    expiryDate: date("expiry_date"),
    storageLocationId: uuid("storage_location_id").notNull(),
    ...auditColumns,
  },
  (table) => [
    index("ix_goods_receipt_items_tenant_id").on(table.tenantId),
    index("ix_goods_receipt_items_goods_receipt_id").on(table.goodsReceiptId),
    index("ix_goods_receipt_items_purchase_order_item_id").on(
      table.purchaseOrderItemId,
    ),
  ],
);

export const storageLocations = pgTable(
  "storage_locations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull(),
    outletId: uuid("outlet_id").notNull(),
    code: varchar("code", { length: 40 }).notNull(),
    name: varchar("name", { length: 120 }).notNull(),
    locationType: storageLocationType("location_type")
      .notNull()
      .default("storage"),
    allowNegativeStock: boolean("allow_negative_stock")
      .notNull()
      .default(false),
    isActive: boolean("is_active").notNull().default(true),
    ...auditColumns,
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    deletedBy: uuid("deleted_by"),
  },
  (table) => [
    uniqueIndex("uq_storage_location_code")
      .on(table.outletId, table.code)
      .where(sql`${table.deletedAt} IS NULL`),
    index("ix_storage_locations_tenant_id").on(table.tenantId),
    index("ix_storage_locations_outlet_id").on(table.outletId),
  ],
);

export const stockBatches = pgTable(
  "stock_batches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull(),
    outletId: uuid("outlet_id").notNull(),
    ingredientId: uuid("ingredient_id").notNull(),
    storageLocationId: uuid("storage_location_id").notNull(),
    batchNo: varchar("batch_no", { length: 80 }),
    receivedDate: date("received_date").notNull(),
    expiryDate: date("expiry_date"),
    unitCost: numeric("unit_cost", {
      precision: 18,
      scale: 6,
      mode: "number",
    }).notNull(),
    quantityOnHand: numeric("quantity_on_hand", {
      precision: 18,
      scale: 3,
      mode: "number",
    })
      .notNull()
      .default(0),
    sourceReceiptItemId: uuid("source_receipt_item_id"),
    ...auditColumns,
  },
  (table) => [
    index("ix_stock_batches_tenant_id").on(table.tenantId),
    index("ix_stock_batches_outlet_id").on(table.outletId),
    index("ix_stock_batches_source_receipt_item_id").on(
      table.sourceReceiptItemId,
    ),
  ],
);

export const stockMovements = pgTable(
  "stock_movements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull(),
    outletId: uuid("outlet_id").notNull(),
    movementNo: varchar("movement_no", { length: 50 }).notNull(),
    movementType: stockMovementType("movement_type").notNull(),
    movementAt: timestamp("movement_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    businessDate: date("business_date").notNull(),
    referenceType: varchar("reference_type", { length: 60 }),
    referenceId: uuid("reference_id"),
    status: stockMovementStatus("status").notNull().default("posted"),
    reversalOfId: uuid("reversal_of_id"),
    reason: text("reason"),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex("uq_stock_movement_no").on(table.outletId, table.movementNo),
    uniqueIndex("uq_stock_movement_sales_order")
      .on(table.tenantId, table.referenceId)
      .where(
        sql`${table.referenceType} = 'sales_order' and ${table.movementType} = 'sale_consumption' and ${table.status} = 'posted'`,
      ),
    index("ix_stock_movements_tenant_id").on(table.tenantId),
    index("ix_stock_movements_outlet_id").on(table.outletId),
  ],
);

export const stockMovementLines = pgTable(
  "stock_movement_lines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull(),
    stockMovementId: uuid("stock_movement_id").notNull(),
    ingredientId: uuid("ingredient_id").notNull(),
    storageLocationId: uuid("storage_location_id").notNull(),
    stockBatchId: uuid("stock_batch_id"),
    quantityDelta: numeric("quantity_delta", {
      precision: 18,
      scale: 3,
      mode: "number",
    }).notNull(),
    unitCost: numeric("unit_cost", {
      precision: 18,
      scale: 6,
      mode: "number",
    }).notNull(),
    valueDelta: numeric("value_delta", {
      precision: 18,
      scale: 2,
      mode: "number",
    }).notNull(),
    balanceAfter: numeric("balance_after", {
      precision: 18,
      scale: 3,
      mode: "number",
    }),
    ...auditColumns,
  },
  (table) => [
    index("ix_stock_movement_lines_tenant_id").on(table.tenantId),
    index("ix_stock_movement_lines_stock_movement_id").on(
      table.stockMovementId,
    ),
  ],
);

export const salesOrders = pgTable(
  "sales_orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull(),
    outletId: uuid("outlet_id").notNull(),
    orderNo: varchar("order_no", { length: 50 }).notNull(),
    receiptNo: varchar("receipt_no", { length: 50 }),
    businessDate: date("business_date").notNull(),
    orderType: salesOrderType("order_type").notNull(),
    tableNumber: varchar("table_number", { length: 30 }),
    customerName: varchar("customer_name", { length: 150 }),
    notes: text("notes"),
    currencyCode: char("currency_code", { length: 3 }).notNull(),
    status: salesOrderStatus("status").notNull().default("draft"),
    paymentStatus: posPaymentStatus("payment_status")
      .notNull()
      .default("unpaid"),
    subtotal: numeric("subtotal", {
      precision: 18,
      scale: 2,
      mode: "number",
    })
      .notNull()
      .default(0),
    totalAmount: numeric("total_amount", {
      precision: 18,
      scale: 2,
      mode: "number",
    })
      .notNull()
      .default(0),
    createdBy: uuid("created_by").notNull(),
    cashierId: uuid("cashier_id").notNull(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    submittedBy: uuid("submitted_by"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    completedBy: uuid("completed_by"),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    cancelledBy: uuid("cancelled_by"),
    cancellationReason: text("cancellation_reason"),
    lockVersion: integer("lock_version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedBy: uuid("updated_by"),
  },
  (table) => [
    uniqueIndex("uq_sales_orders_number").on(
      table.tenantId,
      table.outletId,
      table.orderNo,
    ),
    uniqueIndex("uq_sales_orders_tenant_id").on(table.tenantId, table.id),
    uniqueIndex("uq_sales_orders_scope_id").on(
      table.tenantId,
      table.outletId,
      table.id,
    ),
    uniqueIndex("uq_sales_orders_receipt")
      .on(table.tenantId, table.outletId, table.receiptNo)
      .where(sql`${table.receiptNo} is not null`),
    index("ix_sales_orders_scope_date").on(
      table.tenantId,
      table.outletId,
      table.businessDate,
    ),
    index("ix_sales_orders_scope_status").on(
      table.tenantId,
      table.outletId,
      table.status,
      table.updatedAt,
    ),
    index("ix_sales_orders_cashier").on(
      table.tenantId,
      table.cashierId,
      table.businessDate,
    ),
  ],
);

export const salesOrderItems = pgTable(
  "sales_order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull(),
    salesOrderId: uuid("sales_order_id").notNull(),
    lineNo: integer("line_no").notNull(),
    menuId: uuid("menu_id").notNull(),
    menuCodeSnapshot: varchar("menu_code_snapshot", { length: 50 }).notNull(),
    menuNameSnapshot: varchar("menu_name_snapshot", {
      length: 150,
    }).notNull(),
    menuVariantId: uuid("menu_variant_id").notNull(),
    variantCodeSnapshot: varchar("variant_code_snapshot", {
      length: 40,
    }).notNull(),
    variantNameSnapshot: varchar("variant_name_snapshot", {
      length: 100,
    }).notNull(),
    menuCategoryId: uuid("menu_category_id").notNull(),
    categoryCodeSnapshot: varchar("category_code_snapshot", {
      length: 40,
    }).notNull(),
    categoryNameSnapshot: varchar("category_name_snapshot", {
      length: 100,
    }).notNull(),
    effectivePriceSource: varchar("effective_price_source", {
      length: 24,
    }).notNull(),
    priceSourceVersionAt: timestamp("price_source_version_at", {
      withTimezone: true,
    }).notNull(),
    unitPrice: numeric("unit_price", {
      precision: 18,
      scale: 2,
      mode: "number",
    }).notNull(),
    quantity: integer("quantity").notNull(),
    lineSubtotal: numeric("line_subtotal", {
      precision: 18,
      scale: 2,
      mode: "number",
    }).notNull(),
    currencyCode: char("currency_code", { length: 3 }).notNull(),
    notes: text("notes"),
    requiresRecipe: boolean("requires_recipe").notNull(),
    requiresKitchen: boolean("requires_kitchen").notNull(),
    recipeHeaderId: uuid("recipe_header_id"),
    recipeVersionId: uuid("recipe_version_id"),
    recipeVersionNo: integer("recipe_version_no"),
    status: salesOrderItemStatus("status").notNull().default("draft"),
    queuedAt: timestamp("queued_at", { withTimezone: true }),
    preparingAt: timestamp("preparing_at", { withTimezone: true }),
    readyAt: timestamp("ready_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    cancelledBy: uuid("cancelled_by"),
    cancellationReason: text("cancellation_reason"),
    lockVersion: integer("lock_version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdBy: uuid("created_by").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedBy: uuid("updated_by"),
  },
  (table) => [
    uniqueIndex("uq_sales_order_item_line").on(
      table.salesOrderId,
      table.lineNo,
    ),
    uniqueIndex("uq_sales_order_items_scope_id").on(
      table.tenantId,
      table.salesOrderId,
      table.id,
    ),
    index("ix_sales_order_items_order").on(
      table.tenantId,
      table.salesOrderId,
      table.lineNo,
    ),
    index("ix_sales_order_items_kitchen_queue")
      .on(table.tenantId, table.status, table.queuedAt)
      .where(sql`${table.requiresKitchen} = true`),
    index("ix_sales_order_items_variant").on(
      table.tenantId,
      table.menuVariantId,
    ),
  ],
);

export const salesOrderItemStatusHistory = pgTable(
  "sales_order_item_status_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull(),
    outletId: uuid("outlet_id").notNull(),
    salesOrderId: uuid("sales_order_id").notNull(),
    salesOrderItemId: uuid("sales_order_item_id").notNull(),
    fromStatus: salesOrderItemStatus("from_status"),
    toStatus: salesOrderItemStatus("to_status").notNull(),
    changedBy: uuid("changed_by").notNull(),
    reason: text("reason"),
    changedAt: timestamp("changed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("ix_sales_item_history_item_time").on(
      table.tenantId,
      table.salesOrderItemId,
      table.changedAt,
    ),
    index("ix_sales_item_history_order_time").on(
      table.tenantId,
      table.salesOrderId,
      table.changedAt,
    ),
  ],
);

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull(),
    outletId: uuid("outlet_id").notNull(),
    salesOrderId: uuid("sales_order_id").notNull(),
    originalPaymentId: uuid("original_payment_id"),
    entryType: posPaymentEntryType("entry_type").notNull().default("payment"),
    method: posPaymentMethod("method").notNull(),
    status: posPaymentStatus("status").notNull(),
    currencyCode: char("currency_code", { length: 3 }).notNull(),
    amountApplied: numeric("amount_applied", {
      precision: 18,
      scale: 2,
      mode: "number",
    }).notNull(),
    amountTendered: numeric("amount_tendered", {
      precision: 18,
      scale: 2,
      mode: "number",
    }).notNull(),
    changeAmount: numeric("change_amount", {
      precision: 18,
      scale: 2,
      mode: "number",
    })
      .notNull()
      .default(0),
    externalReference: varchar("external_reference", { length: 150 }),
    reason: text("reason"),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    voidedAt: timestamp("voided_at", { withTimezone: true }),
    cashierId: uuid("cashier_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdBy: uuid("created_by").notNull(),
  },
  (table) => [
    uniqueIndex("uq_payments_scope_id").on(table.tenantId, table.id),
    uniqueIndex("uq_payments_order_entry")
      .on(table.tenantId, table.salesOrderId)
      .where(sql`${table.entryType} = 'payment'`),
    uniqueIndex("uq_payments_refund_original")
      .on(table.tenantId, table.originalPaymentId)
      .where(sql`${table.entryType} = 'manual_refund'`),
    index("ix_payments_order").on(
      table.tenantId,
      table.salesOrderId,
      table.createdAt,
    ),
    index("ix_payments_reference")
      .on(table.tenantId, table.externalReference)
      .where(sql`${table.externalReference} is not null`),
  ],
);

export const salesItemConsumptions = pgTable(
  "sales_item_consumptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull(),
    outletId: uuid("outlet_id").notNull(),
    salesOrderId: uuid("sales_order_id").notNull(),
    salesOrderItemId: uuid("sales_order_item_id").notNull(),
    recipeVersionId: uuid("recipe_version_id").notNull(),
    recipeItemId: uuid("recipe_item_id").notNull(),
    ingredientId: uuid("ingredient_id").notNull(),
    ingredientSkuSnapshot: varchar("ingredient_sku_snapshot", {
      length: 50,
    }).notNull(),
    ingredientNameSnapshot: varchar("ingredient_name_snapshot", {
      length: 150,
    }).notNull(),
    baseUnitCodeSnapshot: varchar("base_unit_code_snapshot", {
      length: 20,
    }).notNull(),
    isOptional: boolean("is_optional").notNull().default(false),
    requiredBaseQuantity: numeric("required_base_quantity", {
      precision: 18,
      scale: 6,
      mode: "number",
    }).notNull(),
    consumedBaseQuantity: numeric("consumed_base_quantity", {
      precision: 18,
      scale: 6,
      mode: "number",
    })
      .notNull()
      .default(0),
    status: salesConsumptionStatus("status").notNull().default("planned"),
    skippedReason: varchar("skipped_reason", { length: 80 }),
    stockBatchId: uuid("stock_batch_id"),
    stockMovementId: uuid("stock_movement_id"),
    stockMovementLineId: uuid("stock_movement_line_id"),
    reversalStockMovementLineId: uuid("reversal_stock_movement_line_id"),
    unitCostSnapshot: numeric("unit_cost_snapshot", {
      precision: 18,
      scale: 6,
      mode: "number",
    }),
    valueSnapshot: numeric("value_snapshot", {
      precision: 18,
      scale: 2,
      mode: "number",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdBy: uuid("created_by").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedBy: uuid("updated_by"),
  },
  (table) => [
    uniqueIndex("uq_sales_consumption_allocation").on(
      table.salesOrderItemId,
      table.recipeItemId,
      table.stockBatchId,
    ),
    uniqueIndex("uq_sales_consumption_unallocated")
      .on(table.salesOrderItemId, table.recipeItemId)
      .where(sql`${table.stockBatchId} is null`),
    index("ix_sales_consumptions_order").on(
      table.tenantId,
      table.salesOrderId,
    ),
    index("ix_sales_consumptions_item").on(
      table.tenantId,
      table.salesOrderItemId,
    ),
    index("ix_sales_consumptions_movement")
      .on(table.tenantId, table.stockMovementId)
      .where(sql`${table.stockMovementId} is not null`),
  ],
);

export const posOperationRequests = pgTable(
  "pos_operation_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull(),
    outletId: uuid("outlet_id").notNull(),
    idempotencyKey: uuid("idempotency_key").notNull(),
    operation: varchar("operation", { length: 60 }).notNull(),
    requestHash: char("request_hash", { length: 64 }).notNull(),
    status: posOperationStatus("status").notNull().default("processing"),
    salesOrderId: uuid("sales_order_id"),
    paymentId: uuid("payment_id"),
    responseStatus: integer("response_status"),
    responseBody: jsonb("response_body"),
    errorCode: varchar("error_code", { length: 80 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    leaseExpiresAt: timestamp("lease_expires_at", { withTimezone: true })
      .notNull()
      .default(sql`now() + interval '5 minutes'`),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("uq_pos_operation_idempotency").on(
      table.tenantId,
      table.idempotencyKey,
    ),
    index("ix_pos_operations_scope_time").on(
      table.tenantId,
      table.outletId,
      table.createdAt,
    ),
    index("ix_pos_operations_order")
      .on(table.tenantId, table.salesOrderId)
      .where(sql`${table.salesOrderId} is not null`),
  ],
);
