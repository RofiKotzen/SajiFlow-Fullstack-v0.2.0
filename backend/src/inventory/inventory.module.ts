import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { InventoryController } from "./inventory.controller";
import { InventoryService } from "./inventory.service";
import { InventoryValuationService } from "./inventory-valuation.service";

@Module({
  imports: [DatabaseModule],
  controllers: [InventoryController],
  providers: [InventoryService, InventoryValuationService],
  exports: [InventoryValuationService],
})
export class InventoryModule {}
