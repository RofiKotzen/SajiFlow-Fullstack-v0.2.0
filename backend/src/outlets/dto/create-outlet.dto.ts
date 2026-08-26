import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, Length, Matches } from "class-validator";

export class CreateOutletDto {
  @ApiProperty({ example: "JKT01" })
  @Matches(/^[A-Z0-9_-]+$/)
  @Length(2, 30)
  code: string;
  @ApiProperty()
  @IsString()
  @Length(2, 150)
  name: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 1000)
  address?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @Matches(/^\+?[0-9 ()-]{7,30}$/)
  phone?: string;
  @ApiPropertyOptional({ example: "Asia/Jakarta" })
  @IsOptional()
  @Matches(/^[A-Za-z_]+\/[A-Za-z_+-]+$/)
  timezone?: string;
  @ApiPropertyOptional({ example: "04:00" })
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  businessDayCutoff?: string;
}
