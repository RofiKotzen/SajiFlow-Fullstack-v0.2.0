import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
} from "class-validator";
export class CreateSupplierCatalogDto {
  @ApiProperty() @IsUUID() ingredientId: string;
  @ApiProperty() @IsUUID() purchaseUnitId: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 80)
  supplierSku?: string;
  @ApiProperty({ minimum: 0.000001 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(0.000001)
  @Max(999999999999)
  conversionToBase: number;
  @ApiProperty({ minimum: 0 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(9999999999999999)
  lastPrice: number;
  @ApiPropertyOptional({ minimum: 0.001, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  @Max(999999999999)
  minimumOrderQty?: number;
  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isPreferred?: boolean;
}
