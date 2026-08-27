import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  Min,
} from "class-validator";

export const unitDimensions = ["mass", "volume", "count", "length"] as const;

export class CreateUnitDto {
  @ApiProperty({ example: "KG" })
  @Matches(/^[A-Za-z0-9_-]+$/)
  @Length(1, 20)
  code: string;

  @ApiProperty({ example: "Kilogram" })
  @IsString()
  @Length(2, 80)
  name: string;

  @ApiProperty({ enum: unitDimensions })
  @IsIn(unitDimensions)
  dimension: (typeof unitDimensions)[number];

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isBase?: boolean;

  @ApiPropertyOptional({ default: 3, minimum: 0, maximum: 6 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(6)
  decimalScale?: number;
}
