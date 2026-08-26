import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsOptional, IsString, Length, Matches } from "class-validator";

export class UpdateUserDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(2, 150)
  fullName?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 40)
  employeeCode?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @Matches(/^\+?[0-9 ()-]{7,30}$/)
  phone?: string;
  @ApiPropertyOptional({ enum: ["invited", "active", "suspended", "disabled"] })
  @IsOptional()
  @IsIn(["invited", "active", "suspended", "disabled"])
  status?: "invited" | "active" | "suspended" | "disabled";
}
