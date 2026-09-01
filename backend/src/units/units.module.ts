import { Module } from "@nestjs/common";
import { UnitsController } from "./units.controller";
import { UnitsService } from "./units.service";
import { UnitConversionsService } from "./unit-conversions.service";
import { UnitConversionResolver } from "./unit-conversion-resolver.service";
@Module({ controllers: [UnitsController], providers: [UnitsService, UnitConversionsService, UnitConversionResolver], exports: [UnitConversionResolver] })
export class UnitsModule {}
