import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsNumberString, IsOptional, IsUUID, Matches } from "class-validator";

export class RecipeItemDto {
  @ApiProperty() @IsUUID() ingredientId!: string;
  @ApiProperty() @IsUUID() unitId!: string;
  @ApiProperty({ example: "1.250000" }) @IsNumberString() @Matches(/^\d+(\.\d{1,6})?$/) netQuantity!: string;
  @ApiProperty({ example: "5.00" }) @IsNumberString() @Matches(/^\d+(\.\d{1,2})?$/) wastePercentage!: string;
  @ApiPropertyOptional({ default: false }) @IsOptional() @IsBoolean() isOptional?: boolean;
}
