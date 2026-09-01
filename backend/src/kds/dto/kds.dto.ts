import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
} from "class-validator";

export const KDS_ACTIVE_STATUSES = ["queued", "preparing", "ready"] as const;

export class KdsQueueQueryDto {
  @ApiProperty() @IsUUID() outletId!: string;
  @ApiPropertyOptional({ enum: KDS_ACTIVE_STATUSES })
  @IsOptional()
  @IsEnum(KDS_ACTIVE_STATUSES)
  status?: (typeof KDS_ACTIVE_STATUSES)[number];
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
  @ApiPropertyOptional({ default: 50, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 50;
}

export class KdsTransitionDto {
  @ApiProperty() @IsUUID("4") idempotencyKey!: string;
  @ApiProperty() @IsInt() @Min(1) lockVersion!: number;
}
