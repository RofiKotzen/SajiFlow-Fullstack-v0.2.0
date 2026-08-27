import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, IsUUID, Length } from "class-validator";
export class OutletActionDto { @ApiProperty() @IsUUID() outletId!: string; }
export class RevisionDto { @ApiProperty() @IsString() @Length(3, 500) reason!: string; }
export class ArchiveRecipeDto { @ApiProperty() @IsString() @Length(3, 500) reason!: string; }
export class ListRecipesDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() outletId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
}
