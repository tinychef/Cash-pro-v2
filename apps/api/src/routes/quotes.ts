// ============================================================
// Quotes / estimates. Non-binding documents that carry NO stock or
// payment effects until converted. `POST /:id/convert` turns a quote
// into a real invoice atomically (assigns an invoice number, decrements
// stock, records inventory movements + a transactions_log entry) and
// marks the quote as converted.
// ============================================================
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { zValidator } from "@hono/zod-validator";
import { and, count, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import {
  deriveInvoiceStatus,
  invoiceTotals,
  nextInvoiceNumber,
  quoteInputSchema,
  quoteStatusInputSchema,
} from "@cash-pro/core";
import {
  companies,
  inventoryMovements,
  invoiceItems,
  invoices,
  products,
  quoteItems,
  quotes,
  transactionsLog,
} from "@cash-pro/db";
import type { AppEnv } from "../context.js";
import { serialize, serializeList } from "../lib/serialize.js";
import { withUniqueRetry } from "../lib/retry.js";
import { parsePaging } from "../lib/paging.js";

export const quotesRouter = new Hono<AppEnv>();

quotesRouter.get("/", async (c) => {
  const db = c.get("db");
  const companyId = c.get("companyId");
  const { limit, offset } = parsePaging(c);
  const rows = await db
    .select()
    .from(quotes)
    .where(and(eq(quotes.companyId, companyId), isNull(quotes.deletedAt)))
    .orderBy(desc(quotes.createdAt))
    .limit(limit)
    .offset(offset);
  return c.json(serializeList("quotes", rows));
});

quotesRouter.get("/:id", async (c) => {
  const db = c.get("db");
  const companyId = c.get("companyId");
  const id = c.req.param("id");
  const [quote] = await db
    .select()
    .from(quotes)
    .where(and(eq(quotes.id, id), eq(quotes.companyId, companyId)))
    .limit(1);
  if (!quote) return c.json({ error: "Not found" }, 404);
  const items = await db.select().from(quoteItems).where(eq(quoteItems.quoteId, id));
  return c.json({ ...serialize("quotes", quote), items: serializeList("quote_items", items) });
});

quotesRouter.post("/", zValidator("json", quoteInputSchema), async (c) => {
  const db = c.get("db");
  const companyId = c.get("companyId");
  const userId = c.get("userId");
  const input = c.req.valid("json");

  const totals = invoiceTotals(input.items);

  const created = await withUniqueRetry(() =>
    db.transaction(async (tx) => {
      const countRows = await tx
        .select({ value: count() })
        .from(quotes)
        .where(eq(quotes.companyId, companyId));
      const existing = countRows[0]?.value ?? 0;

      const [quote] = await tx
        .insert(quotes)
        .values({
          companyId,
          number: nextInvoiceNumber(existing, "COT"),
          customerId: input.clientId || null,
          customerName: input.clientName,
          subtotal: String(totals.subtotal),
          taxTotal: String(totals.taxTotal),
          total: String(totals.total),
          costOfGoods: String(totals.costTotal),
          grossProfit: String(totals.grossProfit),
          profitMargin: String(totals.profitMargin * 100),
          status: "draft",
          validUntil: input.validUntil ? new Date(input.validUntil) : null,
          notes: input.notes,
          createdBy: userId,
        })
        .returning();

      await tx.insert(quoteItems).values(
        input.items.map((it) => ({
          companyId,
          quoteId: quote!.id,
          productId: it.productId || null,
          productName: it.productName,
          quantity: String(it.quantity),
          unitPrice: String(it.unitPrice),
          costPrice: String(it.costPrice),
          taxRate: String(it.taxRate),
          createdBy: userId,
        })),
      );

      return quote!;
    }),
  );

  return c.json(serialize("quotes", created), 201);
});

// Manual status transitions (sent / accepted / declined / expired / draft).
quotesRouter.patch("/:id/status", zValidator("json", quoteStatusInputSchema), async (c) => {
  const db = c.get("db");
  const companyId = c.get("companyId");
  const id = c.req.param("id");
  const { status } = c.req.valid("json");

  const [existing] = await db
    .select()
    .from(quotes)
    .where(and(eq(quotes.id, id), eq(quotes.companyId, companyId)))
    .limit(1);
  if (!existing) return c.json({ error: "Not found" }, 404);
  if (existing.status === "converted") {
    throw new HTTPException(409, { message: "La cotización ya fue convertida en factura" });
  }

  const [updated] = await db
    .update(quotes)
    .set({ status, lastModifiedAt: new Date() })
    .where(and(eq(quotes.id, id), eq(quotes.companyId, companyId)))
    .returning();
  return c.json(serialize("quotes", updated));
});

// Convert a quote into an invoice (the inventory/accounting effects happen here).
quotesRouter.post("/:id/convert", async (c) => {
  const db = c.get("db");
  const companyId = c.get("companyId");
  const userId = c.get("userId");
  const id = c.req.param("id");

  const [quote] = await db
    .select()
    .from(quotes)
    .where(and(eq(quotes.id, id), eq(quotes.companyId, companyId)))
    .limit(1);
  if (!quote) return c.json({ error: "Not found" }, 404);
  if (quote.status === "converted" || quote.convertedInvoiceId) {
    throw new HTTPException(409, { message: "La cotización ya fue convertida en factura" });
  }

  const items = await db.select().from(quoteItems).where(eq(quoteItems.quoteId, id));
  if (items.length === 0) {
    throw new HTTPException(409, { message: "La cotización no tiene líneas" });
  }

  // Recompute totals from the persisted lines (source of truth).
  const pricedLines = items.map((it) => ({
    quantity: Number(it.quantity),
    unitPrice: Number(it.unitPrice),
    costPrice: Number(it.costPrice),
    taxRate: Number(it.taxRate),
  }));
  const totals = invoiceTotals(pricedLines);
  const today = new Date().toISOString().slice(0, 10);
  const status = deriveInvoiceStatus(totals.total, 0, today, today);

  // Stock guard (same policy as direct invoicing).
  const [company] = await db.select().from(companies).where(eq(companies.id, companyId)).limit(1);
  const allowNegative = Boolean(
    (company?.settings as Record<string, unknown> | undefined)?.allowNegativeStock,
  );
  if (!allowNegative) {
    const ids = items.map((i) => i.productId).filter((x): x is string => Boolean(x));
    if (ids.length) {
      const stockRows = await db
        .select({ id: products.id, name: products.name, stock: products.stock })
        .from(products)
        .where(and(eq(products.companyId, companyId), inArray(products.id, ids)));
      const stockById = new Map(stockRows.map((r) => [r.id, r]));
      const needed = new Map<string, number>();
      for (const it of items) {
        if (it.productId)
          needed.set(it.productId, (needed.get(it.productId) ?? 0) + Number(it.quantity));
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

  const invoice = await withUniqueRetry(() =>
    db.transaction(async (tx) => {
      const countRows = await tx
        .select({ value: count() })
        .from(invoices)
        .where(eq(invoices.companyId, companyId));
      const existing = countRows[0]?.value ?? 0;

      const [inv] = await tx
        .insert(invoices)
        .values({
          companyId,
          number: nextInvoiceNumber(existing),
          customerId: quote.customerId,
          customerName: quote.customerName,
          subtotal: String(totals.subtotal),
          taxTotal: String(totals.taxTotal),
          total: String(totals.total),
          costOfGoods: String(totals.costTotal),
          grossProfit: String(totals.grossProfit),
          profitMargin: String(totals.profitMargin * 100),
          status,
          dueDate: null,
          notes: quote.notes,
          createdBy: userId,
        })
        .returning();

      const invoiceId = inv!.id;

      await tx.insert(invoiceItems).values(
        items.map((it) => ({
          companyId,
          invoiceId,
          productId: it.productId,
          productName: it.productName,
          quantity: String(it.quantity),
          unitPrice: String(it.unitPrice),
          costPrice: String(it.costPrice),
          taxRate: String(it.taxRate),
          createdBy: userId,
        })),
      );

      for (const it of items) {
        if (!it.productId) continue;
        const qty = Math.round(Number(it.quantity));
        await tx
          .update(products)
          .set({ stock: sql`${products.stock} - ${qty}`, lastModifiedAt: new Date() })
          .where(and(eq(products.id, it.productId), eq(products.companyId, companyId)));
        await tx.insert(inventoryMovements).values({
          companyId,
          productId: it.productId,
          type: "out",
          quantity: qty,
          reason: `Venta ${inv!.number} (de ${quote.number})`,
          createdBy: userId,
        });
      }

      await tx.insert(transactionsLog).values({
        companyId,
        type: "sale",
        refTable: "invoices",
        refId: invoiceId,
        amount: String(totals.total),
        description: `Factura ${inv!.number} (cotización ${quote.number})`,
        createdBy: userId,
      });

      await tx
        .update(quotes)
        .set({ status: "converted", convertedInvoiceId: invoiceId, lastModifiedAt: new Date() })
        .where(and(eq(quotes.id, id), eq(quotes.companyId, companyId)));

      return inv!;
    }),
  );

  return c.json(serialize("invoices", invoice), 201);
});
