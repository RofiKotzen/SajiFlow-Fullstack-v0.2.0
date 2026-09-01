import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
} from "class-validator";
import { ORDER_STATUSES } from "../pos-domain";

const paymentStatuses = ["unpaid", "paid", "voided"] as const;

export class PosLookupQueryDto {
  @ApiProperty() @IsUUID() outletId!: string;
}

export class ListPosOrdersQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() outletId?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString({ strict: true })
  dateFrom?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString({ strict: true })
  dateTo?: string;
  @ApiPropertyOptional({ enum: ORDER_STATUSES })
  @IsOptional()
  @IsEnum(ORDER_STATUSES)
  status?: (typeof ORDER_STATUSES)[number];
  @ApiPropertyOptional({ enum: paymentStatuses })
  @IsOptional()
  @IsEnum(paymentStatuses)
  paymentStatus?: (typeof paymentStatuses)[number];
  @ApiPropertyOptional() @IsOptional() @IsUUID() cashierId?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 100)
  search?: string;
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;
  @ApiPropertyOptional({ default: 25, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 25;
}
