import { IsUUID } from "class-validator";

export class InventoryDetailQueryDto {
  @IsUUID()
  outletId!: string;
}
