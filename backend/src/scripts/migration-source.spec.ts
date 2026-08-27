import { splitMigrationBatches } from "./migration-source";

describe("migration source batches", () => {
  it("keeps ordinary migrations in one batch", () => {
    expect(splitMigrationBatches("BEGIN; SELECT 1; COMMIT;")).toEqual([
      "BEGIN; SELECT 1; COMMIT;",
    ]);
  });

  it("commits enum preamble before the transactional backfill batch", () => {
    const batches = splitMigrationBatches(
      "ALTER TYPE recipe_status ADD VALUE IF NOT EXISTS 'archived';\n" +
        "-- migrate:next-batch\nBEGIN; SELECT 'archived'; COMMIT;",
    );
    expect(batches).toHaveLength(2);
    expect(batches[0]).toContain("ALTER TYPE");
    expect(batches[1]).toMatch(/^BEGIN;/);
  });
});
