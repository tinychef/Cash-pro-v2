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
import { companies, inventoryMovements, invoiceItems, invoices, products, transactionsLog } from "@cash-pro/db";
import type { AppEnv } from "../context.js";
import { serialize, serializeList } from "../lib/serialize.js";
import { withUniqueRetry } from "../lib/retry.js";

export const invoicesRouter = new Hono<AppEnv>();

invoicesRouter.get("/", async (c) => {
  const db = c.get("db");
  const companyId = c.get("companyId");
  const rows = await db
    .select()
    .from(invoices)
    .where(and(eq(invoices.companyId, companyId), isNull(invoices.deletedAt)))
    .orderBy(desc(invoices.createdAt));
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
