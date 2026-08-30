import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { AuthUser } from "../common/types/auth-user";
import {
  ActivateMenuProductDto,
  ArchiveMenuProductDto,
  CreateMenuCategoryDto,
  CreateMenuDto,
  CreateMenuVariantDto,
  ListMenuProductsDto,
  UpdateMenuCategoryDto,
  UpdateMenuDto,
  UpdateMenuVariantDto,
  UpdateOutletAvailabilityDto,
  UpdateOutletPriceDto,
} from "./dto/menu-product.dto";
import { MenuProductsService } from "./menu-products.service";

@ApiTags("Menu & Product Master")
@ApiBearerAuth()
@Controller()
export class MenuProductsController {
  constructor(private readonly service: MenuProductsService) {}

  @Get("menu-products/summary") @RequirePermissions("menus.read") summary(
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.summary(actor);
  }
  @Get("menu-products/lookups") @RequirePermissions("menus.read") lookups(
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.lookups(actor);
  }
  @Get("menu-categories") @RequirePermissions("menus.read") categories(
    @CurrentUser() actor: AuthUser,
    @Query() query: ListMenuProductsDto,
  ) {
    return this.service.listCategories(actor, query);
  }
  @Post("menu-categories")
  @RequirePermissions("menus.categories.manage")
  createCategory(
    @CurrentUser() actor: AuthUser,
    @Body() dto: CreateMenuCategoryDto,
  ) {
    return this.service.createCategory(actor, dto);
  }
  @Patch("menu-categories/:id")
  @RequirePermissions("menus.categories.manage")
  updateCategory(
    @CurrentUser() actor: AuthUser,
    @Param("id") id: string,
    @Body() dto: UpdateMenuCategoryDto,
  ) {
    return this.service.updateCategory(actor, id, dto);
  }
  @Post("menu-categories/:id/archive")
  @RequirePermissions("menus.categories.manage")
  archiveCategory(
    @CurrentUser() actor: AuthUser,
    @Param("id") id: string,
    @Body() dto: ArchiveMenuProductDto,
  ) {
    return this.service.archiveCategory(actor, id, dto);
  }
  @Post("menu-categories/:id/activate")
  @RequirePermissions("menus.categories.manage")
  activateCategory(
    @CurrentUser() actor: AuthUser,
    @Param("id") id: string,
    @Body() dto: ActivateMenuProductDto,
  ) {
    return this.service.activateCategory(actor, id, dto);
  }

  @Get("menus") @RequirePermissions("menus.read") menus(
    @CurrentUser() actor: AuthUser,
    @Query() query: ListMenuProductsDto,
  ) {
    return this.service.listMenus(actor, query);
  }
  @Post("menus") @RequirePermissions("menus.create") createMenu(
    @CurrentUser() actor: AuthUser,
    @Body() dto: CreateMenuDto,
  ) {
    return this.service.createMenu(actor, dto);
  }
  @Get("menus/:id") @RequirePermissions("menus.read") menu(
    @CurrentUser() actor: AuthUser,
    @Param("id") id: string,
  ) {
    return this.service.getMenu(actor, id);
  }
  @Patch("menus/:id") @RequirePermissions("menus.update") updateMenu(
    @CurrentUser() actor: AuthUser,
    @Param("id") id: string,
    @Body() dto: UpdateMenuDto,
  ) {
    return this.service.updateMenu(actor, id, dto);
  }
  @Post("menus/:id/archive") @RequirePermissions("menus.archive") archiveMenu(
    @CurrentUser() actor: AuthUser,
    @Param("id") id: string,
    @Body() dto: ArchiveMenuProductDto,
  ) {
    return this.service.archiveMenu(actor, id, dto);
  }
  @Post("menus/:id/activate") @RequirePermissions("menus.archive") activateMenu(
    @CurrentUser() actor: AuthUser,
    @Param("id") id: string,
    @Body() dto: ActivateMenuProductDto,
  ) {
    return this.service.activateMenu(actor, id, dto);
  }
  @Get("menus/:id/audit") @RequirePermissions("menus.audit.read") audit(
    @CurrentUser() actor: AuthUser,
    @Param("id") id: string,
  ) {
    return this.service.auditHistory(actor, id);
  }

  @Get("menus/:menuId/variants") @RequirePermissions("menus.read") variants(
    @CurrentUser() actor: AuthUser,
    @Param("menuId") menuId: string,
  ) {
    return this.service.listVariants(actor, menuId);
  }
  @Post("menus/:menuId/variants")
  @RequirePermissions("menus.variants.manage")
  createVariant(
    @CurrentUser() actor: AuthUser,
    @Param("menuId") menuId: string,
    @Body() dto: CreateMenuVariantDto,
  ) {
    return this.service.createVariant(actor, menuId, dto);
  }
  @Patch("menu-variants/:id")
  @RequirePermissions("menus.variants.manage")
  updateVariant(
    @CurrentUser() actor: AuthUser,
    @Param("id") id: string,
    @Body() dto: UpdateMenuVariantDto,
  ) {
    return this.service.updateVariant(actor, id, dto);
  }
  @Post("menu-variants/:id/archive")
  @RequirePermissions("menus.variants.manage")
  archiveVariant(
    @CurrentUser() actor: AuthUser,
    @Param("id") id: string,
    @Body() dto: ArchiveMenuProductDto,
  ) {
    return this.service.archiveVariant(actor, id, dto);
  }
  @Post("menu-variants/:id/activate")
  @RequirePermissions("menus.variants.manage")
  activateVariant(
    @CurrentUser() actor: AuthUser,
    @Param("id") id: string,
    @Body() dto: ActivateMenuProductDto,
  ) {
    return this.service.activateVariant(actor, id, dto);
  }

  @Get("menu-variants/:id/outlets")
  @RequirePermissions("menus.read")
  outletSettings(@CurrentUser() actor: AuthUser, @Param("id") id: string) {
    return this.service.outletSettings(actor, id);
  }
  @Put("menu-variants/:id/outlets/:outletId/availability")
  @RequirePermissions("menus.outlets.manage")
  availability(
    @CurrentUser() actor: AuthUser,
    @Param("id") id: string,
    @Param("outletId") outletId: string,
    @Body() dto: UpdateOutletAvailabilityDto,
  ) {
    return this.service.setAvailability(actor, id, outletId, dto);
  }
  @Put("menu-variants/:id/outlets/:outletId/price")
  @RequirePermissions("menus.prices.manage")
  price(
    @CurrentUser() actor: AuthUser,
    @Param("id") id: string,
    @Param("outletId") outletId: string,
    @Body() dto: UpdateOutletPriceDto,
  ) {
    return this.service.setPrice(actor, id, outletId, dto);
  }

  @Get("menu-products/lookups/recipe")
  @RequirePermissions("recipes.read")
  recipeLookup(
    @CurrentUser() actor: AuthUser,
    @Query("outletId") outletId: string,
  ) {
    return this.service.recipeLookup(actor, outletId);
  }
  @Get("menu-products/lookups/recipe-context")
  @RequirePermissions("recipes.read")
  recipeContext(@CurrentUser() actor: AuthUser) {
    return this.service.recipeContext(actor);
  }
  @Get("menu-products/lookups/pos") @RequirePermissions("menus.read") posLookup(
    @CurrentUser() actor: AuthUser,
    @Query("outletId") outletId: string,
  ) {
    return this.service.posLookup(actor, outletId);
  }
}
