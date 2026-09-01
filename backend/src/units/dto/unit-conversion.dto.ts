import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { IsBoolean, IsInt, IsNumberString, IsOptional, IsUUID, Matches, Min } from "class-validator";

export class CreateUnitConversionDto {
  @ApiProperty() @IsUUID() fromUnitId!: string;
  @ApiProperty() @IsUUID() toUnitId!: string;
  @ApiProperty({ example: "1000.000000" })
  @IsNumberString() @Matches(/^\d+(\.\d{1,6})?$/) factor!: string;
  @ApiPropertyOptional({ default: true }) @IsOptional() @IsBoolean() isActive?: boolean;
}

export class UpdateUnitConversionDto extends PartialType(CreateUnitConversionDto) {
  @ApiProperty() @IsInt() @Min(1) lockVersion!: number;
}
