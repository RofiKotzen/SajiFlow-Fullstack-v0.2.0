import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsOptional, IsString, Length, Matches } from "class-validator";

export class UpdateTenantDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(2, 150)
  name?: string;

  @ApiPropertyOptional({ example: "Asia/Jakarta" })
  @IsOptional()
  @Matches(/^[A-Za-z_]+\/[A-Za-z_+-]+$/)
  timezone?: string;

  @ApiPropertyOptional({ example: "IDR" })
  @IsOptional()
  @Matches(/^[A-Z]{3}$/)
  currencyCode?: string;

  @ApiPropertyOptional({ enum: ["active", "trial", "suspended", "terminated"] })
  @IsOptional()
  @IsIn(["active", "trial", "suspended", "terminated"])
  status?: "active" | "trial" | "suspended" | "terminated";
}
