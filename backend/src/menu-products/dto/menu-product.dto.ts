import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
  IsBoolean,
  IsInt,
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  Min,
} from "class-validator";

const codePattern = /^[A-Za-z0-9_-]+$/;

export class ListMenuProductsDto {
  @IsOptional() @IsString() @Length(1, 100) search?: string;
  @IsOptional() @IsUUID() categoryId?: string;
  @IsOptional() @IsUUID() outletId?: string;
  @IsOptional()
  @Transform(({ value }) => value === "true")
  @IsBoolean()
  isActive?: boolean;
  @IsOptional() @Transform(({ value }) => Number(value)) @IsInt() @Min(1) page =
    1;
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 25;
}

export class CreateMenuCategoryDto {
  @ApiProperty() @Matches(codePattern) @Length(2, 40) code!: string;
  @ApiProperty() @IsString() @Length(2, 100) name!: string;
  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;
}
export class UpdateMenuCategoryDto extends PartialType(CreateMenuCategoryDto) {
  @ApiProperty() @IsInt() @Min(1) lockVersion!: number;
}

export class CreateMenuDto {
  @ApiProperty() @Matches(codePattern) @Length(2, 50) code!: string;
  @ApiProperty() @IsString() @Length(2, 150) name!: string;
  @ApiProperty() @IsUUID() categoryId!: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 2000)
  description?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsUUID() taxProfileId?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsUUID() serviceChargeProfileId?:
    string | null;
}
export class UpdateMenuDto extends PartialType(CreateMenuDto) {
  @ApiProperty() @IsInt() @Min(1) lockVersion!: number;
}

export class CreateMenuVariantDto {
  @ApiProperty() @Matches(codePattern) @Length(2, 40) sku!: string;
  @ApiProperty() @IsString() @Length(1, 100) name!: string;
  @ApiProperty()
  @IsNumberString()
  @Matches(/^\d+(\.\d{1,2})?$/)
  sellingPrice!: string;
  @ApiProperty() @Matches(/^[A-Z]{3}$/) currencyCode!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(1, 100) barcode?:
    string | null;
  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;
  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  requiresRecipe?: boolean;
  @ApiPropertyOptional({
    default: true,
    description: "Mengirim variant ke antrean dapur; independen dari Recipe.",
  })
  @IsOptional()
  @IsBoolean()
  requiresKitchen?: boolean;
}
export class UpdateMenuVariantDto extends PartialType(CreateMenuVariantDto) {
  @ApiProperty() @IsInt() @Min(1) lockVersion!: number;
}

export class ArchiveMenuProductDto {
  @ApiProperty() @IsString() @Length(3, 500) reason!: string;
  @ApiProperty() @IsInt() @Min(1) lockVersion!: number;
}
export class ActivateMenuProductDto {
  @ApiProperty() @IsInt() @Min(1) lockVersion!: number;
}

export class UpdateOutletAvailabilityDto {
  @ApiProperty() @IsBoolean() isAvailable!: boolean;
  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) lockVersion?: number;
}
export class UpdateOutletPriceDto {
  @ApiProperty({ nullable: true })
  @IsOptional()
  @IsNumberString()
  @Matches(/^\d+(\.\d{1,2})?$/)
  priceOverride?: string | null;
  @ApiProperty() @IsInt() @Min(1) lockVersion!: number;
}

export function normalizeCode(value: string): string {
  return value.trim().toUpperCase();
}

export function normalizeName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}
