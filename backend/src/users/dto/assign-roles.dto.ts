import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsOptional, IsUUID, ValidateNested } from 'class-validator';

export class RoleAssignmentDto {
  @ApiProperty()
  @IsUUID()
  roleId: string;
  @ApiProperty({ required: false, description: 'Kosong berarti berlaku untuk semua outlet.' })
  @IsOptional()
  @IsUUID()
  outletId?: string;
}

export class AssignRolesDto {
  @ApiProperty({ type: [RoleAssignmentDto] })
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => RoleAssignmentDto)
  assignments: RoleAssignmentDto[];
}
