import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  Min,
} from "class-validator";

export class CreateSupplierDto {
  @ApiProperty({ example: "SUP-001" })
  @Matches(/^[A-Za-z0-9_-]+$/)
  @Length(2, 40)
  code: string;
  @ApiProperty() @IsString() @Length(2, 150) name: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 40)
  taxId?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 120)
  contactName?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @Matches(/^\+?[0-9 ()-]{7,30}$/)
  phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() email?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 2000)
  address?: string;
  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(3650)
  paymentTermDays?: number;
  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(3650)
  leadTimeDays?: number;
}
