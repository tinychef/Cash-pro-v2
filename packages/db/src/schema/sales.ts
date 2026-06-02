// ============================================================
// Sales: invoices, invoice_items, payments.
// Aggregate profit columns (cost_of_goods, gross_profit, profit_margin)
// are written by @cash-pro/core at write time since they span line items.
// ============================================================
import { index, numeric, pgEnum, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { pgTable } from "drizzle-orm/pg-core";
import { auditColumns, idColumn, syncColumns } from "./_shared";
import { companies } from "./tenancy";
import { customers, products } from "./catalog";

export const invoiceStatusEnum = pgEnum("invoice_status", [
  "pending",
  "paid",
  "partial",
  "overdue",
]);

export const paymentMethodEnum = pgEnum("payment_method", ["cash", "card", "transfer", "other"]);

export const invoices = pgTable(
  "invoices",
  {
    ...idColumn,
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    number: text("number").notNull(),
    customerId: uuid("customer_id").references(() => customers.id, { onDelete: "set null" }),
    customerName: text("customer_name").notNull(),
    subtotal: numeric("subtotal", { precision: 14, scale: 2 }).notNull().default("0"),
    taxTotal: numeric("tax_total", { precision: 14, scale: 2 }).notNull().default("0"),
    total: numeric("total", { precision: 14, scale: 2 }).notNull().default("0"),
    costOfGoods: numeric("cost_of_goods", { precision: 14, scale: 2 }).notNull().default("0"),
    grossProfit: numeric("gross_profit", { precision: 14, scale: 2 }).notNull().default("0"),
    profitMargin: numeric("profit_margin", { precision: 5, scale: 2 }).notNull().default("0"),
    status: invoiceStatusEnum("status").notNull().default("pending"),
    dueDate: timestamp("due_date", { withTimezone: true }),
    notes: text("notes").notNull().default(""),
    ...syncColumns,
    ...auditColumns,
  },
  (t) => ({
    byCompany: index("invoices_company_idx").on(t.companyId),
    byStatus: index("invoices_status_idx").on(t.companyId, t.status),
    numberUnq: uniqueIndex("invoices_number_unq").on(t.companyId, t.number),
  }),
);

export const invoiceItems = pgTable(
  "invoice_items",
  {
    ...idColumn,
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    invoiceId: uuid("invoice_id")
      .notNull()
      .references(() => invoices.id, { onDelete: "cascade" }),
    productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
    productName: text("product_name").notNull(),
    quantity: numeric("quantity", { precision: 12, scale: 2 }).notNull(),
    unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
    costPrice: numeric("cost_price", { precision: 12, scale: 2 }).notNull(),
    taxRate: numeric("tax_rate", { precision: 5, scale: 4 }).notNull().default("0.16"),
    ...syncColumns,
    ...auditColumns,
  },
  (t) => ({ byInvoice: index("invoice_items_invoice_idx").on(t.invoiceId) }),
);

export const payments = pgTable(
  "payments",
  {
    ...idColumn,
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    invoiceId: uuid("invoice_id")
      .notNull()
      .references(() => invoices.id, { onDelete: "cascade" }),
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
    method: paymentMethodEnum("method").notNull().default("cash"),
    date: timestamp("date", { withTimezone: true }).notNull().defaultNow(),
    notes: text("notes").notNull().default(""),
    ...syncColumns,
    ...auditColumns,
  },
  (t) => ({
    byCompany: index("payments_company_idx").on(t.companyId),
    byInvoice: index("payments_invoice_idx").on(t.invoiceId),
  }),
);
