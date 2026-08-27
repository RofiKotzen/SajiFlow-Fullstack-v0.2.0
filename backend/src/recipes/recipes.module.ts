import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { InventoryModule } from "../inventory/inventory.module";
import { RecipesController } from "./recipes.controller";
import { RecipesService } from "./recipes.service";
@Module({ imports: [DatabaseModule, InventoryModule], controllers: [RecipesController], providers: [RecipesService] })
export class RecipesModule {}
