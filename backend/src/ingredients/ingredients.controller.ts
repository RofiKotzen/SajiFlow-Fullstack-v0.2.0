import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { AuthUser } from "../common/types/auth-user";
import { CreateIngredientDto } from "./dto/create-ingredient.dto";
import { ListIngredientsQueryDto } from "./dto/list-ingredients-query.dto";
import { UpdateIngredientDto } from "./dto/update-ingredient.dto";
import { UpdateOutletSettingsDto } from "./dto/update-outlet-settings.dto";
import { IngredientsService } from "./ingredients.service";

@ApiTags("Ingredients")
@ApiBearerAuth()
@Controller("ingredients")
export class IngredientsController {
  constructor(private readonly ingredients: IngredientsService) {}
  @Get() @RequirePermissions("ingredients.read") list(
    @CurrentUser() u: AuthUser,
    @Query() q: ListIngredientsQueryDto,
  ) {
    return this.ingredients.list(u, q);
  }
  @Get("lookups") @RequirePermissions("ingredients.read") lookups(
    @CurrentUser() u: AuthUser,
  ) {
    return this.ingredients.lookups(u);
  }
  @Get(":id") @RequirePermissions("ingredients.read") get(
    @CurrentUser() u: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.ingredients.get(u, id);
  }
  @Post() @RequirePermissions("ingredients.create") create(
    @CurrentUser() u: AuthUser,
    @Body() dto: CreateIngredientDto,
  ) {
    return this.ingredients.create(u, dto);
  }
  @Patch(":id") @RequirePermissions("ingredients.update") update(
    @CurrentUser() u: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateIngredientDto,
  ) {
    return this.ingredients.update(u, id, dto);
  }
  @Put(":id/outlet-settings")
  @RequirePermissions("ingredients.update")
  updateOutletSettings(
    @CurrentUser() u: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateOutletSettingsDto,
  ) {
    return this.ingredients.updateOutletSettings(u, id, dto.settings);
  }
}
