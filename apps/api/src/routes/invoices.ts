// ============================================================
// Invoices: totals & profit are computed server-side via @cash-pro/core
// so the stored aggregates are always consistent.
// ============================================================
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { and, count, desc, eq, isNull } from "drizzle-orm";
import {
  deriveInvoiceStatus,
  invoiceInputSchema,
  invoiceTotals,
  nextInvoiceNumber,
} from "@cash-pro/core";
import { invoiceItems, invoices, transactionsLog } from "@cash-pro/db";
import type { AppEnv } from "../context.js";

export const invoicesRouter = new Hono<AppEnv>();

invoicesRouter.get("/", async (c) => {
  const db = c.get("db");
  const companyId = c.get("companyId");
  const rows = await db
    .select()
    .from(invoices)
    .where(and(eq(invoices.companyId, companyId), isNull(invoices.deletedAt)))
    .orderBy(desc(invoices.createdAt));
  return c.json(rows);
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
  const items = await db
    .select()
    .from(invoiceItems)
    .where(eq(invoiceItems.invoiceId, id));
  return c.json({ ...invoice, items });
});

invoicesRouter.post("/", zValidator("json", invoiceInputSchema), async (c) => {
  const db = c.get("db");
  const companyId = c.get("companyId");
  const userId = c.get("userId");
  const input = c.req.valid("json");

  const totals = invoiceTotals(input.items);
  const today = new Date().toISOString().slice(0, 10);
  const status = deriveInvoiceStatus(totals.total, 0, input.dueDate, today);

  const created = await db.transaction(async (tx) => {
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
        customerId: input.clientId,
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

    await tx.insert(invoiceItems).values(
      input.items.map((it) => ({
        companyId,
        invoiceId: invoice!.id,
        productId: it.productId,
        productName: it.productName,
        quantity: String(it.quantity),
        unitPrice: String(it.unitPrice),
        costPrice: String(it.costPrice),
        taxRate: String(it.taxRate),
        createdBy: userId,
      })),
    );

    await tx.insert(transactionsLog).values({
      companyId,
      type: "sale",
      refTable: "invoices",
      refId: invoice!.id,
      amount: String(totals.total),
      description: `Factura ${invoice!.number}`,
      createdBy: userId,
    });

    return invoice!;
  });

  return c.json(created, 201);
});
