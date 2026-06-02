import { describe, expect, it } from "vitest";
import {
  deriveInvoiceStatus,
  invoiceBalance,
  invoiceTotals,
  marginPercent,
  marginRatio,
  netCashFlow,
  nextInvoiceNumber,
  profitAndLoss,
  profitPerUnit,
  totalReceivables,
} from "./index.js";
import type { Expense, Invoice, InvoiceItem, Payment } from "../types/index.js";

// Fixtures derived from the original MVP seed data (store.ts).
const item = (over: Partial<InvoiceItem>): InvoiceItem => ({
  id: "x",
  productId: "p",
  productName: "P",
  quantity: 1,
  unitPrice: 0,
  costPrice: 0,
  taxRate: 0.16,
  ...over,
});

describe("margins", () => {
  it("computes margin ratio and percent, guarding divide-by-zero", () => {
    expect(marginRatio(15, 5)).toBeCloseTo(0.6667, 4);
    expect(marginPercent(15, 5)).toBeCloseTo(66.6667, 3);
    expect(marginRatio(0, 5)).toBe(0);
  });

  it("computes profit per unit", () => {
    expect(profitPerUnit(15, 5)).toBe(10);
  });
});

describe("invoiceTotals", () => {
  it("matches seed invoice INV-001 (3x Camiseta @15/5 + 2x Gorra @12/3)", () => {
    const totals = invoiceTotals([
      item({ quantity: 3, unitPrice: 15, costPrice: 5 }),
      item({ quantity: 2, unitPrice: 12, costPrice: 3 }),
    ]);
    expect(totals.subtotal).toBe(69);
    expect(totals.taxTotal).toBeCloseTo(11.04, 2);
    expect(totals.total).toBeCloseTo(80.04, 2);
    expect(totals.costTotal).toBe(21);
    expect(totals.grossProfit).toBe(48);
    expect(totals.profitMargin).toBeCloseTo(0.6957, 4);
  });
});

describe("invoice status & balances", () => {
  const inv: Invoice = {
    id: "inv3",
    number: "INV-003",
    clientId: "c3",
    clientName: "Ana",
    items: [],
    subtotal: 630,
    taxTotal: 100.8,
    total: 730.8,
    costTotal: 205,
    status: "partial",
    createdAt: "2026-05-01",
    dueDate: "2026-06-10",
    notes: "",
  };
  const payments: Payment[] = [
    { id: "pay2", invoiceId: "inv3", amount: 300, method: "transfer", date: "2026-05-02", notes: "" },
  ];

  it("computes outstanding balance", () => {
    expect(invoiceBalance(inv, payments)).toBeCloseTo(430.8, 2);
  });

  it("derives status from amount paid and due date", () => {
    expect(deriveInvoiceStatus(730.8, 730.8, "2026-06-10")).toBe("paid");
    expect(deriveInvoiceStatus(730.8, 300, "2026-06-10")).toBe("partial");
    expect(deriveInvoiceStatus(100, 0, "2026-01-01", "2026-06-02")).toBe("overdue");
    expect(deriveInvoiceStatus(100, 0, "2026-12-01", "2026-06-02")).toBe("pending");
  });

  it("sums receivables across unpaid invoices", () => {
    expect(totalReceivables([inv], payments)).toBeCloseTo(430.8, 2);
  });
});

describe("P&L and cash flow", () => {
  const invoices: Invoice[] = [
    { id: "a", number: "INV-001", clientId: "c", clientName: "", items: [], subtotal: 1000, taxTotal: 160, total: 1160, costTotal: 400, status: "paid", createdAt: "", dueDate: "", notes: "" },
  ];
  const expenses: Expense[] = [
    { id: "e1", description: "Alquiler", amount: 200, category: "Alquiler", date: "", notes: "" },
  ];

  it("computes a profit & loss statement", () => {
    const pl = profitAndLoss(invoices, expenses);
    expect(pl.revenue).toBe(1000);
    expect(pl.cogs).toBe(400);
    expect(pl.grossProfit).toBe(600);
    expect(pl.expenses).toBe(200);
    expect(pl.netProfit).toBe(400);
    expect(pl.grossMargin).toBeCloseTo(0.6, 4);
    expect(pl.netMargin).toBeCloseTo(0.4, 4);
  });

  it("computes net cash flow", () => {
    const payments: Payment[] = [
      { id: "p", invoiceId: "a", amount: 1160, method: "cash", date: "", notes: "" },
    ];
    expect(netCashFlow(payments, expenses)).toBe(960);
  });
});

describe("nextInvoiceNumber", () => {
  it("pads sequential numbers", () => {
    expect(nextInvoiceNumber(5)).toBe("INV-006");
    expect(nextInvoiceNumber(0)).toBe("INV-001");
  });
});
