import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { IsBoolean, IsInt, IsOptional, IsString, Length, Matches, Min } from "class-validator";

export class CreateIngredientCategoryDto {
  @ApiProperty() @Matches(/^[A-Za-z0-9_-]+$/) @Length(2, 40) code!: string;
  @ApiProperty() @IsString() @Length(2, 100) name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(0, 2000) description?: string | null;
  @ApiPropertyOptional({ default: 0 }) @IsOptional() @IsInt() @Min(0) displayOrder?: number;
}
export class UpdateIngredientCategoryDto extends PartialType(CreateIngredientCategoryDto) {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiProperty() @IsInt() @Min(1) lockVersion!: number;
}
