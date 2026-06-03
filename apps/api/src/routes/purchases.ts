// ============================================================
// Purchases (accounts payable). Creating a purchase order receives the
// goods: it increments stock, records inventory movements ("in") and a
// unified transactions_log entry, atomically. Supplier payments recompute
// the order's paid/partial/received status.
// ============================================================
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { and, count, desc, eq, isNull, sql } from "drizzle-orm";
import {
  derivePurchaseStatus,
  nextInvoiceNumber,
  purchaseInputSchema,
  purchaseTotal,
  supplierPaymentInputSchema,
} from "@cash-pro/core";
import {
  inventoryMovements,
  products,
  purchaseOrderItems,
  purchaseOrders,
  supplierPayments,
  transactionsLog,
} from "@cash-pro/db";
import type { AppEnv } from "../context.js";
import { serialize, serializeList } from "../lib/serialize.js";
import { withUniqueRetry } from "../lib/retry.js";

export const purchasesRouter = new Hono<AppEnv>();

purchasesRouter.get("/", async (c) => {
  const db = c.get("db");
  const companyId = c.get("companyId");
  const rows = await db
    .select()
    .from(purchaseOrders)
    .where(and(eq(purchaseOrders.companyId, companyId), isNull(purchaseOrders.deletedAt)))
    .orderBy(desc(purchaseOrders.createdAt));
  return c.json(serializeList("purchase_orders", rows));
});

purchasesRouter.get("/:id", async (c) => {
  const db = c.get("db");
  const companyId = c.get("companyId");
  const id = c.req.param("id");
  const [po] = await db
    .select()
    .from(purchaseOrders)
    .where(and(eq(purchaseOrders.id, id), eq(purchaseOrders.companyId, companyId)))
    .limit(1);
  if (!po) return c.json({ error: "Not found" }, 404);
  const items = await db.select().from(purchaseOrderItems).where(eq(purchaseOrderItems.purchaseOrderId, id));
  return c.json({ ...serialize("purchase_orders", po), items: serializeList("purchase_order_items", items) });
});

purchasesRouter.post("/", zValidator("json", purchaseInputSchema), async (c) => {
  const db = c.get("db");
  const companyId = c.get("companyId");
  const userId = c.get("userId");
  const input = c.req.valid("json");
  const total = purchaseTotal(input.items);

  const created = await withUniqueRetry(() =>
    db.transaction(async (tx) => {
    const countRows = await tx
      .select({ value: count() })
      .from(purchaseOrders)
      .where(eq(purchaseOrders.companyId, companyId));
    const existing = countRows[0]?.value ?? 0;

    const [po] = await tx
      .insert(purchaseOrders)
      .values({
        companyId,
        number: nextInvoiceNumber(existing, "OC"),
        supplierId: input.supplierId || null,
        supplierName: input.supplierName,
        total: String(total),
        status: "received",
        notes: input.notes,
        createdBy: userId,
      })
      .returning();
    const poId = po!.id;

    await tx.insert(purchaseOrderItems).values(
      input.items.map((it) => ({
        companyId,
        purchaseOrderId: poId,
        productId: it.productId || null,
        productName: it.productName,
        quantity: String(it.quantity),
        unitCost: String(it.unitCost),
        createdBy: userId,
      })),
    );

    // Receive goods: increment stock + inventory movement per line.
    for (const it of input.items) {
      if (!it.productId) continue;
      await tx
        .update(products)
        .set({ stock: sql`${products.stock} + ${Math.round(it.quantity)}`, lastModifiedAt: new Date() })
        .where(and(eq(products.id, it.productId), eq(products.companyId, companyId)));
      await tx.insert(inventoryMovements).values({
        companyId,
        productId: it.productId,
        type: "in",
        quantity: Math.round(it.quantity),
        reason: `Compra ${po!.number}`,
        createdBy: userId,
      });
    }

    await tx.insert(transactionsLog).values({
      companyId,
      type: "purchase",
      refTable: "purchase_orders",
      refId: poId,
      amount: String(total),
      description: `Compra ${po!.number}`,
      createdBy: userId,
    });

    return po!;
    }),
  );

  return c.json(serialize("purchase_orders", created), 201);
});

// ---- Supplier payments (against a purchase order) ----
export const supplierPaymentsRouter = new Hono<AppEnv>();

supplierPaymentsRouter.get("/", async (c) => {
  const db = c.get("db");
  const companyId = c.get("companyId");
  const rows = await db
    .select()
    .from(supplierPayments)
    .where(and(eq(supplierPayments.companyId, companyId), isNull(supplierPayments.deletedAt)));
  return c.json(serializeList("supplier_payments", rows));
});

supplierPaymentsRouter.post("/", zValidator("json", supplierPaymentInputSchema), async (c) => {
  const db = c.get("db");
  const companyId = c.get("companyId");
  const userId = c.get("userId");
  const input = c.req.valid("json");

  const created = await db.transaction(async (tx) => {
    const [po] = await tx
      .select()
      .from(purchaseOrders)
      .where(and(eq(purchaseOrders.id, input.purchaseOrderId), eq(purchaseOrders.companyId, companyId)))
      .limit(1);
    if (!po) throw new Error("Purchase order not found");

    const [payment] = await tx
      .insert(supplierPayments)
      .values({
        companyId,
        purchaseOrderId: input.purchaseOrderId,
        amount: String(input.amount),
        method: input.method,
        date: input.date ? new Date(input.date) : new Date(),
        notes: input.notes,
        createdBy: userId,
      })
      .returning();

    const existing = await tx
      .select({ amount: supplierPayments.amount })
      .from(supplierPayments)
      .where(and(eq(supplierPayments.purchaseOrderId, input.purchaseOrderId), isNull(supplierPayments.deletedAt)));
    const paid = existing.reduce((s, p) => s + Number(p.amount), 0);
    const status = derivePurchaseStatus(Number(po.total), paid);

    await tx
      .update(purchaseOrders)
      .set({ status, lastModifiedAt: new Date(), updatedBy: userId })
      .where(eq(purchaseOrders.id, input.purchaseOrderId));

    await tx.insert(transactionsLog).values({
      companyId,
      type: "supplier_payment",
      refTable: "supplier_payments",
      refId: payment!.id,
      amount: String(input.amount),
      description: `Pago compra ${po.number}`,
      createdBy: userId,
    });

    return payment!;
  });

  return c.json(serialize("supplier_payments", created), 201);
});
