import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length, Matches } from 'class-validator';
export class CreateRoleDto {
  @ApiProperty({ example: 'MANAGER' }) @Matches(/^[A-Z0-9_-]+$/) @Length(2, 50) code: string;
  @ApiProperty() @IsString() @Length(2, 100) name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(1, 1000) description?: string;
}
