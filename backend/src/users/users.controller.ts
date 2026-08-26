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
import { AssignRolesDto } from "./dto/assign-roles.dto";
import { CreateUserDto } from "./dto/create-user.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { UsersService } from "./users.service";

@ApiTags("Users")
@ApiBearerAuth()
@Controller("users")
export class UsersController {
  constructor(private readonly users: UsersService) {}
  @Get() @RequirePermissions("users.read") list(@CurrentUser() u: AuthUser) {
    return this.users.list(u.tenantId);
  }
  @Get(":id") @RequirePermissions("users.read") get(
    @CurrentUser() u: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.users.get(u.tenantId, id);
  }
  @Post() @RequirePermissions("users.create") create(
    @CurrentUser() u: AuthUser,
    @Body() dto: CreateUserDto,
  ) {
    return this.users.create(u, dto);
  }
  @Patch(":id") @RequirePermissions("users.update") update(
    @CurrentUser() u: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.users.update(u, id, dto);
  }
  @Put(":id/password")
  @RequirePermissions("users.reset_password")
  resetPassword(
    @CurrentUser() u: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: ResetPasswordDto,
  ) {
    return this.users.resetPassword(u, id, dto);
  }
  @Put(":id/roles") @RequirePermissions("users.assign_roles") assignRoles(
    @CurrentUser() u: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: AssignRolesDto,
  ) {
    return this.users.assignRoles(u, id, dto);
  }
}
