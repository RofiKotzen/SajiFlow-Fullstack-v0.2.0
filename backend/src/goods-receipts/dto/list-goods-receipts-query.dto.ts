import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from "class-validator";

export class ListGoodsReceiptsQueryDto {
  @IsOptional()
  @IsUUID()
  outletId?: string;

  @IsOptional()
  @IsIn(["draft", "posted", "void"])
  status?: "draft" | "posted" | "void";

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}
