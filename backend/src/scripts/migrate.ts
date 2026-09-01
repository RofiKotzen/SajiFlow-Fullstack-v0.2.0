import "dotenv/config";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import postgres from "postgres";
import {
  migrationChecksum,
  splitMigrationBatches,
  stripOuterTransaction,
} from "./migration-source";

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL belum diisi pada .env");

  const client = postgres(databaseUrl, {
    ssl: process.env.DATABASE_SSL === "true" ? "require" : false,
    max: 1,
  });
  let migrationLockHeld = false;

  try {
    await client`select pg_advisory_lock(hashtext('sajiflow_schema_migrations'))`;
    migrationLockHeld = true;
    await client`
      create table if not exists public.schema_migrations (
        filename text primary key,
        checksum char(64) not null,
        applied_at timestamptz not null default now()
      )
    `;

    const directory = resolve(process.cwd(), "drizzle");
    const files = (await readdir(directory))
      .filter((file) => file.endsWith(".sql"))
      .sort();

    for (const filename of files) {
      const source = await readFile(resolve(directory, filename), "utf8");
      const checksum = migrationChecksum(source);
      const [applied] = await client<{ checksum: string }[]>`
        select checksum from public.schema_migrations where filename = ${filename}
      `;
      if (applied) {
        if (applied.checksum !== checksum)
          throw new Error(`Checksum migration berubah: ${filename}`);
        console.log(`SKIP  ${filename}`);
        continue;
      }

      // User yang sudah menjalankan schema v1.1 dapat langsung meneruskan ke 0002.
      if (filename === "0001_initial_schema.sql") {
        const [{ exists }] = await client<{ exists: boolean }[]>`
          select to_regclass('public.tenants') is not null as exists
        `;
        if (exists) {
          await client`
            insert into public.schema_migrations (filename, checksum) values (${filename}, ${checksum})
          `;
          console.log(`BASE  ${filename} (schema awal sudah tersedia)`);
          continue;
        }
      }

      console.log(`APPLY ${filename}`);
      const batches = splitMigrationBatches(source);
      if (batches.length === 1) {
        const body = stripOuterTransaction(batches[0]);
        await client.begin(async (tx) => {
          await tx.unsafe(body);
          await tx`
            insert into public.schema_migrations (filename, checksum) values (${filename}, ${checksum})
          `;
        });
        continue;
      }
      for (const [index, batch] of batches.entries()) {
        if (batches.length > 1)
          console.log(`  BATCH ${index + 1}/${batches.length}`);
        await client.unsafe(batch);
      }
      await client`
        insert into public.schema_migrations (filename, checksum) values (${filename}, ${checksum})
      `;
    }
  } finally {
    if (migrationLockHeld)
      await client`select pg_advisory_unlock(hashtext('sajiflow_schema_migrations'))`;
    await client.end({ timeout: 5 });
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
