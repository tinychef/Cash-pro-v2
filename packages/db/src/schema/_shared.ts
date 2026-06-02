// ============================================================
// Shared column groups for multi-tenant, offline-syncable tables.
// Spread these into every business table so sync/audit semantics
// stay consistent across the schema.
// ============================================================
import { sql } from "drizzle-orm";
import { pgEnum, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const syncStatusEnum = pgEnum("sync_status", ["synced", "pending", "conflict"]);

/** Primary key shared by all tables. */
export const idColumn = {
  id: uuid("id").primaryKey().defaultRandom(),
};

/**
 * Sync columns required on every offline-capable table:
 * localId reconciles records created offline, syncStatus tracks the
 * sync state, lastModifiedAt drives last-write-wins, deletedAt is a
 * soft delete tombstone that must propagate to clients.
 */
export const syncColumns = {
  localId: uuid("local_id"),
  syncStatus: syncStatusEnum("sync_status").notNull().default("synced"),
  lastModifiedAt: timestamp("last_modified_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
};

/** Audit columns. */
export const auditColumns = {
  createdBy: text("created_by"),
  updatedBy: text("updated_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
};

/** Convenience: tenant + sync + audit, the standard envelope. */
export const tenantId = () => uuid("company_id").notNull();

export { sql };
