// ============================================================
// Cash Pro v2 — Pure business calculations (framework-agnostic)
// Lifted from the original Zustand store + format helpers so they
// can be unit tested and reused across web / mobile / api.
// ============================================================
import type { Expense, Invoice, InvoiceStatus, Payment, ProfitAndLoss } from "../types/index";

/** Minimal line shape needed to compute totals (id/names not required). */
export type PricedLine = {
  quantity: number;
  unitPrice: number;
  costPrice: number;
  taxRate: number;
  /** Per-line discount as a ratio 0..1 (0.10 = 10% off). Optional, default 0. */
  discountRate?: number;
};

/** Round to 2 decimals deterministically (avoids float cent drift). */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Profit margin as a ratio (0..1). Guards against divide-by-zero. */
export function marginRatio(salePrice: number, purchasePrice: number): number {
  if (salePrice <= 0) return 0;
  return (salePrice - purchasePrice) / salePrice;
}

/** Profit margin as a percentage (0..100), matching the DB generated column. */
export function marginPercent(salePrice: number, purchasePrice: number): number {
  return marginRatio(salePrice, purchasePrice) * 100;
}

/** Profit earned per single unit. */
export function profitPerUnit(salePrice: number, purchasePrice: number): number {
  return salePrice - purchasePrice;
}

/** Profit for a line: (sale - cost) * qty. */
export function lineProfit(quantity: number, salePrice: number, purchasePrice: number): number {
  return profitPerUnit(salePrice, purchasePrice) * quantity;
}

export interface InvoiceTotals {
  subtotal: number;
  /** Sum of per-line discounts (informative; subtotal is already net of it). */
  discountTotal: number;
  taxTotal: number;
  total: number;
  costTotal: number;
  grossProfit: number;
  /** ratio 0..1 of grossProfit / subtotal */
  profitMargin: number;
}

/**
 * Compute all monetary totals for an invoice from its line items.
 * This is the single source of truth used at write time so that
 * stored aggregate columns stay consistent.
 */
export function invoiceTotals(items: PricedLine[]): InvoiceTotals {
  let subtotal = 0;
  let discountTotal = 0;
  let taxTotal = 0;
  let costTotal = 0;

  for (const item of items) {
    const gross = item.unitPrice * item.quantity;
    const discount = gross * (item.discountRate ?? 0);
    const lineSubtotal = gross - discount;
    subtotal += lineSubtotal;
    discountTotal += discount;
    // Tax applies to the discounted amount.
    taxTotal += lineSubtotal * item.taxRate;
    costTotal += item.costPrice * item.quantity;
  }

  subtotal = round2(subtotal);
  discountTotal = round2(discountTotal);
  taxTotal = round2(taxTotal);
  costTotal = round2(costTotal);
  const total = round2(subtotal + taxTotal);
  const grossProfit = round2(subtotal - costTotal);
  const profitMargin = subtotal > 0 ? grossProfit / subtotal : 0;

  return { subtotal, discountTotal, taxTotal, total, costTotal, grossProfit, profitMargin };
}

/** Sum of payments applied to a given invoice. */
export function totalPaid(invoiceId: string, payments: Payment[]): number {
  return payments
    .filter((p) => p.invoiceId === invoiceId)
    .reduce((sum, p) => sum + p.amount, 0);
}

/** Outstanding balance for a single invoice. */
export function invoiceBalance(invoice: Invoice, payments: Payment[]): number {
  return invoice.total - totalPaid(invoice.id, payments);
}

/**
 * Derive an invoice status from amount paid and due date.
 * Mirrors the logic previously embedded in the store's addPayment.
 */
export function deriveInvoiceStatus(
  total: number,
  paid: number,
  dueDate: string,
  today: string = new Date().toISOString().slice(0, 10),
): InvoiceStatus {
  if (paid >= total && total > 0) return "paid";
  if (paid > 0) return "partial";
  if (dueDate && dueDate < today) return "overdue";
  return "pending";
}

/** Total accounts receivable across all not-fully-paid invoices. */
export function totalReceivables(invoices: Invoice[], payments: Payment[]): number {
  return invoices
    .filter((i) => i.status !== "paid")
    .reduce((sum, inv) => sum + (inv.total - totalPaid(inv.id, payments)), 0);
}

/**
 * Profit & Loss for a set of invoices and expenses.
 * Revenue is taken from invoice subtotals (pre-tax), COGS from costTotal.
 */
export function profitAndLoss(invoices: Invoice[], expenses: Expense[]): ProfitAndLoss {
  const revenue = round2(invoices.reduce((s, i) => s + i.subtotal, 0));
  const cogs = round2(invoices.reduce((s, i) => s + i.costTotal, 0));
  const expensesTotal = round2(expenses.reduce((s, e) => s + e.amount, 0));
  const grossProfit = round2(revenue - cogs);
  const netProfit = round2(grossProfit - expensesTotal);

  return {
    revenue,
    cogs,
    grossProfit,
    expenses: expensesTotal,
    netProfit,
    grossMargin: revenue > 0 ? grossProfit / revenue : 0,
    netMargin: revenue > 0 ? netProfit / revenue : 0,
  };
}

/** Net cash flow = payments received - expenses paid, over the given records. */
export function netCashFlow(payments: Payment[], expenses: Expense[]): number {
  const inflow = payments.reduce((s, p) => s + p.amount, 0);
  const outflow = expenses.reduce((s, e) => s + e.amount, 0);
  return round2(inflow - outflow);
}

/** Next sequential invoice number, e.g. INV-006 given 5 existing. */
export function nextInvoiceNumber(existingCount: number, prefix = "INV"): string {
  return `${prefix}-${String(existingCount + 1).padStart(3, "0")}`;
}

/** Total cost of a purchase order from its line items. */
export function purchaseTotal(items: { quantity: number; unitCost: number }[]): number {
  return round2(items.reduce((s, it) => s + it.quantity * it.unitCost, 0));
}

/** Derive a purchase order status from total cost and amount paid to the supplier. */
export function derivePurchaseStatus(
  total: number,
  paid: number,
): "received" | "paid" | "partial" {
  if (paid >= total && total > 0) return "paid";
  if (paid > 0) return "partial";
  return "received";
}

/** Total accounts payable across purchases not fully paid. */
export function totalPayables(
  purchases: { id: string; total: number; status: string }[],
  supplierPayments: { purchaseOrderId: string; amount: number }[],
): number {
  return purchases
    .filter((p) => p.status !== "paid")
    .reduce((sum, po) => {
      const paid = supplierPayments
        .filter((sp) => sp.purchaseOrderId === po.id)
        .reduce((s, sp) => s + sp.amount, 0);
      return sum + (po.total - paid);
    }, 0);
}
