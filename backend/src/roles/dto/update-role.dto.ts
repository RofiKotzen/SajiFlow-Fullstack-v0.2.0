import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';
export class UpdateRoleDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(2, 100) name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(1, 1000) description?: string;
}
