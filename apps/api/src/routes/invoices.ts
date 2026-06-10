// ============================================================
// Invoices: totals & profit are computed server-side via @cash-pro/core
// so the stored aggregates are always consistent. Creating an invoice
// also decrements stock and records inventory movements + a unified
// transactions_log entry, atomically.
// ============================================================
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { zValidator } from "@hono/zod-validator";
import { and, count, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import {
  deriveInvoiceStatus,
  invoiceInputSchema,
  invoiceTotals,
  nextInvoiceNumber,
} from "@cash-pro/core";
import { companies, customers, inventoryMovements, invoiceItems, invoices, products, transactionsLog } from "@cash-pro/db";
import { z } from "zod";
import type { AppEnv } from "../context.js";
import { serialize, serializeList } from "../lib/serialize.js";
import { withUniqueRetry } from "../lib/retry.js";
import { parsePaging } from "../lib/paging.js";
import { signInvoiceToken } from "../lib/share.js";
import { emailEnabled, invoiceEmailHtml, sendEmail } from "../lib/email.js";

// Public web origin used to build customer-facing links in emails.
function publicWebUrl(): string {
  const explicit = process.env.PUBLIC_WEB_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  const first = process.env.WEB_ORIGIN?.split(",")[0]?.trim();
  return (first || "http://localhost:3000").replace(/\/$/, "");
}

type BrandRow = { name: string; currency: string; locale: string; settings: unknown };
function brandOf(company: BrandRow | undefined) {
  const data = (company?.settings ?? {}) as Record<string, unknown>;
  const money = new Intl.NumberFormat(company?.locale || "es-VE", {
    style: "currency",
    currency: company?.currency || "USD",
  });
  return {
    companyName: company?.name ?? "Cash Pro",
    accentColor: typeof data.accentColor === "string" ? data.accentColor : "#16a34a",
    footerNote: typeof data.footerNote === "string" ? data.footerNote : undefined,
    money: (n: number) => money.format(n),
  };
}

export const invoicesRouter = new Hono<AppEnv>();

invoicesRouter.get("/", async (c) => {
  const db = c.get("db");
  const companyId = c.get("companyId");
  const { limit, offset } = parsePaging(c);
  const rows = await db
    .select()
    .from(invoices)
    .where(and(eq(invoices.companyId, companyId), isNull(invoices.deletedAt)))
    .orderBy(desc(invoices.createdAt))
    .limit(limit)
    .offset(offset);
  return c.json(serializeList("invoices", rows));
});

invoicesRouter.get("/:id", async (c) => {
  const db = c.get("db");
  const companyId = c.get("companyId");
  const id = c.req.param("id");
  const [invoice] = await db
    .select()
    .from(invoices)
    .where(and(eq(invoices.id, id), eq(invoices.companyId, companyId)))
    .limit(1);
  if (!invoice) return c.json({ error: "Not found" }, 404);
  const items = await db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, id));
  return c.json({ ...serialize("invoices", invoice), items: serializeList("invoice_items", items) });
});

// Issue a signed public-share token (the link itself is built client-side).
invoicesRouter.get("/:id/share", async (c) => {
  const db = c.get("db");
  const companyId = c.get("companyId");
  const id = c.req.param("id");
  const [invoice] = await db
    .select({ id: invoices.id })
    .from(invoices)
    .where(and(eq(invoices.id, id), eq(invoices.companyId, companyId)))
    .limit(1);
  if (!invoice) return c.json({ error: "Not found" }, 404);
  const token = signInvoiceToken(id);
  return c.json({ token, path: `/i/${token}` });
});

// Email the invoice (public link) to the customer. Requires RESEND_API_KEY.
invoicesRouter.post(
  "/:id/send",
  zValidator("json", z.object({ to: z.string().email().optional() })),
  async (c) => {
    if (!emailEnabled()) {
      throw new HTTPException(503, {
        message: "Envío por email no configurado (falta RESEND_API_KEY)",
      });
    }
    const db = c.get("db");
    const companyId = c.get("companyId");
    const id = c.req.param("id");
    const { to } = c.req.valid("json");

    const [invoice] = await db
      .select()
      .from(invoices)
      .where(and(eq(invoices.id, id), eq(invoices.companyId, companyId)))
      .limit(1);
    if (!invoice) return c.json({ error: "Not found" }, 404);

    let recipient = to ?? "";
    if (!recipient && invoice.customerId) {
      const [customer] = await db
        .select({ email: customers.email })
        .from(customers)
        .where(and(eq(customers.id, invoice.customerId), eq(customers.companyId, companyId)))
        .limit(1);
      recipient = customer?.email ?? "";
    }
    if (!recipient) {
      throw new HTTPException(400, { message: "El cliente no tiene email; indica un destinatario" });
    }

    const [company] = await db.select().from(companies).where(eq(companies.id, companyId)).limit(1);
    const brand = brandOf(company);
    const publicUrl = `${publicWebUrl()}/i/${signInvoiceToken(id)}`;

    await sendEmail({
      to: recipient,
      subject: `Factura ${invoice.number} — ${brand.companyName}`,
      html: invoiceEmailHtml({
        companyName: brand.companyName,
        accentColor: brand.accentColor,
        invoiceNumber: invoice.number,
        total: brand.money(Number(invoice.total)),
        dueDate: invoice.dueDate?.toISOString().slice(0, 10),
        publicUrl,
        footerNote: brand.footerNote,
      }),
    });
    return c.json({ sent: true, to: recipient });
  },
);

// Send a reminder email for every overdue invoice whose customer has an email.
invoicesRouter.post("/remind-overdue", async (c) => {
  if (!emailEnabled()) {
    throw new HTTPException(503, {
      message: "Envío por email no configurado (falta RESEND_API_KEY)",
    });
  }
  const db = c.get("db");
  const companyId = c.get("companyId");

  const rows = await db
    .select({ invoice: invoices, email: customers.email })
    .from(invoices)
    .innerJoin(customers, eq(invoices.customerId, customers.id))
    .where(and(eq(invoices.companyId, companyId), eq(invoices.status, "overdue"), isNull(invoices.deletedAt)));

  const [company] = await db.select().from(companies).where(eq(companies.id, companyId)).limit(1);
  const brand = brandOf(company);

  let sent = 0;
  const errors: string[] = [];
  for (const { invoice, email } of rows) {
    if (!email) continue;
    try {
      await sendEmail({
        to: email,
        subject: `Recordatorio: factura ${invoice.number} pendiente — ${brand.companyName}`,
        html: invoiceEmailHtml({
          companyName: brand.companyName,
          accentColor: brand.accentColor,
          invoiceNumber: invoice.number,
          total: brand.money(Number(invoice.total)),
          dueDate: invoice.dueDate?.toISOString().slice(0, 10),
          publicUrl: `${publicWebUrl()}/i/${signInvoiceToken(invoice.id)}`,
          footerNote: brand.footerNote,
          reminder: true,
        }),
      });
      sent++;
    } catch (e) {
      errors.push(`${invoice.number}: ${(e as Error).message}`);
    }
  }
  return c.json({ sent, eligible: rows.filter((r) => r.email).length, errors });
});

invoicesRouter.post("/", zValidator("json", invoiceInputSchema), async (c) => {
  const db = c.get("db");
  const companyId = c.get("companyId");
  const userId = c.get("userId");
  const input = c.req.valid("json");

  const totals = invoiceTotals(input.items);
  const today = new Date().toISOString().slice(0, 10);
  const status = deriveInvoiceStatus(totals.total, 0, input.dueDate, today);

  // Stock guard: block sales that would drive inventory negative, unless
  // the company opted into backorders (settings.allowNegativeStock).
  const [company] = await db.select().from(companies).where(eq(companies.id, companyId)).limit(1);
  const allowNegative = Boolean(
    (company?.settings as Record<string, unknown> | undefined)?.allowNegativeStock,
  );
  if (!allowNegative) {
    const ids = input.items.map((i) => i.productId).filter((x): x is string => Boolean(x));
    if (ids.length) {
      const stockRows = await db
        .select({ id: products.id, name: products.name, stock: products.stock })
        .from(products)
        .where(and(eq(products.companyId, companyId), inArray(products.id, ids)));
      const stockById = new Map(stockRows.map((r) => [r.id, r]));
      const needed = new Map<string, number>();
      for (const it of input.items) {
        if (it.productId) needed.set(it.productId, (needed.get(it.productId) ?? 0) + it.quantity);
      }
      for (const [pid, qty] of needed) {
        const row = stockById.get(pid);
        if (row && row.stock < Math.round(qty)) {
          throw new HTTPException(409, {
            message: `Stock insuficiente para "${row.name}" (disponible ${row.stock}, requerido ${Math.round(qty)})`,
          });
        }
      }
    }
  }

  const created = await withUniqueRetry(() =>
    db.transaction(async (tx) => {
    const countRows = await tx
      .select({ value: count() })
      .from(invoices)
      .where(eq(invoices.companyId, companyId));
    const existing = countRows[0]?.value ?? 0;

    const [invoice] = await tx
      .insert(invoices)
      .values({
        companyId,
        number: nextInvoiceNumber(existing),
        customerId: input.clientId || null,
        customerName: input.clientName,
        subtotal: String(totals.subtotal),
        discountTotal: String(totals.discountTotal),
        taxTotal: String(totals.taxTotal),
        total: String(totals.total),
        costOfGoods: String(totals.costTotal),
        grossProfit: String(totals.grossProfit),
        profitMargin: String(totals.profitMargin * 100),
        status,
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
        notes: input.notes,
        createdBy: userId,
      })
      .returning();

    const invoiceId = invoice!.id;

    await tx.insert(invoiceItems).values(
      input.items.map((it) => ({
        companyId,
        invoiceId,
        productId: it.productId || null,
        productName: it.productName,
        quantity: String(it.quantity),
        unitPrice: String(it.unitPrice),
        costPrice: String(it.costPrice),
        taxRate: String(it.taxRate),
        discountRate: String(it.discountRate ?? 0),
        createdBy: userId,
      })),
    );

    // Decrement stock and record an inventory movement per line.
    for (const it of input.items) {
      if (!it.productId) continue;
      await tx
        .update(products)
        .set({ stock: sql`${products.stock} - ${Math.round(it.quantity)}`, lastModifiedAt: new Date() })
        .where(and(eq(products.id, it.productId), eq(products.companyId, companyId)));
      await tx.insert(inventoryMovements).values({
        companyId,
        productId: it.productId,
        type: "out",
        quantity: Math.round(it.quantity),
        reason: `Venta ${invoice!.number}`,
        createdBy: userId,
      });
    }

    await tx.insert(transactionsLog).values({
      companyId,
      type: "sale",
      refTable: "invoices",
      refId: invoiceId,
      amount: String(totals.total),
      description: `Factura ${invoice!.number}`,
      createdBy: userId,
    });

    return invoice!;
    }),
  );

  return c.json(serialize("invoices", created), 201);
});
