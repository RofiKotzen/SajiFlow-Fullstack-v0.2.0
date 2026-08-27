import { Type } from "class-transformer";
import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  Min,
  ValidateIf,
} from "class-validator";

export class GoodsReceiptItemDto {
  @IsUUID()
  purchaseOrderItemId!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  quantityReceived!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  quantityRejected?: number;

  @ValidateIf(
    (value: GoodsReceiptItemDto) => Number(value.quantityRejected) > 0,
  )
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  rejectionReason?: string;

  @IsUUID()
  storageLocationId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  batchNo?: string;

  @IsOptional()
  @IsDateString()
  expiryDate?: string;
}
