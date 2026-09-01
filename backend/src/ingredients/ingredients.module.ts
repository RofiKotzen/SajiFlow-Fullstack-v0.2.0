import { Module } from "@nestjs/common";
import { IngredientsController } from "./ingredients.controller";
import { IngredientsService } from "./ingredients.service";
import { IngredientCategoriesController } from "./ingredient-categories.controller";
import { IngredientCategoriesService } from "./ingredient-categories.service";
@Module({
  controllers: [IngredientsController, IngredientCategoriesController],
  providers: [IngredientsService, IngredientCategoriesService],
})
export class IngredientsModule {}
