import { Controller, Get } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { PermissionsService } from "./permissions.service";
@ApiTags("Permissions")
@ApiBearerAuth()
@Controller("permissions")
export class PermissionsController {
  constructor(private readonly permissions: PermissionsService) {}
  @Get() @RequirePermissions("permissions.read") list() {
    return this.permissions.list();
  }
}
