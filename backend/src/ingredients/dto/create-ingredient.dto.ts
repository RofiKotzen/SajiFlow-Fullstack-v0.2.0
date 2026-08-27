import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  Min,
  ValidateIf,
  ValidateNested,
} from "class-validator";
import { IngredientOutletSettingDto } from "./ingredient-outlet-setting.dto";

export const valuationMethods = ["weighted_average", "fifo"] as const;

export class CreateIngredientDto {
  @ApiProperty({ example: "ING-TOMATO" })
  @Matches(/^[A-Za-z0-9_-]+$/)
  @Length(2, 50)
  sku: string;
  @ApiProperty() @IsString() @Length(2, 150) name: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() categoryId?: string | null;
  @ApiProperty() @IsUUID() baseUnitId: string;
  @ApiPropertyOptional({ enum: valuationMethods, default: "weighted_average" })
  @IsOptional()
  @IsIn(valuationMethods)
  valuationMethod?: (typeof valuationMethods)[number];
  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isPerishable?: boolean;
  @ApiPropertyOptional()
  @ValidateIf(
    (value) => value.isPerishable || value.shelfLifeDays !== undefined,
  )
  @IsInt()
  @Min(1)
  @Max(3650)
  shelfLifeDays?: number | null;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(1, 100) barcode?:
    string | null;
  @ApiPropertyOptional({ type: [IngredientOutletSettingDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IngredientOutletSettingDto)
  @ArrayUnique((setting: IngredientOutletSettingDto) => setting.outletId)
  outletSettings?: IngredientOutletSettingDto[];
}
