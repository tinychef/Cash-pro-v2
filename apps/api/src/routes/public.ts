// ============================================================
// Public (no-auth) endpoints, gated by signed share tokens.
// Mounted OUTSIDE the /api tenant pipeline. Responses are
// sanitized: cost/profit internals are never exposed.
// ============================================================
import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { companies, getDb, invoiceItems, invoices } from "@cash-pro/db";
import { verifyInvoiceToken } from "../lib/share.js";

export const publicRouter = new Hono();

publicRouter.get("/invoices/:token", async (c) => {
  const id = verifyInvoiceToken(c.req.param("token"));
  if (!id) return c.json({ error: "Not found" }, 404);

  const db = getDb();
  const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id)).limit(1);
  if (!invoice || invoice.deletedAt) return c.json({ error: "Not found" }, 404);

  const [company] = await db
    .select()
    .from(companies)
    .where(eq(companies.id, invoice.companyId))
    .limit(1);
  const items = await db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, id));
  const brandData = (company?.settings ?? {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" ? v : "");

  // Customer-facing fields only — no cost, profit or tenant internals.
  return c.json({
    number: invoice.number,
    customerName: invoice.customerName,
    createdAt: invoice.createdAt,
    dueDate: invoice.dueDate,
    status: invoice.status,
    subtotal: Number(invoice.subtotal),
    discountTotal: Number(invoice.discountTotal),
    taxTotal: Number(invoice.taxTotal),
    total: Number(invoice.total),
    notes: invoice.notes,
    items: items.map((it) => ({
      id: it.id,
      productName: it.productName,
      quantity: Number(it.quantity),
      unitPrice: Number(it.unitPrice),
      taxRate: Number(it.taxRate),
      discountRate: Number(it.discountRate),
    })),
    brand: {
      name: company?.name ?? "",
      currency: company?.currency ?? "USD",
      locale: company?.locale ?? "es-VE",
      taxId: str(brandData.taxId),
      address: str(brandData.address),
      phone: str(brandData.phone),
      email: str(brandData.email),
      accentColor: str(brandData.accentColor) || "#16a34a",
      footerNote: str(brandData.footerNote),
      logoDataUrl: str(brandData.logoDataUrl),
    },
  });
});
