// ============================================================
// Tenancy: companies, users (mirrored from Clerk), memberships.
// ============================================================
import { index, jsonb, pgEnum, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { pgTable } from "drizzle-orm/pg-core";
import { auditColumns, idColumn } from "./_shared";

export const roleEnum = pgEnum("company_role", ["owner", "admin", "member", "viewer"]);

export const companies = pgTable("companies", {
  ...idColumn,
  /** Clerk Organization id, kept as the portable external reference. */
  clerkOrgId: text("clerk_org_id").unique(),
  name: text("name").notNull(),
  currency: text("currency").notNull().default("USD"),
  locale: text("locale").notNull().default("es"),
  settings: jsonb("settings").notNull().default({}),
  ...auditColumns,
});

export const users = pgTable("users", {
  ...idColumn,
  /** Clerk user id. */
  clerkUserId: text("clerk_user_id").unique().notNull(),
  email: text("email").notNull(),
  name: text("name"),
  ...auditColumns,
});

export const companyUsers = pgTable(
  "company_users",
  {
    ...idColumn,
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: roleEnum("role").notNull().default("member"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    byCompany: index("company_users_company_idx").on(t.companyId),
    byUser: index("company_users_user_idx").on(t.userId),
  }),
);
