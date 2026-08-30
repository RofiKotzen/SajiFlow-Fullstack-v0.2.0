import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { AuthUser } from "../common/types/auth-user";
import {
  ArchiveRecipeDto,
  ListRecipesDto,
  OutletActionDto,
  RevisionDto,
} from "./dto/recipe-actions.dto";
import { CreateRecipeDto } from "./dto/create-recipe.dto";
import { UpdateRecipeDto } from "./dto/update-recipe.dto";
import { RecipesService } from "./recipes.service";

@ApiTags("Recipes & Food Cost")
@ApiBearerAuth()
@Controller("recipes")
export class RecipesController {
  constructor(private readonly recipes: RecipesService) {}
  @Get() @RequirePermissions("recipes.read") list(
    @CurrentUser() actor: AuthUser,
    @Query() query: ListRecipesDto,
  ) {
    return this.recipes.list(actor, query);
  }
  @Get("lookups") @RequirePermissions("recipes.read") lookups(
    @CurrentUser() actor: AuthUser,
    @Query("outletId") outletId?: string,
  ) {
    return this.recipes.lookups(actor, outletId);
  }
  @Get(":id") @RequirePermissions("recipes.read") get(
    @CurrentUser() actor: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Query("outletId") outletId?: string,
  ) {
    return this.recipes.get(actor, id, outletId);
  }
  @Get(":id/versions") @RequirePermissions("recipes.read") versions(
    @CurrentUser() actor: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.recipes.versions(actor, id);
  }
  @Get(":id/costing") @RequirePermissions("recipes.read") costing(
    @CurrentUser() actor: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Query("outletId", ParseUUIDPipe) outletId: string,
  ) {
    return this.recipes.costing(actor, id, outletId);
  }
  @Post() @RequirePermissions("recipes.create") create(
    @CurrentUser() actor: AuthUser,
    @Body() dto: CreateRecipeDto,
  ) {
    return this.recipes.create(actor, dto);
  }
  @Patch(":id/draft") @RequirePermissions("recipes.update_draft") update(
    @CurrentUser() actor: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateRecipeDto,
  ) {
    return this.recipes.updateDraft(actor, id, dto);
  }
  @Post(":id/recalculate")
  @RequirePermissions("recipes.recalculate")
  recalculate(
    @CurrentUser() actor: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: OutletActionDto,
  ) {
    return this.recipes.recalculate(actor, id, dto.outletId);
  }
  @Post(":id/approve") @RequirePermissions("recipes.approve") approve(
    @CurrentUser() actor: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: OutletActionDto,
  ) {
    return this.recipes.approve(actor, id, dto.outletId);
  }
  @Post(":id/revisions") @RequirePermissions("recipes.revise") revise(
    @CurrentUser() actor: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: RevisionDto,
  ) {
    return this.recipes.revise(actor, id, dto.reason);
  }
  @Post(":id/archive") @RequirePermissions("recipes.archive") archive(
    @CurrentUser() actor: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: ArchiveRecipeDto,
  ) {
    return this.recipes.archive(actor, id, dto);
  }
  @Post(":id/activate") @RequirePermissions("recipes.activate") activate(
    @CurrentUser() actor: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.recipes.activate(actor, id);
  }
  @Get(":id/audit") @RequirePermissions("recipes.audit.read") audit(
    @CurrentUser() actor: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.recipes.audit(actor, id);
  }
}
