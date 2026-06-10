// ============================================================
// Company settings: name, display currency, locale, default tax,
// plus invoice branding (tax id, contact, accent color, footer,
// inline logo). Stored on the company row (+ jsonb for extensibility).
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
  // ---- Invoice branding ----
  taxId: z.string().max(40).optional(),
  address: z.string().max(200).optional(),
  phone: z.string().max(40).optional(),
  email: z.string().email().or(z.literal("")).optional(),
  accentColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Color hex inválido")
    .optional(),
  footerNote: z.string().max(300).optional(),
  // Small inline logo as a data URL (PNG/JPEG/SVG). Swaps to R2 later.
  // ~256KB cap keeps rows light and stays well under the 1MB body limit.
  logoDataUrl: z
    .string()
    .regex(/^data:image\/(png|jpe?g|svg\+xml);base64,/, "Logo debe ser una imagen base64")
    .max(256 * 1024)
    .or(z.literal(""))
    .optional(),
});

// Branding keys persisted inside the jsonb settings column.
const JSON_KEYS = [
  "defaultTaxRate",
  "taxId",
  "address",
  "phone",
  "email",
  "accentColor",
  "footerNote",
  "logoDataUrl",
] as const;

function toResponse(company: { name: string; currency: string; locale: string; settings: unknown }) {
  const data = (company.settings ?? {}) as Record<string, unknown>;
  return {
    name: company.name,
    currency: company.currency,
    locale: company.locale,
    defaultTaxRate: typeof data.defaultTaxRate === "number" ? data.defaultTaxRate : 0.16,
    taxId: typeof data.taxId === "string" ? data.taxId : "",
    address: typeof data.address === "string" ? data.address : "",
    phone: typeof data.phone === "string" ? data.phone : "",
    email: typeof data.email === "string" ? data.email : "",
    accentColor: typeof data.accentColor === "string" ? data.accentColor : "#16a34a",
    footerNote: typeof data.footerNote === "string" ? data.footerNote : "",
    logoDataUrl: typeof data.logoDataUrl === "string" ? data.logoDataUrl : "",
  };
}

settingsRouter.get("/", async (c) => {
  const db = c.get("db");
  const companyId = c.get("companyId");
  const [company] = await db.select().from(companies).where(eq(companies.id, companyId)).limit(1);
  if (!company) return c.json({ error: "Not found" }, 404);
  return c.json(toResponse(company));
});

settingsRouter.put("/", zValidator("json", settingsSchema), async (c) => {
  const db = c.get("db");
  const companyId = c.get("companyId");
  const input = c.req.valid("json");

  const [current] = await db.select().from(companies).where(eq(companies.id, companyId)).limit(1);
  if (!current) return c.json({ error: "Not found" }, 404);
  const data = { ...((current.settings ?? {}) as Record<string, unknown>) };
  for (const key of JSON_KEYS) {
    if (input[key] !== undefined) data[key] = input[key];
  }

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

  return c.json(toResponse(updated!));
});
