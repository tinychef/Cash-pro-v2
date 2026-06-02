// ============================================================
// Drizzle client over node-postgres-compatible `postgres` driver.
// Standard PostgreSQL connection string — portable to any provider.
// ============================================================
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema/index";

export type Database = ReturnType<typeof createDb>;

export function createDb(connectionString: string) {
  const client = postgres(connectionString, { prepare: false });
  return drizzle(client, { schema });
}

/** Lazily-created singleton from DATABASE_URL (for app runtime use). */
let _db: Database | undefined;
export function getDb(): Database {
  if (!_db) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    _db = createDb(url);
  }
  return _db;
}
