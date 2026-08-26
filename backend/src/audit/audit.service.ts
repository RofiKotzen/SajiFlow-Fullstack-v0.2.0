import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import { auditLogs } from "../database/schema";

export interface AuditEntry {
  tenantId: string;
  actorUserId?: string;
  outletId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  beforeData?: unknown;
  afterData?: unknown;
  reason?: string;
}

@Injectable()
export class AuditService {
  constructor(private readonly database: DatabaseService) {}

  async record(entry: AuditEntry): Promise<void> {
    await this.database.db.insert(auditLogs).values({
      tenantId: entry.tenantId,
      actorUserId: entry.actorUserId,
      outletId: entry.outletId,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      beforeData: entry.beforeData,
      afterData: entry.afterData,
      reason: entry.reason,
    });
  }
}
