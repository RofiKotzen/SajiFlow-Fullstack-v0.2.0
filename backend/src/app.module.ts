import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { AuditModule } from "./audit/audit.module";
import { AuthModule } from "./auth/auth.module";
import { BudgetsModule } from "./budgets/budgets.module";
import { JwtAuthGuard } from "./common/guards/jwt-auth.guard";
import { PermissionsGuard } from "./common/guards/permissions.guard";
import { validateEnv } from "./config/env.validation";
import { DatabaseModule } from "./database/database.module";
import { HealthModule } from "./health/health.module";
import { InventoryModule } from "./inventory/inventory.module";
import { IngredientsModule } from "./ingredients/ingredients.module";
import { GoodsReceiptsModule } from "./goods-receipts/goods-receipts.module";
import { OutletsModule } from "./outlets/outlets.module";
import { PermissionsModule } from "./permissions/permissions.module";
import { PurchaseOrdersModule } from "./purchase-orders/purchase-orders.module";
import { RolesModule } from "./roles/roles.module";
import { TenantsModule } from "./tenants/tenants.module";
import { UsersModule } from "./users/users.module";
import { UnitsModule } from "./units/units.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnv,
    }),
    DatabaseModule,
    AuditModule,
    AuthModule,
    BudgetsModule,
    GoodsReceiptsModule,
    HealthModule,
    InventoryModule,
    IngredientsModule,
    TenantsModule,
    OutletsModule,
    UsersModule,
    UnitsModule,
    RolesModule,
    PermissionsModule,
    PurchaseOrdersModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule {}
