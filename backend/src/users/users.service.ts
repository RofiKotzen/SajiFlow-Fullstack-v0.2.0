import { randomUUID } from 'node:crypto';
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { hash } from 'bcryptjs';
import { and, asc, eq, inArray, isNull } from 'drizzle-orm';
import { AuditService } from '../audit/audit.service';
import { AuthUser } from '../common/types/auth-user';
import { DatabaseService } from '../database/database.service';
import { outlets, roles, userCredentials, userRoles, users } from '../database/schema';
import { AssignRolesDto } from './dto/assign-roles.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly database: DatabaseService, private readonly audit: AuditService) {}

  list(tenantId: string) {
    return this.database.db.select({ id: users.id, employeeCode: users.employeeCode, fullName: users.fullName, email: users.email, phone: users.phone, status: users.status, lastLoginAt: users.lastLoginAt, createdAt: users.createdAt })
      .from(users).where(and(eq(users.tenantId, tenantId), isNull(users.deletedAt))).orderBy(asc(users.fullName));
  }

  async get(tenantId: string, id: string) {
    const [user] = await this.database.db.select({ id: users.id, employeeCode: users.employeeCode, fullName: users.fullName, email: users.email, phone: users.phone, status: users.status, lastLoginAt: users.lastLoginAt, createdAt: users.createdAt, updatedAt: users.updatedAt })
      .from(users).where(and(eq(users.id, id), eq(users.tenantId, tenantId), isNull(users.deletedAt))).limit(1);
    if (!user) throw new NotFoundException('User tidak ditemukan');
    const assignments = await this.database.db.select({ id: userRoles.id, roleId: roles.id, roleCode: roles.code, roleName: roles.name, outletId: userRoles.outletId, validFrom: userRoles.validFrom, validUntil: userRoles.validUntil })
      .from(userRoles).innerJoin(roles, eq(roles.id, userRoles.roleId)).where(and(eq(userRoles.userId, id), eq(userRoles.tenantId, tenantId), isNull(userRoles.validUntil)));
    return { ...user, assignments };
  }

  async create(actor: AuthUser, dto: CreateUserDto) {
    const email = dto.email.trim().toLowerCase();
    const [exists] = await this.database.db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (exists) throw new ConflictException('Email sudah digunakan');
    const passwordHash = await hash(dto.password, 12);
    const created = await this.database.db.transaction(async (tx) => {
      const [user] = await tx.insert(users).values({ tenantId: actor.tenantId, authUserId: randomUUID(), fullName: dto.fullName.trim(), email, employeeCode: dto.employeeCode, phone: dto.phone, status: 'active', createdBy: actor.userId, updatedBy: actor.userId }).returning();
      await tx.insert(userCredentials).values({ userId: user.id, tenantId: actor.tenantId, passwordHash, createdBy: actor.userId, updatedBy: actor.userId });
      return user;
    });
    await this.audit.record({ tenantId: actor.tenantId, actorUserId: actor.userId, action: 'user.create', entityType: 'user', entityId: created.id, afterData: { ...created, password: undefined } });
    return this.get(actor.tenantId, created.id);
  }

  async update(actor: AuthUser, id: string, dto: UpdateUserDto) {
    const before = await this.get(actor.tenantId, id);
    const [updated] = await this.database.db.update(users).set({ ...dto, updatedBy: actor.userId }).where(and(eq(users.id, id), eq(users.tenantId, actor.tenantId), isNull(users.deletedAt))).returning({ id: users.id });
    if (!updated) throw new NotFoundException('User tidak ditemukan');
    const after = await this.get(actor.tenantId, id);
    await this.audit.record({ tenantId: actor.tenantId, actorUserId: actor.userId, action: 'user.update', entityType: 'user', entityId: id, beforeData: before, afterData: after });
    return after;
  }

  async assignRoles(actor: AuthUser, userId: string, dto: AssignRolesDto) {
    await this.get(actor.tenantId, userId);
    const roleIds = [...new Set(dto.assignments.map((item) => item.roleId))];
    const outletIds = [...new Set(dto.assignments.flatMap((item) => item.outletId ? [item.outletId] : []))];
    if (roleIds.length) {
      const validRoles = await this.database.db.select({ id: roles.id }).from(roles).where(and(eq(roles.tenantId, actor.tenantId), inArray(roles.id, roleIds), isNull(roles.deletedAt)));
      if (validRoles.length !== roleIds.length) throw new NotFoundException('Ada role yang bukan milik tenant');
    }
    if (outletIds.length) {
      const validOutlets = await this.database.db.select({ id: outlets.id }).from(outlets).where(and(eq(outlets.tenantId, actor.tenantId), inArray(outlets.id, outletIds), isNull(outlets.deletedAt)));
      if (validOutlets.length !== outletIds.length) throw new NotFoundException('Ada outlet yang bukan milik tenant');
    }
    const now = new Date();
    await this.database.db.transaction(async (tx) => {
      await tx.update(userRoles).set({ validUntil: now, updatedBy: actor.userId }).where(and(eq(userRoles.tenantId, actor.tenantId), eq(userRoles.userId, userId), isNull(userRoles.validUntil)));
      if (dto.assignments.length) await tx.insert(userRoles).values(dto.assignments.map((item) => ({ tenantId: actor.tenantId, userId, roleId: item.roleId, outletId: item.outletId, createdBy: actor.userId, updatedBy: actor.userId })));
    });
    await this.audit.record({ tenantId: actor.tenantId, actorUserId: actor.userId, action: 'user.assign_roles', entityType: 'user', entityId: userId, afterData: dto.assignments });
    return this.get(actor.tenantId, userId);
  }
}
