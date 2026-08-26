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
import { CreatePurchaseOrderDto } from "./dto/create-purchase-order.dto";
import { ListPurchaseOrdersQueryDto } from "./dto/list-purchase-orders-query.dto";
import {
  CancelPurchaseOrderDto,
  PurchaseOrderStatusActionDto,
} from "./dto/status-action.dto";
import { UpdatePurchaseOrderDto } from "./dto/update-purchase-order.dto";
import { PurchaseOrdersService } from "./purchase-orders.service";

@ApiTags("Purchase Orders")
@ApiBearerAuth()
@Controller("purchase-orders")
export class PurchaseOrdersController {
  constructor(private readonly purchaseOrders: PurchaseOrdersService) {}

  @Get()
  @RequirePermissions("purchase_orders.read")
  list(
    @CurrentUser() user: AuthUser,
    @Query() query: ListPurchaseOrdersQueryDto,
  ) {
    return this.purchaseOrders.list(user, query);
  }

  @Get("lookups")
  @RequirePermissions("purchase_orders.read")
  lookups(@CurrentUser() user: AuthUser) {
    return this.purchaseOrders.lookups(user);
  }

  @Get(":id")
  @RequirePermissions("purchase_orders.read")
  get(@CurrentUser() user: AuthUser, @Param("id", ParseUUIDPipe) id: string) {
    return this.purchaseOrders.get(user, id);
  }

  @Post()
  @RequirePermissions("purchase_orders.create")
  create(@CurrentUser() user: AuthUser, @Body() dto: CreatePurchaseOrderDto) {
    return this.purchaseOrders.create(user, dto);
  }

  @Patch(":id")
  @RequirePermissions("purchase_orders.update")
  update(
    @CurrentUser() user: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdatePurchaseOrderDto,
  ) {
    return this.purchaseOrders.update(user, id, dto);
  }

  @Post(":id/approve")
  @RequirePermissions("purchase_orders.approve")
  approve(
    @CurrentUser() user: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: PurchaseOrderStatusActionDto,
  ) {
    return this.purchaseOrders.approve(user, id, dto.reason);
  }

  @Post(":id/send")
  @RequirePermissions("purchase_orders.send")
  send(
    @CurrentUser() user: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: PurchaseOrderStatusActionDto,
  ) {
    return this.purchaseOrders.send(user, id, dto.reason);
  }

  @Post(":id/cancel")
  @RequirePermissions("purchase_orders.cancel")
  cancel(
    @CurrentUser() user: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: CancelPurchaseOrderDto,
  ) {
    return this.purchaseOrders.cancel(user, id, dto.reason);
  }

  @Post(":id/close")
  @RequirePermissions("purchase_orders.close")
  close(
    @CurrentUser() user: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: PurchaseOrderStatusActionDto,
  ) {
    return this.purchaseOrders.close(user, id, dto.reason);
  }
}
