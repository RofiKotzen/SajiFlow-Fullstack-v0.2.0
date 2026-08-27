import { Transform } from "class-transformer";
import { IsBoolean, IsOptional, IsString, MaxLength } from "class-validator";
export class ListSuppliersQueryDto {
  @IsOptional() @IsString() @MaxLength(100) search?: string;
  @IsOptional()
  @Transform(({ value }) => value === "true")
  @IsBoolean()
  isActive?: boolean;
}
