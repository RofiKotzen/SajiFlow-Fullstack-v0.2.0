import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from "class-validator";
import { GoodsReceiptItemDto } from "./goods-receipt-item.dto";

export class CreateGoodsReceiptDto {
  @IsUUID()
  purchaseOrderId!: string;

  @IsDateString()
  receivedAt!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  supplierDeliveryNo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  supplierInvoiceNo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => GoodsReceiptItemDto)
  items!: GoodsReceiptItemDto[];
}
