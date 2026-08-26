import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { and, asc, eq, isNull } from "drizzle-orm";
import { AuditService } from "../audit/audit.service";
import { AuthUser } from "../common/types/auth-user";
import { DatabaseService } from "../database/database.service";
import { outlets } from "../database/schema";
import { CreateOutletDto } from "./dto/create-outlet.dto";
import { UpdateOutletDto } from "./dto/update-outlet.dto";

@Injectable()
export class OutletsService {
  constructor(
    private readonly database: DatabaseService,
    private readonly audit: AuditService,
  ) {}
  list(tenantId: string) {
    return this.database.db
      .select()
      .from(outlets)
      .where(and(eq(outlets.tenantId, tenantId), isNull(outlets.deletedAt)))
      .orderBy(asc(outlets.name));
  }
  async get(tenantId: string, id: string) {
    const [outlet] = await this.database.db
      .select()
      .from(outlets)
      .where(
        and(
          eq(outlets.id, id),
          eq(outlets.tenantId, tenantId),
          isNull(outlets.deletedAt),
        ),
      )
      .limit(1);
    if (!outlet) throw new NotFoundException("Outlet tidak ditemukan");
    return outlet;
  }
  async create(user: AuthUser, dto: CreateOutletDto) {
    const [exists] = await this.database.db
      .select({ id: outlets.id })
      .from(outlets)
      .where(
        and(
          eq(outlets.tenantId, user.tenantId),
          eq(outlets.code, dto.code),
          isNull(outlets.deletedAt),
        ),
      )
      .limit(1);
    if (exists) throw new ConflictException("Kode outlet sudah digunakan");
    const [created] = await this.database.db
      .insert(outlets)
      .values({
        ...dto,
        tenantId: user.tenantId,
        createdBy: user.userId,
        updatedBy: user.userId,
      })
      .returning();
    await this.audit.record({
      tenantId: user.tenantId,
      actorUserId: user.userId,
      action: "outlet.create",
      entityType: "outlet",
      entityId: created.id,
      afterData: created,
    });
    return created;
  }
  async update(user: AuthUser, id: string, dto: UpdateOutletDto) {
    const before = await this.get(user.tenantId, id);
    const [updated] = await this.database.db
      .update(outlets)
      .set({ ...dto, updatedBy: user.userId })
      .where(
        and(
          eq(outlets.id, id),
          eq(outlets.tenantId, user.tenantId),
          isNull(outlets.deletedAt),
        ),
      )
      .returning();
    await this.audit.record({
      tenantId: user.tenantId,
      actorUserId: user.userId,
      action: "outlet.update",
      entityType: "outlet",
      entityId: id,
      beforeData: before,
      afterData: updated,
    });
    return updated;
  }
}
