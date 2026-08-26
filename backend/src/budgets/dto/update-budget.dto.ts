import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  ValidateNested,
} from "class-validator";
import { BudgetLineDto } from "./budget-line.dto";

export class UpdateBudgetDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  outletId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Matches(/^[A-Z0-9_-]+$/)
  @Length(3, 50)
  budgetCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(2, 150)
  name?: string;

  @ApiPropertyOptional({ example: "2026-08-01" })
  @IsOptional()
  @IsDateString({ strict: true })
  periodStart?: string;

  @ApiPropertyOptional({ example: "2026-08-31" })
  @IsOptional()
  @IsDateString({ strict: true })
  periodEnd?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 2000)
  notes?: string;

  @ApiPropertyOptional({ type: [BudgetLineDto] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => BudgetLineDto)
  lines?: BudgetLineDto[];
}
