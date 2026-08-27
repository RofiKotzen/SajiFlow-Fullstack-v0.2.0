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
import { CreateSupplierCatalogDto } from "./dto/create-supplier-catalog.dto";
import { CreateSupplierDto } from "./dto/create-supplier.dto";
import { ListSuppliersQueryDto } from "./dto/list-suppliers-query.dto";
import { UpdateSupplierCatalogDto } from "./dto/update-supplier-catalog.dto";
import { UpdateSupplierDto } from "./dto/update-supplier.dto";
import { SuppliersService } from "./suppliers.service";

@ApiTags("Suppliers")
@ApiBearerAuth()
@Controller("suppliers")
export class SuppliersController {
  constructor(private readonly suppliers: SuppliersService) {}
  @Get() @RequirePermissions("suppliers.read") list(
    @CurrentUser() u: AuthUser,
    @Query() q: ListSuppliersQueryDto,
  ) {
    return this.suppliers.list(u, q);
  }
  @Get("lookups") @RequirePermissions("suppliers.catalog.read") lookups(
    @CurrentUser() u: AuthUser,
  ) {
    return this.suppliers.lookups(u);
  }
  @Get(":id") @RequirePermissions("suppliers.read") get(
    @CurrentUser() u: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.suppliers.get(u, id);
  }
  @Post() @RequirePermissions("suppliers.create") create(
    @CurrentUser() u: AuthUser,
    @Body() dto: CreateSupplierDto,
  ) {
    return this.suppliers.create(u, dto);
  }
  @Patch(":id") @RequirePermissions("suppliers.update") update(
    @CurrentUser() u: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateSupplierDto,
  ) {
    return this.suppliers.update(u, id, dto);
  }
  @Post(":id/archive") @RequirePermissions("suppliers.update") archive(
    @CurrentUser() u: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.suppliers.setActive(u, id, false);
  }
  @Post(":id/activate") @RequirePermissions("suppliers.update") activate(
    @CurrentUser() u: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.suppliers.setActive(u, id, true);
  }
  @Get(":id/catalog") @RequirePermissions("suppliers.catalog.read") catalog(
    @CurrentUser() u: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.suppliers.catalog(u, id);
  }
  @Post(":id/catalog")
  @RequirePermissions("suppliers.catalog.manage")
  createCatalog(
    @CurrentUser() u: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: CreateSupplierCatalogDto,
  ) {
    return this.suppliers.createCatalog(u, id, dto);
  }
  @Patch(":id/catalog/:catalogId")
  @RequirePermissions("suppliers.catalog.manage")
  updateCatalog(
    @CurrentUser() u: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Param("catalogId", ParseUUIDPipe) catalogId: string,
    @Body() dto: UpdateSupplierCatalogDto,
  ) {
    return this.suppliers.updateCatalog(u, id, catalogId, dto);
  }
  @Post(":id/catalog/:catalogId/archive")
  @RequirePermissions("suppliers.catalog.manage")
  archiveCatalog(
    @CurrentUser() u: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Param("catalogId", ParseUUIDPipe) catalogId: string,
  ) {
    return this.suppliers.setCatalogActive(u, id, catalogId, false);
  }
  @Post(":id/catalog/:catalogId/activate")
  @RequirePermissions("suppliers.catalog.manage")
  activateCatalog(
    @CurrentUser() u: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Param("catalogId", ParseUUIDPipe) catalogId: string,
  ) {
    return this.suppliers.setCatalogActive(u, id, catalogId, true);
  }
}
