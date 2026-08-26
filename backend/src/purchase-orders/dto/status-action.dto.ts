import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, Length } from "class-validator";

export class PurchaseOrderStatusActionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(3, 1000)
  reason?: string;
}

export class CancelPurchaseOrderDto {
  @ApiProperty({ example: "Kebutuhan dibatalkan oleh outlet." })
  @IsString()
  @Length(3, 1000)
  reason: string;
}
