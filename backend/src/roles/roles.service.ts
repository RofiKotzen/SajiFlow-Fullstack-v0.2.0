import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { AuditService } from "../audit/audit.service";
import { AuthUser } from "../common/types/auth-user";
import { DatabaseService } from "../database/database.service";
import { permissions, rolePermissions, roles } from "../database/schema";
import { AssignPermissionsDto } from "./dto/assign-permissions.dto";
import { CreateRoleDto } from "./dto/create-role.dto";
import { UpdateRoleDto } from "./dto/update-role.dto";

@Injectable()
export class RolesService {
  constructor(
    private readonly database: DatabaseService,
    private readonly audit: AuditService,
  ) {}
  list(tenantId: string) {
    return this.database.db
      .select()
      .from(roles)
      .where(and(eq(roles.tenantId, tenantId), isNull(roles.deletedAt)))
      .orderBy(asc(roles.name));
  }
  async get(tenantId: string, id: string) {
    const [role] = await this.database.db
      .select()
      .from(roles)
      .where(
        and(
          eq(roles.id, id),
          eq(roles.tenantId, tenantId),
          isNull(roles.deletedAt),
        ),
      )
      .limit(1);
    if (!role) throw new NotFoundException("Role tidak ditemukan");
    const granted = await this.database.db
      .select({
        id: permissions.id,
        code: permissions.code,
        module: permissions.module,
        description: permissions.description,
      })
      .from(rolePermissions)
      .innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
      .where(
        and(
          eq(rolePermissions.tenantId, tenantId),
          eq(rolePermissions.roleId, id),
        ),
      )
      .orderBy(asc(permissions.code));
    return { ...role, permissions: granted };
  }
  async create(actor: AuthUser, dto: CreateRoleDto) {
    const [exists] = await this.database.db
      .select({ id: roles.id })
      .from(roles)
      .where(
        and(
          eq(roles.tenantId, actor.tenantId),
          eq(roles.code, dto.code),
          isNull(roles.deletedAt),
        ),
      )
      .limit(1);
    if (exists) throw new ConflictException("Kode role sudah digunakan");
    const [created] = await this.database.db
      .insert(roles)
      .values({
        ...dto,
        tenantId: actor.tenantId,
        createdBy: actor.userId,
        updatedBy: actor.userId,
      })
      .returning();
    await this.audit.record({
      tenantId: actor.tenantId,
      actorUserId: actor.userId,
      action: "role.create",
      entityType: "role",
      entityId: created.id,
      afterData: created,
    });
    return this.get(actor.tenantId, created.id);
  }
  async update(actor: AuthUser, id: string, dto: UpdateRoleDto) {
    const before = await this.get(actor.tenantId, id);
    const [updated] = await this.database.db
      .update(roles)
      .set({ ...dto, updatedBy: actor.userId })
      .where(
        and(
          eq(roles.id, id),
          eq(roles.tenantId, actor.tenantId),
          isNull(roles.deletedAt),
        ),
      )
      .returning({ id: roles.id });
    if (!updated) throw new NotFoundException("Role tidak ditemukan");
    const after = await this.get(actor.tenantId, id);
    await this.audit.record({
      tenantId: actor.tenantId,
      actorUserId: actor.userId,
      action: "role.update",
      entityType: "role",
      entityId: id,
      beforeData: before,
      afterData: after,
    });
    return after;
  }
  async assignPermissions(
    actor: AuthUser,
    roleId: string,
    dto: AssignPermissionsDto,
  ) {
    const role = await this.get(actor.tenantId, roleId);
    const ids = [...new Set(dto.permissionIds)];
    if (ids.length) {
      const valid = await this.database.db
        .select({ id: permissions.id })
        .from(permissions)
        .where(inArray(permissions.id, ids));
      if (valid.length !== ids.length)
        throw new NotFoundException("Ada permission yang tidak valid");
    }
    await this.database.db.transaction(async (tx) => {
      await tx
        .delete(rolePermissions)
        .where(
          and(
            eq(rolePermissions.tenantId, actor.tenantId),
            eq(rolePermissions.roleId, roleId),
          ),
        );
      if (ids.length)
        await tx.insert(rolePermissions).values(
          ids.map((permissionId) => ({
            tenantId: actor.tenantId,
            roleId,
            permissionId,
            createdBy: actor.userId,
            updatedBy: actor.userId,
          })),
        );
    });
    await this.audit.record({
      tenantId: actor.tenantId,
      actorUserId: actor.userId,
      action: "role.assign_permissions",
      entityType: "role",
      entityId: roleId,
      beforeData: role.permissions.map((p) => p.id),
      afterData: ids,
    });
    return this.get(actor.tenantId, roleId);
  }
}
