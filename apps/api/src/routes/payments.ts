// ============================================================
// Payments: recompute the parent invoice status on each payment,
// mirroring the original store logic, via @cash-pro/core.
// ============================================================
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { and, eq, isNull } from "drizzle-orm";
import { deriveInvoiceStatus, paymentInputSchema } from "@cash-pro/core";
import { invoices, payments, transactionsLog } from "@cash-pro/db";
import type { AppEnv } from "../context.js";
import { serialize, serializeList } from "../lib/serialize.js";

export const paymentsRouter = new Hono<AppEnv>();

paymentsRouter.get("/", async (c) => {
  const db = c.get("db");
  const companyId = c.get("companyId");
  const invoiceId = c.req.query("invoiceId");
  const where = invoiceId
    ? and(eq(payments.companyId, companyId), eq(payments.invoiceId, invoiceId), isNull(payments.deletedAt))
    : and(eq(payments.companyId, companyId), isNull(payments.deletedAt));
  const rows = await db.select().from(payments).where(where);
  return c.json(serializeList("payments", rows));
});

paymentsRouter.post("/", zValidator("json", paymentInputSchema), async (c) => {
  const db = c.get("db");
  const companyId = c.get("companyId");
  const userId = c.get("userId");
  const input = c.req.valid("json");

  const created = await db.transaction(async (tx) => {
    const [invoice] = await tx
      .select()
      .from(invoices)
      .where(and(eq(invoices.id, input.invoiceId), eq(invoices.companyId, companyId)))
      .limit(1);
    if (!invoice) throw new Error("Invoice not found");

    const [payment] = await tx
      .insert(payments)
      .values({
        companyId,
        invoiceId: input.invoiceId,
        amount: String(input.amount),
        method: input.method,
        date: input.date ? new Date(input.date) : new Date(),
        notes: input.notes,
        createdBy: userId,
      })
      .returning();

    // Recompute status from all payments on the invoice.
    const existing = await tx
      .select({ amount: payments.amount })
      .from(payments)
      .where(and(eq(payments.invoiceId, input.invoiceId), isNull(payments.deletedAt)));
    const paid = existing.reduce((s, p) => s + Number(p.amount), 0);
    const dueDate = invoice.dueDate
      ? new Date(invoice.dueDate).toISOString().slice(0, 10)
      : "";
    const status = deriveInvoiceStatus(Number(invoice.total), paid, dueDate);

    await tx
      .update(invoices)
      .set({ status, lastModifiedAt: new Date(), updatedBy: userId })
      .where(eq(invoices.id, input.invoiceId));

    await tx.insert(transactionsLog).values({
      companyId,
      type: "payment_received",
      refTable: "payments",
      refId: payment!.id,
      amount: String(input.amount),
      description: `Pago factura ${invoice.number}`,
      createdBy: userId,
    });

    return payment!;
  });

  return c.json(serialize("payments", created), 201);
});
