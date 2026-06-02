import { defineConfig } from "drizzle-kit";

// Pure-SQL migrations targeting any standard PostgreSQL (Supabase now,
// Cloud SQL / RDS / Neon / self-hosted later). No proprietary features.
export default defineConfig({
  schema: "./src/schema/index.ts",
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/cashpro",
  },
  verbose: true,
  strict: true,
});
