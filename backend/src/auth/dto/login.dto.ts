import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, Length, Matches } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin@sajiflow.local' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'GantiPasswordKuat123!' })
  @IsString()
  @Length(8, 128)
  password: string;

  @ApiPropertyOptional({ example: 'SAJIFLOW' })
  @IsOptional()
  @Matches(/^[A-Z0-9_-]+$/)
  tenantCode?: string;
}
