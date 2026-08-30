import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { EffectivePriceService } from "./effective-price.service";
import { MenuProductsController } from "./menu-products.controller";
import { MenuProductsService } from "./menu-products.service";

@Module({
  imports: [AuditModule],
  controllers: [MenuProductsController],
  providers: [MenuProductsService, EffectivePriceService],
  exports: [MenuProductsService, EffectivePriceService],
})
export class MenuProductsModule {}
