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
  ListPosOrdersQueryDto,
  PosLookupQueryDto,
} from "./dto/list-pos-orders-query.dto";
import {
  CreatePosOrderDto,
  PosMutationDto,
  PosReasonMutationDto,
  UpdatePosOrderDto,
} from "./dto/pos.dto";
import { PosService } from "./pos.service";

@ApiTags("POS")
@ApiBearerAuth()
@Controller("pos")
export class PosController {
  constructor(private readonly pos: PosService) {}

  @Get("lookups")
  @RequirePermissions("pos.read")
  lookups(@CurrentUser() actor: AuthUser, @Query() query: PosLookupQueryDto) {
    return this.pos.lookups(actor, query.outletId);
  }

  @Get("orders")
  @RequirePermissions("pos.read")
  list(@CurrentUser() actor: AuthUser, @Query() query: ListPosOrdersQueryDto) {
    return this.pos.list(actor, query);
  }

  @Get("orders/:id")
  @RequirePermissions("pos.read")
  get(@CurrentUser() actor: AuthUser, @Param("id", ParseUUIDPipe) id: string) {
    return this.pos.get(actor, id);
  }

  @Post("orders")
  @RequirePermissions("pos.create")
  create(@CurrentUser() actor: AuthUser, @Body() dto: CreatePosOrderDto) {
    return this.pos.create(actor, dto);
  }

  @Patch("orders/:id")
  @RequirePermissions("pos.update")
  update(
    @CurrentUser() actor: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdatePosOrderDto,
  ) {
    return this.pos.update(actor, id, dto);
  }

  @Post("orders/:id/submit")
  @RequirePermissions("pos.submit")
  submit(
    @CurrentUser() actor: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: PosMutationDto,
  ) {
    return this.pos.submit(actor, id, dto);
  }

  @Post("orders/:id/cancel")
  @RequirePermissions("pos.cancel")
  cancel(
    @CurrentUser() actor: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: PosReasonMutationDto,
  ) {
    return this.pos.cancel(actor, id, dto);
  }
}
