export const MIGRATION_BATCH_MARKER = "-- migrate:next-batch";

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
