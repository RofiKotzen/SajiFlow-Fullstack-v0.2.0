import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { drizzle, PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres, { Sql } from "postgres";
import * as schema from "./schema";

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  readonly client: Sql;
  readonly db: PostgresJsDatabase<typeof schema>;

  constructor(config: ConfigService) {
    const ssl =
      config.get<string>("DATABASE_SSL") === "true" ? "require" : false;
    this.client = postgres(config.getOrThrow<string>("DATABASE_URL"), {
      ssl,
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
      transform: { undefined: null },
    });
    this.db = drizzle(this.client, { schema });
  }

  async assertConnection(): Promise<void> {
    await this.client`select 1`;
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.end({ timeout: 5 });
  }
}
