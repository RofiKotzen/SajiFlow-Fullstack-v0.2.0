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
  name: varchar("name", { length: 100 }).notNull(),
  parentId: uuid("parent_id"),
  isActive: boolean("is_active").notNull().default(true),
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
