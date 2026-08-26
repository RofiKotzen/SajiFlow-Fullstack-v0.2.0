import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, Length, Matches } from 'class-validator';

export class CreateUserDto {
  @ApiProperty()
  @IsString()
  @Length(2, 150)
  fullName: string;
  @ApiProperty()
  @IsEmail()
  email: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 40)
  employeeCode?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @Matches(/^\+?[0-9 ()-]{7,30}$/)
  phone?: string;
  @ApiProperty({ minLength: 12, example: 'PasswordKuat123!' })
  @Length(12, 128)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/, { message: 'password harus berisi huruf kecil, huruf besar, angka, dan simbol' })
  password: string;
}
