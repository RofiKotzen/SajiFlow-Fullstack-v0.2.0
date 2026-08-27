import { IsString, MaxLength, MinLength } from "class-validator";

export class VoidGoodsReceiptDto {
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason!: string;
}
