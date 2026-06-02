// ============================================================
// Company settings: name, display currency, locale, default tax.
// Stored on the company row (+ free-form jsonb for extensibility).
// ============================================================
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { companies } from "@cash-pro/db";
import type { AppEnv } from "../context.js";

export const settingsRouter = new Hono<AppEnv>();

const settingsSchema = z.object({
  name: z.string().min(1).optional(),
  currency: z.string().min(3).max(3).optional(),
  locale: z.string().min(2).max(10).optional(),
  defaultTaxRate: z.number().min(0).max(1).optional(),
});

settingsRouter.get("/", async (c) => {
  const db = c.get("db");
  const companyId = c.get("companyId");
  const [company] = await db.select().from(companies).where(eq(companies.id, companyId)).limit(1);
  if (!company) return c.json({ error: "Not found" }, 404);
  const data = (company.settings ?? {}) as Record<string, unknown>;
  return c.json({
    name: company.name,
    currency: company.currency,
    locale: company.locale,
    defaultTaxRate: typeof data.defaultTaxRate === "number" ? data.defaultTaxRate : 0.16,
  });
});

settingsRouter.put("/", zValidator("json", settingsSchema), async (c) => {
  const db = c.get("db");
  const companyId = c.get("companyId");
  const input = c.req.valid("json");

  const [current] = await db.select().from(companies).where(eq(companies.id, companyId)).limit(1);
  if (!current) return c.json({ error: "Not found" }, 404);
  const data = { ...((current.settings ?? {}) as Record<string, unknown>) };
  if (input.defaultTaxRate !== undefined) data.defaultTaxRate = input.defaultTaxRate;

  const [updated] = await db
    .update(companies)
    .set({
      name: input.name ?? current.name,
      currency: input.currency ?? current.currency,
      locale: input.locale ?? current.locale,
      settings: data,
    })
    .where(eq(companies.id, companyId))
    .returning();

  const d = (updated!.settings ?? {}) as Record<string, unknown>;
  return c.json({
    name: updated!.name,
    currency: updated!.currency,
    locale: updated!.locale,
    defaultTaxRate: typeof d.defaultTaxRate === "number" ? d.defaultTaxRate : 0.16,
  });
});
