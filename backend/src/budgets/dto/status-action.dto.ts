import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, Length } from "class-validator";

export class StatusActionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(3, 1000)
  reason?: string;
}

export class RejectBudgetDto {
  @ApiProperty({ example: "Alokasi pembelian perlu disesuaikan." })
  @IsString()
  @Length(3, 1000)
  reason: string;
}
