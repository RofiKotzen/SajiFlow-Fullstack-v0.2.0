import { PartialType } from "@nestjs/swagger";
import { CreateSupplierCatalogDto } from "./create-supplier-catalog.dto";
export class UpdateSupplierCatalogDto extends PartialType(
  CreateSupplierCatalogDto,
) {}
