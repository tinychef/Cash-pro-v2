// ============================================================
// Auth + tenant resolution.
//
// Production (CLERK_SECRET_KEY set): the request is authenticated via
// Clerk. The active Clerk Organization (or, for solo users, the user
// itself) maps to a company row, which is auto-provisioned on first
// use along with the user record and an owner membership.
//
// Local dev (no Clerk secret): a company id may be supplied via the
// `x-company-id` header or DEV_COMPANY_ID, so the API runs without Clerk.
// ============================================================
import type { MiddlewareHandler } from "hono";
import { getAuth } from "@hono/clerk-auth";
import { eq } from "drizzle-orm";
import { companies, companyUsers, getDb, users } from "@cash-pro/db";
import type { AppEnv } from "../context.js";

const clerkEnabled = Boolean(process.env.CLERK_SECRET_KEY);

/**
 * Ensure a user row, a company (one per Clerk org, or a personal company
 * for solo users) and an owner membership exist. Returns the company id.
 */
async function provisionTenant(
  db: ReturnType<typeof getDb>,
  args: { clerkUserId: string; email: string; orgId?: string | null; orgName?: string | null },
): Promise<string> {
  // Upsert user.
  let [user] = await db.select().from(users).where(eq(users.clerkUserId, args.clerkUserId)).limit(1);
  if (!user) {
    [user] = await db
      .insert(users)
      .values({ clerkUserId: args.clerkUserId, email: args.email })
      .onConflictDoNothing()
      .returning();
    if (!user) {
      [user] = await db.select().from(users).where(eq(users.clerkUserId, args.clerkUserId)).limit(1);
    }
  }

  const tenantKey = args.orgId ?? `user:${args.clerkUserId}`;
  let [company] = await db.select().from(companies).where(eq(companies.clerkOrgId, tenantKey)).limit(1);
  if (!company) {
    [company] = await db
      .insert(companies)
      .values({ clerkOrgId: tenantKey, name: args.orgName || "Mi empresa" })
      .onConflictDoNothing()
      .returning();
    if (!company) {
      [company] = await db.select().from(companies).where(eq(companies.clerkOrgId, tenantKey)).limit(1);
    }
    // Owner membership for the provisioning user.
    if (company && user) {
      await db
        .insert(companyUsers)
        .values({ companyId: company.id, userId: user.id, role: "owner" })
        .onConflictDoNothing();
    }
  }
  return company!.id;
}

export const tenant: MiddlewareHandler<AppEnv> = async (c, next) => {
  const db = getDb();
  c.set("db", db);

  if (clerkEnabled) {
    const auth = getAuth(c);
    if (!auth?.userId) return c.json({ error: "Unauthorized" }, 401);

    const claims = (auth.sessionClaims ?? {}) as Record<string, unknown>;
    const email = typeof claims.email === "string" ? claims.email : "";
    const companyId = await provisionTenant(db, {
      clerkUserId: auth.userId,
      email,
      orgId: auth.orgId,
      orgName: (auth as { orgSlug?: string | null }).orgSlug ?? null,
    });

    // Derive role: personal account → owner; org member → from Clerk org role.
    const orgRole = (auth as { orgRole?: string | null }).orgRole ?? "";
    let role: "owner" | "admin" | "member" | "viewer";
    if (!auth.orgId) role = "owner";
    else if (orgRole.includes("admin")) role = "admin";
    else if (orgRole.includes("viewer") || orgRole.includes("guest")) role = "viewer";
    else role = "member";

    c.set("companyId", companyId);
    c.set("userId", auth.userId);
    c.set("role", role);
    return next();
  }

  // Dev fallback (no Clerk configured).
  const companyId = c.req.header("x-company-id") ?? process.env.DEV_COMPANY_ID;
  if (!companyId) {
    return c.json(
      { error: "Missing tenant. Set CLERK_SECRET_KEY or provide x-company-id header." },
      401,
    );
  }
  c.set("companyId", companyId);
  c.set("userId", c.req.header("x-user-id") ?? "dev-user");
  c.set("role", "owner");
  return next();
};
