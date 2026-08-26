import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, Length, Matches } from 'class-validator';

export class UpdateOutletDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(2, 150)
  name?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 1000)
  address?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @Matches(/^\+?[0-9 ()-]{7,30}$/)
  phone?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @Matches(/^[A-Za-z_]+\/[A-Za-z_+-]+$/)
  timezone?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  businessDayCutoff?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
