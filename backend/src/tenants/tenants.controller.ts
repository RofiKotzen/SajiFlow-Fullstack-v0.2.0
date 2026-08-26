import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { AuthUser } from '../common/types/auth-user';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { TenantsService } from './tenants.service';

@ApiTags('Tenant')
@ApiBearerAuth()
@Controller('tenant')
export class TenantsController {
  constructor(private readonly tenants: TenantsService) {}
  @Get()
  @RequirePermissions('tenant.read')
  current(@CurrentUser() user: AuthUser) { return this.tenants.current(user.tenantId); }
  @Patch()
  @RequirePermissions('tenant.update')
  update(@CurrentUser() user: AuthUser, @Body() dto: UpdateTenantDto) { return this.tenants.update(user, dto); }
}
