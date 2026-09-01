import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  canonicalMigrationSource,
  migrationChecksum,
  splitMigrationBatches,
  stripOuterTransaction,
} from "./migration-source";

describe("migration source batches", () => {
  it("uses one canonical LF checksum for LF and CRLF", () => {
    const lf = "BEGIN;\nSELECT 1;\nCOMMIT;\n";
    const crlf = lf.replace(/\n/g, "\r\n");
    expect(canonicalMigrationSource(crlf)).toBe(lf);
    expect(migrationChecksum(crlf)).toBe(migrationChecksum(lf));
  });

  it("still detects SQL, logical whitespace, comment, and BOM changes", () => {
    const source = "SELECT 1;\n";
    expect(migrationChecksum("SELECT 2;\n")).not.toBe(
      migrationChecksum(source),
    );
    expect(migrationChecksum("SELECT  1;\n")).not.toBe(
      migrationChecksum(source),
    );
    expect(migrationChecksum("-- comment\nSELECT 1;\n")).not.toBe(
      migrationChecksum(source),
    );
    expect(migrationChecksum(`\uFEFF${source}`)).not.toBe(
      migrationChecksum(source),
    );
  });

  it("preserves every applied migration checksum after LF canonicalization", () => {
    const expected = {
      "0001_initial_schema.sql":
        "c5c259d18477c43cc28561119decccd40edf488674ef22ec0a3af5585f4c72c5",
      "0002_core_auth.sql":
        "217ad72ad8b4552f9751958d6904f4bdd708d851e17d612a07dbac3bbc429216",
      "0003_goods_receipt_extensions.sql":
        "2b0b9c32a6537e0ee475e04a94339d3f26f35bedfa0e51e2fcd016cac1104e00",
      "0004_supplier_management_po_snapshots.sql":
        "2e083ee1de1c58c1c1cf2a635dc9b3566f965d5103e3b1d3bb314c07665f5d97",
      "0005_recipe_food_cost_phase1.sql":
        "f50f40d1f75b3ef3e545ba19d40f052d364bef5ed98cd13e61890f8e5f450d6b",
      "0006_menu_product_master_phase1.sql":
        "2adf9e319f74f9570fe57285375ea07c235cb99795926f9656c089670b99f972",
    } as const;
    for (const [filename, checksum] of Object.entries(expected)) {
      const source = readFileSync(
        resolve(process.cwd(), "drizzle", filename),
        "utf8",
      );
      expect(migrationChecksum(source)).toBe(checksum);
    }
  });

  it("stores the new POS migration as canonical LF source", () => {
    const source = readFileSync(
      resolve(process.cwd(), "drizzle/0007_pos_phase1.sql"),
      "utf8",
    );
    expect(source).not.toContain("\r\n");
    expect(migrationChecksum(source)).toMatch(/^[0-9a-f]{64}$/);
  });

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

  it("strips one explicit transaction so the runner can atomically record it", () => {
    expect(stripOuterTransaction("BEGIN; SELECT 1; COMMIT;")).toBe("SELECT 1;");
    expect(
      stripOuterTransaction("-- migration comment\nBEGIN; SELECT 1; COMMIT;"),
    ).toBe("-- migration comment\n SELECT 1;");
    expect(stripOuterTransaction("SELECT 1;")).toBe("SELECT 1;");
  });
});
