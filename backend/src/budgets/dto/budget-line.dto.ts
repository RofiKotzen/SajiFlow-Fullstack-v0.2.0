import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from "class-validator";

export const budgetCategories = [
  "purchase",
  "operational",
  "maintenance",
  "marketing",
  "other",
] as const;

export class BudgetLineDto {
  @ApiProperty({ enum: budgetCategories })
  @IsEnum(budgetCategories)
  category: (typeof budgetCategories)[number];

  @ApiProperty({ example: "Pembelian bahan baku utama" })
  @IsString()
  @Length(2, 200)
  description: string;

  @ApiProperty({ minimum: 0, example: 15000000 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  plannedAmount: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 100, default: 80 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  warningThresholdPct?: number;
}
