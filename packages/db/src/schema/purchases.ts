// ============================================================
// Purchases: purchase_orders, purchase_order_items, supplier_payments.
// ============================================================
import { index, numeric, pgEnum, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { pgTable } from "drizzle-orm/pg-core";
import { auditColumns, idColumn, syncColumns } from "./_shared";
import { companies } from "./tenancy";
import { products, suppliers } from "./catalog";
import { paymentMethodEnum } from "./sales";

export const purchaseStatusEnum = pgEnum("purchase_status", [
  "pending",
  "received",
  "paid",
  "partial",
]);

export const purchaseOrders = pgTable(
  "purchase_orders",
  {
    ...idColumn,
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    number: text("number").notNull(),
    supplierId: uuid("supplier_id").references(() => suppliers.id, { onDelete: "set null" }),
    supplierName: text("supplier_name").notNull(),
    total: numeric("total", { precision: 14, scale: 2 }).notNull().default("0"),
    status: purchaseStatusEnum("status").notNull().default("pending"),
    notes: text("notes").notNull().default(""),
    ...syncColumns,
    ...auditColumns,
  },
  (t) => ({ byCompany: index("purchase_orders_company_idx").on(t.companyId) }),
);

export const purchaseOrderItems = pgTable(
  "purchase_order_items",
  {
    ...idColumn,
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    purchaseOrderId: uuid("purchase_order_id")
      .notNull()
      .references(() => purchaseOrders.id, { onDelete: "cascade" }),
    productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
    productName: text("product_name").notNull(),
    quantity: numeric("quantity", { precision: 12, scale: 2 }).notNull(),
    unitCost: numeric("unit_cost", { precision: 12, scale: 2 }).notNull(),
    ...syncColumns,
    ...auditColumns,
  },
  (t) => ({ byOrder: index("purchase_order_items_order_idx").on(t.purchaseOrderId) }),
);

export const supplierPayments = pgTable(
  "supplier_payments",
  {
    ...idColumn,
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    purchaseOrderId: uuid("purchase_order_id")
      .notNull()
      .references(() => purchaseOrders.id, { onDelete: "cascade" }),
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
    method: paymentMethodEnum("method").notNull().default("cash"),
    date: timestamp("date", { withTimezone: true }).notNull().defaultNow(),
    notes: text("notes").notNull().default(""),
    ...syncColumns,
    ...auditColumns,
  },
  (t) => ({ byOrder: index("supplier_payments_order_idx").on(t.purchaseOrderId) }),
);
