import { Injectable } from "@nestjs/common";
import { asc } from "drizzle-orm";
import { DatabaseService } from "../database/database.service";
import { permissions } from "../database/schema";
@Injectable()
export class PermissionsService {
  constructor(private readonly database: DatabaseService) {}
  list() {
    return this.database.db
      .select()
      .from(permissions)
      .orderBy(asc(permissions.module), asc(permissions.code));
  }
}
