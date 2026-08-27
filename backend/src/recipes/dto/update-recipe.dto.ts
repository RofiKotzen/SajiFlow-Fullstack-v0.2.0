import { PartialType, OmitType } from "@nestjs/swagger";
import { CreateRecipeDto } from "./create-recipe.dto";
export class UpdateRecipeDto extends PartialType(OmitType(CreateRecipeDto, ["code", "menuVariantId"] as const)) {}
