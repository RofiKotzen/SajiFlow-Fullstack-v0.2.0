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
import { CreateGoodsReceiptDto } from "./dto/create-goods-receipt.dto";
import { ListGoodsReceiptsQueryDto } from "./dto/list-goods-receipts-query.dto";
import { UpdateGoodsReceiptDto } from "./dto/update-goods-receipt.dto";
import { VoidGoodsReceiptDto } from "./dto/void-goods-receipt.dto";
import { GoodsReceiptsService } from "./goods-receipts.service";

@ApiTags("Goods Receipts")
@ApiBearerAuth()
@Controller("goods-receipts")
export class GoodsReceiptsController {
  constructor(private readonly goodsReceipts: GoodsReceiptsService) {}

  @Get()
  @RequirePermissions("goods_receipts.read")
  list(
    @CurrentUser() user: AuthUser,
    @Query() query: ListGoodsReceiptsQueryDto,
  ) {
    return this.goodsReceipts.list(user, query);
  }

  @Get("lookups")
  @RequirePermissions("goods_receipts.read")
  lookups(@CurrentUser() user: AuthUser) {
    return this.goodsReceipts.lookups(user);
  }

  @Get(":id")
  @RequirePermissions("goods_receipts.read")
  get(@CurrentUser() user: AuthUser, @Param("id", ParseUUIDPipe) id: string) {
    return this.goodsReceipts.get(user, id);
  }

  @Post()
  @RequirePermissions("goods_receipts.create")
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateGoodsReceiptDto) {
    return this.goodsReceipts.create(user, dto);
  }

  @Patch(":id")
  @RequirePermissions("goods_receipts.update")
  update(
    @CurrentUser() user: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateGoodsReceiptDto,
  ) {
    return this.goodsReceipts.update(user, id, dto);
  }

  @Post(":id/post")
  @RequirePermissions("goods_receipts.post")
  post(@CurrentUser() user: AuthUser, @Param("id", ParseUUIDPipe) id: string) {
    return this.goodsReceipts.post(user, id);
  }

  @Post(":id/void")
  @RequirePermissions("goods_receipts.void")
  void(
    @CurrentUser() user: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: VoidGoodsReceiptDto,
  ) {
    return this.goodsReceipts.void(user, id, dto.reason);
  }
}
