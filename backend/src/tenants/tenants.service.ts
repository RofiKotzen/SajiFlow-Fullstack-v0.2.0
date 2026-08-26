import { Injectable, NotFoundException } from "@nestjs/common";
import { and, eq, isNull } from "drizzle-orm";
import { AuditService } from "../audit/audit.service";
import { AuthUser } from "../common/types/auth-user";
import { DatabaseService } from "../database/database.service";
import { tenants } from "../database/schema";
import { UpdateTenantDto } from "./dto/update-tenant.dto";

@Injectable()
export class TenantsService {
  constructor(
    private readonly database: DatabaseService,
    private readonly audit: AuditService,
  ) {}

  async current(tenantId: string) {
    const [tenant] = await this.database.db
      .select()
      .from(tenants)
      .where(and(eq(tenants.id, tenantId), isNull(tenants.deletedAt)))
      .limit(1);
    if (!tenant) throw new NotFoundException("Tenant tidak ditemukan");
    return tenant;
  }

  async update(user: AuthUser, dto: UpdateTenantDto) {
    const before = await this.current(user.tenantId);
    const [updated] = await this.database.db
      .update(tenants)
      .set({ ...dto, updatedBy: user.userId })
      .where(and(eq(tenants.id, user.tenantId), isNull(tenants.deletedAt)))
      .returning();
    await this.audit.record({
      tenantId: user.tenantId,
      actorUserId: user.userId,
      action: "tenant.update",
      entityType: "tenant",
      entityId: user.tenantId,
      beforeData: before,
      afterData: updated,
    });
    return updated;
  }
}
