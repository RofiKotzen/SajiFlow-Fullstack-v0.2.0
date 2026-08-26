import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsDateString, IsEnum, IsOptional, IsUUID } from "class-validator";

const budgetStatuses = [
  "draft",
  "submitted",
  "approved",
  "rejected",
  "closed",
] as const;

export class ListBudgetsQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  outletId?: string;

  @ApiPropertyOptional({ enum: budgetStatuses })
  @IsOptional()
  @IsEnum(budgetStatuses)
  status?: (typeof budgetStatuses)[number];

  @ApiPropertyOptional({
    description: "Budget yang periodenya beririsan dengan tanggal ini",
  })
  @IsOptional()
  @IsDateString({ strict: true })
  periodStart?: string;

  @ApiPropertyOptional({
    description: "Budget yang periodenya beririsan dengan tanggal ini",
  })
  @IsOptional()
  @IsDateString({ strict: true })
  periodEnd?: string;
}
