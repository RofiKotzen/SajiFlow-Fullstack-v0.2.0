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
import { CreateUnitDto } from "./dto/create-unit.dto";
import { ListUnitsQueryDto } from "./dto/list-units-query.dto";
import { UpdateUnitDto } from "./dto/update-unit.dto";
import { CreateUnitConversionDto, UpdateUnitConversionDto } from "./dto/unit-conversion.dto";
import { UnitConversionsService } from "./unit-conversions.service";
import { UnitsService } from "./units.service";

@ApiTags("Units")
@ApiBearerAuth()
@Controller("units")
export class UnitsController {
  constructor(private readonly units: UnitsService, private readonly conversions: UnitConversionsService) {}
  @Get("conversions") @RequirePermissions("units.read") listConversions(@CurrentUser() u: AuthUser) {
    return this.conversions.list(u);
  }
  @Post("conversions") @RequirePermissions("units.create") createConversion(@CurrentUser() u: AuthUser, @Body() dto: CreateUnitConversionDto) {
    return this.conversions.create(u, dto);
  }
  @Patch("conversions/:id") @RequirePermissions("units.update") updateConversion(@CurrentUser() u: AuthUser, @Param("id", ParseUUIDPipe) id: string, @Body() dto: UpdateUnitConversionDto) {
    return this.conversions.update(u, id, dto);
  }
  @Get() @RequirePermissions("units.read") list(
    @CurrentUser() u: AuthUser,
    @Query() q: ListUnitsQueryDto,
  ) {
    return this.units.list(u, q);
  }
  @Get(":id") @RequirePermissions("units.read") get(
    @CurrentUser() u: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.units.get(u, id);
  }
  @Post() @RequirePermissions("units.create") create(
    @CurrentUser() u: AuthUser,
    @Body() dto: CreateUnitDto,
  ) {
    return this.units.create(u, dto);
  }
  @Patch(":id") @RequirePermissions("units.update") update(
    @CurrentUser() u: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateUnitDto,
  ) {
    return this.units.update(u, id, dto);
  }
}
