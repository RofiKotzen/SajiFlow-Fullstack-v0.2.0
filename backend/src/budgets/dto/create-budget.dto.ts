import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
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

export class CreateBudgetDto {
  @ApiProperty()
  @IsUUID()
  outletId: string;

  @ApiPropertyOptional({ example: "BUD-2026-08" })
  @IsOptional()
  @Matches(/^[A-Z0-9_-]+$/)
  @Length(3, 50)
  budgetCode?: string;

  @ApiProperty({ example: "Anggaran Operasional Agustus 2026" })
  @IsString()
  @Length(2, 150)
  name: string;

  @ApiProperty({ example: "2026-08-01" })
  @IsDateString({ strict: true })
  periodStart: string;

  @ApiProperty({ example: "2026-08-31" })
  @IsDateString({ strict: true })
  periodEnd: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 2000)
  notes?: string;

  @ApiProperty({ type: [BudgetLineDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => BudgetLineDto)
  lines: BudgetLineDto[];
}
