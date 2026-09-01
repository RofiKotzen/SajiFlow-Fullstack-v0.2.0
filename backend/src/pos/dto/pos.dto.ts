import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  Min,
  Validate,
  ValidateIf,
  ValidateNested,
  ValidatorConstraint,
  type ValidationArguments,
  type ValidatorConstraintInterface,
} from "class-validator";
import { ORDER_TYPES, PAYMENT_METHODS } from "../pos-domain";

const moneyPattern = /^(?:0\.(?:0[1-9]|[1-9]\d?)|[1-9]\d*(?:\.\d{1,2})?)$/;

@ValidatorConstraint({ name: "posOrderTable", async: false })
class PosOrderTableConstraint implements ValidatorConstraintInterface {
  validate(value: unknown, args: ValidationArguments): boolean {
    const orderType = (args.object as { orderType?: unknown }).orderType;
    if (orderType === "dine_in")
      return (
        typeof value === "string" &&
        value.trim().length >= 1 &&
        value.trim().length <= 30
      );
    return orderType !== "takeaway" || value === undefined || value === null;
  }

  defaultMessage(): string {
    return "Nomor meja wajib untuk dine-in dan tidak berlaku untuk takeaway.";
  }
}

export class PosOrderItemDto {
  @ApiProperty() @IsUUID() menuVariantId!: string;
  @ApiProperty() @IsInt() @Min(1) @Max(999) quantity!: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 500)
  notes?: string | null;
}

export class CreatePosOrderDto {
  @ApiProperty() @IsUUID() outletId!: string;
  @ApiProperty({ enum: ORDER_TYPES }) @IsEnum(ORDER_TYPES) orderType!:
    "dine_in" | "takeaway";
  @ApiPropertyOptional()
  @Validate(PosOrderTableConstraint)
  tableNumber?: string | null;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 150)
  customerName?: string | null;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 1000)
  notes?: string | null;
  @ApiProperty({ type: [PosOrderItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => PosOrderItemDto)
  items!: PosOrderItemDto[];
  @ApiProperty() @IsUUID("4") idempotencyKey!: string;
}

export class UpdatePosOrderDto {
  @ApiProperty() @IsInt() @Min(1) lockVersion!: number;
  @ApiPropertyOptional({ enum: ORDER_TYPES })
  @IsOptional()
  @IsEnum(ORDER_TYPES)
  orderType?: "dine_in" | "takeaway";
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 30)
  tableNumber?: string | null;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 150)
  customerName?: string | null;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 1000)
  notes?: string | null;
  @ApiProperty({ type: [PosOrderItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => PosOrderItemDto)
  items!: PosOrderItemDto[];
}

export class PosMutationDto {
  @ApiProperty() @IsUUID("4") idempotencyKey!: string;
  @ApiProperty() @IsInt() @Min(1) lockVersion!: number;
}

export class RecordPosPaymentDto extends PosMutationDto {
  @ApiProperty({ enum: PAYMENT_METHODS })
  @IsEnum(PAYMENT_METHODS)
  method!: "cash" | "qris_manual" | "card_manual";
  @ApiProperty()
  @IsNumberString()
  @Matches(moneyPattern)
  amountTendered!: string;
  @ApiPropertyOptional()
  @ValidateIf((dto: RecordPosPaymentDto) => dto.method !== "cash")
  @IsString()
  @Length(1, 150)
  externalReference?: string | null;
}

export class PosReasonMutationDto extends PosMutationDto {
  @ApiProperty() @IsString() @Length(3, 500) reason!: string;
}

export class VoidPosOrderDto extends PosReasonMutationDto {
  @ApiProperty() @IsString() @Length(1, 150) refundReference!: string;
}
