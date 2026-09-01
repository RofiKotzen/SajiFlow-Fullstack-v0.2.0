import { createHash } from "node:crypto";

export const MIGRATION_BATCH_MARKER = "-- migrate:next-batch";

export function canonicalMigrationSource(source: string): string {
  return source.replace(/\r\n/g, "\n");
}

export function migrationChecksum(source: string): string {
  return createHash("sha256")
    .update(canonicalMigrationSource(source), "utf8")
    .digest("hex");
}

/**
 * PostgreSQL enum additions must be committed before the new value is used.
 * A migration may opt into separate server round-trips with an explicit marker.
 * Each returned batch is still sent verbatim, so BEGIN/COMMIT inside a batch
 * retain their normal transactional semantics.
 */
export function splitMigrationBatches(source: string): string[] {
  return source
    .split(MIGRATION_BATCH_MARKER)
    .map((batch) => batch.trim())
    .filter((batch) => batch.length > 0);
}

export function stripOuterTransaction(source: string): string {
  const trimmed = source.trim();
  const match = trimmed.match(
    /^((?:\s*--[^\r\n]*(?:\r?\n|$))*)\s*BEGIN\s*;([\s\S]*)COMMIT\s*;$/i,
  );
  return match ? `${match[1]}${match[2]}`.trim() : trimmed;
}
