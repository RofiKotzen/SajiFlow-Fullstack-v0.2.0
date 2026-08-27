import "dotenv/config";
import { randomUUID } from "node:crypto";
import { hash } from "bcryptjs";
import { and, eq, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
  outlets,
  permissions,
  ingredientCategories,
  ingredientOutletSettings,
  ingredients,
  rolePermissions,
  roles,
  supplierIngredients,
  suppliers,
  storageLocations,
  tenants,
  units,
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
  ["budgets.read", "budgets", "Melihat rencana dan realisasi anggaran"],
  ["budgets.create", "budgets", "Membuat rencana anggaran"],
  ["budgets.update", "budgets", "Mengubah anggaran draft atau rejected"],
  ["budgets.submit", "budgets", "Mengajukan anggaran untuk persetujuan"],
  ["budgets.approve", "budgets", "Menyetujui anggaran"],
  ["budgets.reject", "budgets", "Menolak anggaran dengan alasan"],
  ["budgets.close", "budgets", "Menutup periode anggaran approved"],
  ["purchase_orders.read", "purchase_orders", "Melihat purchase order"],
  ["purchase_orders.create", "purchase_orders", "Membuat purchase order draft"],
  [
    "purchase_orders.update",
    "purchase_orders",
    "Mengubah purchase order draft",
  ],
  ["purchase_orders.approve", "purchase_orders", "Menyetujui purchase order"],
  [
    "purchase_orders.send",
    "purchase_orders",
    "Menandai purchase order telah dikirim",
  ],
  [
    "purchase_orders.cancel",
    "purchase_orders",
    "Membatalkan purchase order dengan alasan",
  ],
  [
    "purchase_orders.close",
    "purchase_orders",
    "Menutup purchase order yang telah diterima",
  ],
  ["goods_receipts.read", "goods_receipts", "Melihat penerimaan barang"],
  ["goods_receipts.create", "goods_receipts", "Membuat Goods Receipt draft"],
  ["goods_receipts.update", "goods_receipts", "Mengubah Goods Receipt draft"],
  [
    "goods_receipts.post",
    "goods_receipts",
    "Memposting penerimaan ke batch dan ledger stok",
  ],
  [
    "goods_receipts.void",
    "goods_receipts",
    "Membatalkan penerimaan melalui reversal stok",
  ],
  ["inventory.read", "inventory", "Melihat saldo, batch, dan ledger stok"],
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

    const shouldSeedSamples =
      process.env.SEED_SAMPLE_DATA === "true" ||
      (process.env.SEED_SAMPLE_DATA === undefined &&
        process.env.NODE_ENV !== "production");
    if (shouldSeedSamples) {
      const locationSpecs = [
        { code: "MAIN-WH", name: "Gudang Utama", type: "storage" },
        { code: "CHILLER", name: "Chiller Utama", type: "chiller" },
        { code: "FREEZER", name: "Freezer Utama", type: "freezer" },
      ] as const;
      for (const spec of locationSpecs) {
        const [existingLocation] = await db
          .select({ id: storageLocations.id })
          .from(storageLocations)
          .where(
            and(
              eq(storageLocations.tenantId, tenant.id),
              eq(storageLocations.outletId, outlet.id),
              eq(storageLocations.code, spec.code),
              isNull(storageLocations.deletedAt),
            ),
          )
          .limit(1);
        if (!existingLocation) {
          await db.insert(storageLocations).values({
            tenantId: tenant.id,
            outletId: outlet.id,
            code: spec.code,
            name: spec.name,
            locationType: spec.type,
            createdBy: admin.id,
            updatedBy: admin.id,
          });
        }
      }

      const unitSpecs = [
        { code: "KG", name: "Kilogram", dimension: "mass", decimalScale: 3 },
        { code: "L", name: "Liter", dimension: "volume", decimalScale: 3 },
        { code: "PCS", name: "Pieces", dimension: "count", decimalScale: 0 },
      ] as const;
      const unitMap = new Map<string, typeof units.$inferSelect>();
      for (const spec of unitSpecs) {
        let [unit] = await db
          .select()
          .from(units)
          .where(
            and(
              eq(units.tenantId, tenant.id),
              eq(units.code, spec.code),
              isNull(units.deletedAt),
            ),
          )
          .limit(1);
        if (!unit) {
          [unit] = await db
            .insert(units)
            .values({
              tenantId: tenant.id,
              code: spec.code,
              name: spec.name,
              dimension: spec.dimension,
              isBase: true,
              decimalScale: spec.decimalScale,
              createdBy: admin.id,
              updatedBy: admin.id,
            })
            .returning();
        }
        unitMap.set(spec.code, unit);
      }

      const categoryNames = [
        "Fresh Produce",
        "Meat & Poultry",
        "Dry Goods",
        "Dairy",
        "Beverage",
        "Packaging",
      ];
      const categoryMap = new Map<
        string,
        typeof ingredientCategories.$inferSelect
      >();
      for (const name of categoryNames) {
        let [category] = await db
          .select()
          .from(ingredientCategories)
          .where(
            and(
              eq(ingredientCategories.tenantId, tenant.id),
              eq(ingredientCategories.name, name),
              isNull(ingredientCategories.deletedAt),
            ),
          )
          .limit(1);
        if (!category) {
          [category] = await db
            .insert(ingredientCategories)
            .values({
              tenantId: tenant.id,
              name,
              createdBy: admin.id,
              updatedBy: admin.id,
            })
            .returning();
        }
        categoryMap.set(name, category);
      }

      const ingredientSpecs = [
        {
          sku: "ING-AVOCADO",
          name: "Avocado Hass",
          category: "Fresh Produce",
          unit: "KG",
          perishable: true,
          shelfLife: 5,
        },
        {
          sku: "ING-ROMAINE",
          name: "Romaine Lettuce",
          category: "Fresh Produce",
          unit: "KG",
          perishable: true,
          shelfLife: 4,
        },
        {
          sku: "ING-BEEF",
          name: "Beef Tenderloin",
          category: "Meat & Poultry",
          unit: "KG",
          perishable: true,
          shelfLife: 5,
        },
        {
          sku: "ING-CHICKEN",
          name: "Chicken Breast",
          category: "Meat & Poultry",
          unit: "KG",
          perishable: true,
          shelfLife: 4,
        },
        {
          sku: "ING-PASTA",
          name: "Fettuccine Pasta",
          category: "Dry Goods",
          unit: "KG",
          perishable: false,
        },
        {
          sku: "ING-CREAM",
          name: "Cooking Cream",
          category: "Dairy",
          unit: "L",
          perishable: true,
          shelfLife: 14,
        },
        {
          sku: "ING-MILK",
          name: "Fresh Milk",
          category: "Dairy",
          unit: "L",
          perishable: true,
          shelfLife: 7,
        },
        {
          sku: "ING-COFFEE",
          name: "Espresso Beans",
          category: "Beverage",
          unit: "KG",
          perishable: false,
        },
        {
          sku: "ING-CUP",
          name: "Paper Cup 12 oz",
          category: "Packaging",
          unit: "PCS",
          perishable: false,
        },
      ] as const;
      const ingredientMap = new Map<string, typeof ingredients.$inferSelect>();
      for (const spec of ingredientSpecs) {
        let [ingredient] = await db
          .select()
          .from(ingredients)
          .where(
            and(
              eq(ingredients.tenantId, tenant.id),
              eq(ingredients.sku, spec.sku),
              isNull(ingredients.deletedAt),
            ),
          )
          .limit(1);
        if (!ingredient) {
          [ingredient] = await db
            .insert(ingredients)
            .values({
              tenantId: tenant.id,
              sku: spec.sku,
              name: spec.name,
              categoryId: categoryMap.get(spec.category)!.id,
              baseUnitId: unitMap.get(spec.unit)!.id,
              isPerishable: spec.perishable,
              shelfLifeDays: "shelfLife" in spec ? spec.shelfLife : undefined,
              createdBy: admin.id,
              updatedBy: admin.id,
            })
            .returning();
        }
        ingredientMap.set(spec.sku, ingredient);
      }

      const [defaultStorageLocation] = await db
        .select({ id: storageLocations.id })
        .from(storageLocations)
        .where(
          and(
            eq(storageLocations.tenantId, tenant.id),
            eq(storageLocations.outletId, outlet.id),
            eq(storageLocations.code, "MAIN-WH"),
            isNull(storageLocations.deletedAt),
          ),
        )
        .limit(1);
      const stockSettings = [
        ["ING-AVOCADO", 5, 8, 15],
        ["ING-ROMAINE", 4, 7, 12],
        ["ING-BEEF", 6, 10, 18],
        ["ING-CHICKEN", 10, 15, 30],
        ["ING-PASTA", 5, 8, 20],
        ["ING-CREAM", 6, 10, 20],
        ["ING-MILK", 12, 20, 40],
        ["ING-COFFEE", 5, 7, 15],
        ["ING-CUP", 50, 100, 300],
      ] as const;
      for (const [
        ingredientSku,
        minimumStock,
        reorderPoint,
        parStock,
      ] of stockSettings) {
        await db
          .insert(ingredientOutletSettings)
          .values({
            tenantId: tenant.id,
            outletId: outlet.id,
            ingredientId: ingredientMap.get(ingredientSku)!.id,
            minimumStock,
            reorderPoint,
            parStock,
            defaultStorageLocationId: defaultStorageLocation?.id,
            createdBy: admin.id,
            updatedBy: admin.id,
          })
          .onConflictDoNothing({
            target: [
              ingredientOutletSettings.outletId,
              ingredientOutletSettings.ingredientId,
            ],
          });
      }

      const supplierSpecs = [
        {
          code: "SUP-001",
          name: "PT Segar Pangan Nusantara",
          contact: "Maya",
          phone: "0812-0000-1001",
          terms: 14,
          lead: 1,
        },
        {
          code: "SUP-002",
          name: "Sumber Protein Sejahtera",
          contact: "Ardi",
          phone: "0812-0000-1002",
          terms: 14,
          lead: 2,
        },
        {
          code: "SUP-003",
          name: "CV Bumi Rempah",
          contact: "Rian",
          phone: "0812-0000-1003",
          terms: 30,
          lead: 3,
        },
        {
          code: "SUP-004",
          name: "Dairyland Cianjur",
          contact: "Sinta",
          phone: "0812-0000-1004",
          terms: 14,
          lead: 1,
        },
        {
          code: "SUP-005",
          name: "Kemasan Prima",
          contact: "Bimo",
          phone: "0812-0000-1005",
          terms: 30,
          lead: 3,
        },
      ] as const;
      const supplierMap = new Map<string, typeof suppliers.$inferSelect>();
      for (const spec of supplierSpecs) {
        let [supplier] = await db
          .select()
          .from(suppliers)
          .where(
            and(
              eq(suppliers.tenantId, tenant.id),
              eq(suppliers.code, spec.code),
              isNull(suppliers.deletedAt),
            ),
          )
          .limit(1);
        if (!supplier) {
          [supplier] = await db
            .insert(suppliers)
            .values({
              tenantId: tenant.id,
              code: spec.code,
              name: spec.name,
              contactName: spec.contact,
              phone: spec.phone,
              paymentTermDays: spec.terms,
              leadTimeDays: spec.lead,
              createdBy: admin.id,
              updatedBy: admin.id,
            })
            .returning();
        }
        supplierMap.set(spec.code, supplier);
      }

      const catalogSpecs = [
        ["SUP-001", "ING-AVOCADO", 90000],
        ["SUP-001", "ING-ROMAINE", 42000],
        ["SUP-002", "ING-BEEF", 245000],
        ["SUP-002", "ING-CHICKEN", 65000],
        ["SUP-003", "ING-PASTA", 36000],
        ["SUP-003", "ING-COFFEE", 185000],
        ["SUP-004", "ING-CREAM", 85000],
        ["SUP-004", "ING-MILK", 25000],
        ["SUP-005", "ING-CUP", 2500],
      ] as const;
      for (const [supplierCode, ingredientSku, lastPrice] of catalogSpecs) {
        const supplier = supplierMap.get(supplierCode)!;
        const ingredient = ingredientMap.get(ingredientSku)!;
        const [existingCatalog] = await db
          .select({ id: supplierIngredients.id })
          .from(supplierIngredients)
          .where(
            and(
              eq(supplierIngredients.tenantId, tenant.id),
              eq(supplierIngredients.supplierId, supplier.id),
              eq(supplierIngredients.ingredientId, ingredient.id),
              eq(supplierIngredients.purchaseUnitId, ingredient.baseUnitId),
            ),
          )
          .limit(1);
        if (!existingCatalog) {
          await db.insert(supplierIngredients).values({
            tenantId: tenant.id,
            supplierId: supplier.id,
            ingredientId: ingredient.id,
            purchaseUnitId: ingredient.baseUnitId,
            conversionToBase: 1,
            lastPrice,
            minimumOrderQty: 1,
            isPreferred: true,
            createdBy: admin.id,
            updatedBy: admin.id,
          });
        }
      }
    }

    console.log("Seed selesai");
    console.log(`Tenant : ${tenant.code} (${tenant.id})`);
    console.log(`Outlet : ${outlet.code} (${outlet.id})`);
    console.log(`Admin  : ${admin.email}`);
    console.log(
      `Sample : ${shouldSeedSamples ? "master bahan, supplier & lokasi stok siap" : "dilewati"}`,
    );
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
