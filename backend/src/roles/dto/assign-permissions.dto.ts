import { ApiProperty } from "@nestjs/swagger";
import { ArrayMaxSize, IsArray, IsUUID } from "class-validator";
export class AssignPermissionsDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMaxSize(250)
  @IsUUID(undefined, { each: true })
  permissionIds: string[];
}
