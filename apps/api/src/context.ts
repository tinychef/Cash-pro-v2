// Hono context variable map shared across the API.
import type { Database } from "@cash-pro/db";

export type CompanyRole = "owner" | "admin" | "member" | "viewer";

export interface AppVariables {
  db: Database;
  /** Resolved tenant (company) id for the request. */
  companyId: string;
  /** Authenticated user id (Clerk user id or dev marker). */
  userId: string;
  /** Caller's role within the company (drives write authorization). */
  role: CompanyRole;
}

export type AppEnv = { Variables: AppVariables };
