import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { AuditService } from "../audit/audit.service";
import { AuthUser } from "../common/types/auth-user";
import { DatabaseService } from "../database/database.service";
import { ingredientCategories } from "../database/schema";
import { CreateIngredientCategoryDto, UpdateIngredientCategoryDto } from "./dto/ingredient-category.dto";

@Injectable()
export class IngredientCategoriesService {
  constructor(private readonly database: DatabaseService, private readonly audit: AuditService) {}
  list(actor: AuthUser) { return this.database.db.select().from(ingredientCategories).where(and(eq(ingredientCategories.tenantId, actor.tenantId), isNull(ingredientCategories.deletedAt))).orderBy(asc(ingredientCategories.displayOrder), asc(ingredientCategories.name)); }
  async create(actor: AuthUser, dto: CreateIngredientCategoryDto) {
    const code = normalizeCode(dto.code);
    await this.unique(actor.tenantId, code);
    try {
      const [created] = await this.database.db.insert(ingredientCategories).values({ tenantId: actor.tenantId, code, name: normalizeName(dto.name), description: dto.description?.trim() || null, displayOrder: dto.displayOrder ?? 0, createdBy: actor.userId, updatedBy: actor.userId }).returning();
      await this.audit.record({ tenantId: actor.tenantId, actorUserId: actor.userId, action: "ingredient_category.create", entityType: "ingredient_category", entityId: created.id, afterData: created });
      return created;
    } catch (error) { if ((error as { code?: string }).code === "23505") throw duplicate(); throw error; }
  }
  async update(actor: AuthUser, id: string, dto: UpdateIngredientCategoryDto) {
    const [before] = await this.database.db.select().from(ingredientCategories).where(and(eq(ingredientCategories.id, id), eq(ingredientCategories.tenantId, actor.tenantId), isNull(ingredientCategories.deletedAt))).limit(1);
    if (!before) throw new NotFoundException({ code: "INGREDIENT_CATEGORY_NOT_FOUND", message: "Kategori bahan tidak ditemukan." });
    const code = dto.code ? normalizeCode(dto.code) : undefined;
    if (code && code !== before.code) await this.unique(actor.tenantId, code, id);
    try {
      const [updated] = await this.database.db.update(ingredientCategories).set({ ...(code ? { code } : {}), ...(dto.name ? { name: normalizeName(dto.name) } : {}), ...(dto.description !== undefined ? { description: dto.description?.trim() || null } : {}), ...(dto.displayOrder !== undefined ? { displayOrder: dto.displayOrder } : {}), ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}), lockVersion: sql`${ingredientCategories.lockVersion} + 1`, updatedAt: new Date(), updatedBy: actor.userId }).where(and(eq(ingredientCategories.id, id), eq(ingredientCategories.tenantId, actor.tenantId), eq(ingredientCategories.lockVersion, dto.lockVersion), isNull(ingredientCategories.deletedAt))).returning();
      if (!updated) throw new ConflictException({ code: "INGREDIENT_CATEGORY_STALE_VERSION", message: "Kategori telah berubah. Muat ulang data." });
      await this.audit.record({ tenantId: actor.tenantId, actorUserId: actor.userId, action: updated.isActive ? "ingredient_category.update" : "ingredient_category.archive", entityType: "ingredient_category", entityId: id, beforeData: before, afterData: updated });
      return updated;
    } catch (error) { if ((error as { code?: string }).code === "23505") throw duplicate(); throw error; }
  }
  private async unique(tenantId: string, code: string, exclude?: string) { const [row] = await this.database.db.select({ id: ingredientCategories.id }).from(ingredientCategories).where(and(eq(ingredientCategories.tenantId, tenantId), eq(ingredientCategories.code, code), isNull(ingredientCategories.deletedAt))).limit(1); if (row && row.id !== exclude) throw duplicate(); }
}
function normalizeCode(value: string) { return value.trim().toUpperCase(); }
function normalizeName(value: string) { return value.trim().replace(/\s+/g, " "); }
function duplicate() { return new ConflictException({ code: "INGREDIENT_CATEGORY_DUPLICATE", message: "Kode kategori bahan sudah digunakan." }); }
