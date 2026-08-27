import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  ValidateNested,
} from "class-validator";
import { IngredientOutletSettingDto } from "./ingredient-outlet-setting.dto";
export class UpdateOutletSettingsDto {
  @ApiProperty({ type: [IngredientOutletSettingDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => IngredientOutletSettingDto)
  @ArrayUnique((setting: IngredientOutletSettingDto) => setting.outletId)
  settings: IngredientOutletSettingDto[];
}
