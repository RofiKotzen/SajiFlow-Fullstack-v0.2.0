import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { InventoryModule } from "../inventory/inventory.module";
import { RecipesController } from "./recipes.controller";
import { RecipesService } from "./recipes.service";
import { MenuProductsModule } from "../menu-products/menu-products.module";
import { UnitsModule } from "../units/units.module";
@Module({
  imports: [DatabaseModule, InventoryModule, MenuProductsModule, UnitsModule],
  controllers: [RecipesController],
  providers: [RecipesService],
})
export class RecipesModule {}
