import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { AuthUser } from "../common/types/auth-user";
import { CreateIngredientCategoryDto, UpdateIngredientCategoryDto } from "./dto/ingredient-category.dto";
import { IngredientCategoriesService } from "./ingredient-categories.service";

@ApiTags("Ingredient Categories") @ApiBearerAuth() @Controller("ingredient-categories")
export class IngredientCategoriesController {
  constructor(private readonly categories: IngredientCategoriesService) {}
  @Get() @RequirePermissions("ingredients.read") list(@CurrentUser() actor: AuthUser) { return this.categories.list(actor); }
  @Post() @RequirePermissions("ingredients.create") create(@CurrentUser() actor: AuthUser, @Body() dto: CreateIngredientCategoryDto) { return this.categories.create(actor, dto); }
  @Patch(":id") @RequirePermissions("ingredients.update") update(@CurrentUser() actor: AuthUser, @Param("id", ParseUUIDPipe) id: string, @Body() dto: UpdateIngredientCategoryDto) { return this.categories.update(actor, id, dto); }
}
