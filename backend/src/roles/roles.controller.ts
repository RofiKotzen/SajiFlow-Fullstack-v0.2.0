import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { AuthUser } from "../common/types/auth-user";
import { AssignPermissionsDto } from "./dto/assign-permissions.dto";
import { CreateRoleDto } from "./dto/create-role.dto";
import { UpdateRoleDto } from "./dto/update-role.dto";
import { RolesService } from "./roles.service";
@ApiTags("Roles")
@ApiBearerAuth()
@Controller("roles")
export class RolesController {
  constructor(private readonly roles: RolesService) {}
  @Get() @RequirePermissions("roles.read") list(@CurrentUser() u: AuthUser) {
    return this.roles.list(u.tenantId);
  }
  @Get(":id") @RequirePermissions("roles.read") get(
    @CurrentUser() u: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.roles.get(u.tenantId, id);
  }
  @Post() @RequirePermissions("roles.create") create(
    @CurrentUser() u: AuthUser,
    @Body() dto: CreateRoleDto,
  ) {
    return this.roles.create(u, dto);
  }
  @Patch(":id") @RequirePermissions("roles.update") update(
    @CurrentUser() u: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateRoleDto,
  ) {
    return this.roles.update(u, id, dto);
  }
  @Put(":id/permissions")
  @RequirePermissions("roles.assign_permissions")
  assign(
    @CurrentUser() u: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: AssignPermissionsDto,
  ) {
    return this.roles.assignPermissions(u, id, dto);
  }
}
