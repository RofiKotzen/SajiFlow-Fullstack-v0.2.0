import { Controller, Get, Param, ParseUUIDPipe, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { AuthUser } from "../common/types/auth-user";
import { InventoryDetailQueryDto } from "./dto/inventory-detail-query.dto";
import { ListInventoryQueryDto } from "./dto/list-inventory-query.dto";
import { ListStockMovementsQueryDto } from "./dto/list-stock-movements-query.dto";
import { InventoryService } from "./inventory.service";

@ApiTags("Inventory")
@ApiBearerAuth()
@Controller("inventory")
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  @Get()
  @RequirePermissions("inventory.read")
  overview(
    @CurrentUser() user: AuthUser,
    @Query() query: ListInventoryQueryDto,
  ) {
    return this.inventory.overview(user, query);
  }

  @Get("lookups")
  @RequirePermissions("inventory.read")
  lookups(@CurrentUser() user: AuthUser) {
    return this.inventory.lookups(user);
  }

  @Get("movements")
  @RequirePermissions("inventory.read")
  movements(
    @CurrentUser() user: AuthUser,
    @Query() query: ListStockMovementsQueryDto,
  ) {
    return this.inventory.movements(user, query);
  }

  @Get(":ingredientId")
  @RequirePermissions("inventory.read")
  detail(
    @CurrentUser() user: AuthUser,
    @Param("ingredientId", ParseUUIDPipe) ingredientId: string,
    @Query() query: InventoryDetailQueryDto,
  ) {
    return this.inventory.detail(user, ingredientId, query.outletId);
  }
}
