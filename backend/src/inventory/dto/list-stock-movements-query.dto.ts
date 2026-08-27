import { IsDateString, IsIn, IsOptional, IsUUID } from "class-validator";

export const movementTypes = [
  "receipt",
  "sale_consumption",
  "transfer_out",
  "transfer_in",
  "waste",
  "opname_adjustment",
  "reversal",
] as const;

export class ListStockMovementsQueryDto {
  @IsOptional()
  @IsUUID()
  outletId?: string;

  @IsOptional()
  @IsUUID()
  ingredientId?: string;

  @IsOptional()
  @IsUUID()
  locationId?: string;

  @IsOptional()
  @IsIn(movementTypes)
  movementType?: (typeof movementTypes)[number];

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;
}
