import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { AuthUser } from '../common/types/auth-user';
import { CreateOutletDto } from './dto/create-outlet.dto';
import { UpdateOutletDto } from './dto/update-outlet.dto';
import { OutletsService } from './outlets.service';

@ApiTags('Outlets') @ApiBearerAuth() @Controller('outlets')
export class OutletsController {
  constructor(private readonly outlets: OutletsService) {}
  @Get() @RequirePermissions('outlets.read') list(@CurrentUser() u: AuthUser) { return this.outlets.list(u.tenantId); }
  @Get(':id') @RequirePermissions('outlets.read') get(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string) { return this.outlets.get(u.tenantId, id); }
  @Post() @RequirePermissions('outlets.create') create(@CurrentUser() u: AuthUser, @Body() dto: CreateOutletDto) { return this.outlets.create(u, dto); }
  @Patch(':id') @RequirePermissions('outlets.update') update(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateOutletDto) { return this.outlets.update(u, id, dto); }
}
