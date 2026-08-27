import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsNumber, IsOptional, IsUUID, Max, Min } from "class-validator";
import { IsBoolean } from "class-validator";

export class PurchaseOrderItemDto {
  @ApiProperty()
  @IsUUID()
  ingredientId: string;

  @ApiProperty()
  @IsUUID()
  purchaseUnitId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  supplierCatalogId?: string;

  @ApiPropertyOptional({
    default: false,
    description: "Minta server menyegarkan snapshot dari katalog yang dipilih.",
  })
  @IsOptional()
  @IsBoolean()
  refreshCatalog?: boolean;

  @ApiProperty({ minimum: 0.001, example: 10 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  @Max(999999999999)
  quantityOrdered: number;

  @ApiPropertyOptional({
    minimum: 0,
    example: 90000,
    deprecated: true,
    description: "Diabaikan; harga disalin server dari katalog supplier aktif.",
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(9999999999999999)
  unitPrice?: number;

  @ApiPropertyOptional({ minimum: 0, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  discountAmount?: number;

  @ApiPropertyOptional({ minimum: 0, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  taxAmount?: number;
}
