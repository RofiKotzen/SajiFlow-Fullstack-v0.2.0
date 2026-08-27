import { Transform } from "class-transformer";
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from "class-validator";

export const inventoryStatuses = ["out", "critical", "low", "safe"] as const;

export class ListInventoryQueryDto {
  @IsOptional()
  @IsUUID()
  outletId?: string;

  @IsOptional()
  @IsUUID()
  locationId?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsIn(inventoryStatuses)
  status?: (typeof inventoryStatuses)[number];

  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(0)
  @Max(365)
  expiryWithinDays?: number;
}
