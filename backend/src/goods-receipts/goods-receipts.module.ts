import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { DatabaseModule } from "../database/database.module";
import { GoodsReceiptsController } from "./goods-receipts.controller";
import { GoodsReceiptsService } from "./goods-receipts.service";

@Module({
  imports: [DatabaseModule, AuditModule],
  controllers: [GoodsReceiptsController],
  providers: [GoodsReceiptsService],
})
export class GoodsReceiptsModule {}
