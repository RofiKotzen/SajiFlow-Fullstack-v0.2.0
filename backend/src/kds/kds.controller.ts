import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { AuthUser } from "../common/types/auth-user";
import { KdsQueueQueryDto, KdsTransitionDto } from "./dto/kds.dto";
import { KdsService } from "./kds.service";

@ApiTags("KDS")
@ApiBearerAuth()
@Controller("kds")
export class KdsController {
  constructor(private readonly kds: KdsService) {}

  @Get("queue")
  @RequirePermissions("kds.read")
  queue(@CurrentUser() actor: AuthUser, @Query() query: KdsQueueQueryDto) {
    return this.kds.queue(actor, query);
  }

  @Get("orders/:orderId")
  @RequirePermissions("kds.read")
  detail(
    @CurrentUser() actor: AuthUser,
    @Param("orderId", ParseUUIDPipe) orderId: string,
  ) {
    return this.kds.detail(actor, orderId);
  }

  @Post("items/:itemId/start")
  @RequirePermissions("kds.update")
  start(
    @CurrentUser() actor: AuthUser,
    @Param("itemId", ParseUUIDPipe) itemId: string,
    @Body() dto: KdsTransitionDto,
  ) {
    return this.kds.transition(actor, itemId, "start", dto);
  }

  @Post("items/:itemId/ready")
  @RequirePermissions("kds.update")
  ready(
    @CurrentUser() actor: AuthUser,
    @Param("itemId", ParseUUIDPipe) itemId: string,
    @Body() dto: KdsTransitionDto,
  ) {
    return this.kds.transition(actor, itemId, "ready", dto);
  }
}
