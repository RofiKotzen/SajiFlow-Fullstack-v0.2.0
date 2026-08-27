import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ArrayMinSize, IsArray, IsNumberString, IsOptional, IsString, IsUUID, Length, Matches, ValidateNested } from "class-validator";
import { RecipeItemDto } from "./recipe-item.dto";

export class CreateRecipeDto {
  @ApiProperty() @IsString() @Matches(/^[A-Z0-9_-]+$/) @Length(2, 50) code!: string;
  @ApiProperty() @IsString() @Length(2, 150) name!: string;
  @ApiProperty() @IsUUID() menuVariantId!: string;
  @ApiProperty({ example: "1.000" }) @IsNumberString() yieldQuantity!: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() yieldUnitId?: string;
  @ApiProperty({ example: "1.000" }) @IsNumberString() servingCount!: string;
  @ApiProperty({ example: "1.000" }) @IsNumberString() servingSize!: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() servingUnitId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(0, 5000) notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(0, 20000) productionInstructions?: string;
  @ApiProperty({ type: [RecipeItemDto] }) @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => RecipeItemDto) items!: RecipeItemDto[];
}
