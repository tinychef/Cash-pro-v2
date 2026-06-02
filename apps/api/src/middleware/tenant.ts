// ============================================================
// Auth + tenant resolution.
//
// In production (CLERK_SECRET_KEY set) the request is authenticated via
// Clerk and the active Clerk Organization maps to a company row.
// In local dev (no Clerk secret) a company id may be supplied via the
// `x-company-id` header or DEV_COMPANY_ID, so the API is runnable with
// docker-compose without standing up Clerk.
// ============================================================
import type { MiddlewareHandler } from "hono";
import { getAuth } from "@hono/clerk-auth";
import { eq } from "drizzle-orm";
import { companies, getDb } from "@cash-pro/db";
import type { AppEnv } from "../context.js";

const clerkEnabled = Boolean(process.env.CLERK_SECRET_KEY);

export const tenant: MiddlewareHandler<AppEnv> = async (c, next) => {
  const db = getDb();
  c.set("db", db);

  if (clerkEnabled) {
    // @hono/clerk-auth populates the Clerk client/auth on the context.
    const auth = getAuth(c);
    if (!auth?.userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    if (!auth.orgId) {
      return c.json({ error: "No active organization" }, 403);
    }
    const company = await db.query.companies.findFirst({
      where: eq(companies.clerkOrgId, auth.orgId),
    });
    if (!company) {
      return c.json({ error: "Company not provisioned for this organization" }, 403);
    }
    c.set("companyId", company.id);
    c.set("userId", auth.userId);
    return next();
  }

  // Dev fallback.
  const companyId = c.req.header("x-company-id") ?? process.env.DEV_COMPANY_ID;
  if (!companyId) {
    return c.json(
      { error: "Missing tenant. Set CLERK_SECRET_KEY or provide x-company-id header." },
      401,
    );
  }
  c.set("companyId", companyId);
  c.set("userId", c.req.header("x-user-id") ?? "dev-user");
  return next();
};
