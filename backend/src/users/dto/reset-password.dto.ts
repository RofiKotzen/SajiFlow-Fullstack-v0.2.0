import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, Length, Matches } from "class-validator";

export class ResetPasswordDto {
  @ApiProperty({ minLength: 12, maxLength: 128, example: "PasswordBaru123!" })
  @IsString()
  @Length(12, 128)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/, {
    message:
      "newPassword harus berisi huruf kecil, huruf besar, angka, dan simbol",
  })
  newPassword: string;

  @ApiPropertyOptional({
    description: "Alasan administratif perubahan password",
  })
  @IsOptional()
  @IsString()
  @Length(3, 500)
  reason?: string;
}
