// ============================================================
// Reports: dashboard KPIs and P&L, computed via @cash-pro/core.
// ============================================================
import { Hono } from "hono";
import type { Context } from "hono";
import { and, eq, isNull } from "drizzle-orm";
import {
  netCashFlow,
  profitAndLoss,
  totalReceivables,
  type Expense,
  type Invoice,
  type Payment,
} from "@cash-pro/core";
import { expenses, invoices, payments } from "@cash-pro/db";
import type { AppEnv } from "../context.js";

export const reportsRouter = new Hono<AppEnv>();

async function loadFinancials(c: Context<AppEnv>) {
  const db = c.get("db");
  const companyId = c.get("companyId");
  const [inv, pay, exp] = await Promise.all([
    db.select().from(invoices).where(and(eq(invoices.companyId, companyId), isNull(invoices.deletedAt))),
    db.select().from(payments).where(and(eq(payments.companyId, companyId), isNull(payments.deletedAt))),
    db.select().from(expenses).where(and(eq(expenses.companyId, companyId), isNull(expenses.deletedAt))),
  ]);
  // Coerce numeric strings (postgres-js) into the number shapes core expects.
  const invoicesN = inv.map((i) => ({
    ...i,
    subtotal: Number(i.subtotal),
    total: Number(i.total),
    costTotal: Number(i.costOfGoods),
  })) as unknown as Invoice[];
  const paymentsN = pay.map((p) => ({ ...p, amount: Number(p.amount) })) as unknown as Payment[];
  const expensesN = exp.map((e) => ({ ...e, amount: Number(e.amount) })) as unknown as Expense[];
  return { invoicesN, paymentsN, expensesN };
}

reportsRouter.get("/pnl", async (c) => {
  const { invoicesN, expensesN } = await loadFinancials(c);
  return c.json(profitAndLoss(invoicesN, expensesN));
});

reportsRouter.get("/dashboard", async (c) => {
  const { invoicesN, paymentsN, expensesN } = await loadFinancials(c);
  const pl = profitAndLoss(invoicesN, expensesN);
  return c.json({
    grossProfit: pl.grossProfit,
    receivables: totalReceivables(invoicesN, paymentsN),
    netCashFlow: netCashFlow(paymentsN, expensesN),
    revenue: pl.revenue,
    netProfit: pl.netProfit,
  });
});
