// ============================================================
// Ledger & operations: expenses, inventory_movements,
// transactions_log (unified), settings.
// ============================================================
import { index, integer, jsonb, numeric, pgEnum, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { pgTable } from "drizzle-orm/pg-core";
import { auditColumns, idColumn, syncColumns } from "./_shared";
import { companies } from "./tenancy";
import { products } from "./catalog";

export const expenses = pgTable(
  "expenses",
  {
    ...idColumn,
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    description: text("description").notNull(),
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
    category: text("category").notNull().default("General"),
    date: timestamp("date", { withTimezone: true }).notNull().defaultNow(),
    notes: text("notes").notNull().default(""),
    ...syncColumns,
    ...auditColumns,
  },
  (t) => ({ byCompany: index("expenses_company_idx").on(t.companyId) }),
);

export const movementTypeEnum = pgEnum("movement_type", ["in", "out", "adjustment"]);

export const inventoryMovements = pgTable(
  "inventory_movements",
  {
    ...idColumn,
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    type: movementTypeEnum("type").notNull(),
    quantity: integer("quantity").notNull(),
    reason: text("reason").notNull().default(""),
    date: timestamp("date", { withTimezone: true }).notNull().defaultNow(),
    ...syncColumns,
    ...auditColumns,
  },
  (t) => ({ byProduct: index("inventory_movements_product_idx").on(t.productId) }),
);

export const txnTypeEnum = pgEnum("txn_type", [
  "sale",
  "payment_received",
  "purchase",
  "supplier_payment",
  "expense",
  "adjustment",
]);

/** Unified, append-only log of every money/inventory event. */
export const transactionsLog = pgTable(
  "transactions_log",
  {
    ...idColumn,
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    type: txnTypeEnum("type").notNull(),
    refTable: text("ref_table").notNull(),
    refId: uuid("ref_id").notNull(),
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull().default("0"),
    description: text("description").notNull().default(""),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
    ...syncColumns,
    ...auditColumns,
  },
  (t) => ({ byCompany: index("transactions_log_company_idx").on(t.companyId, t.occurredAt) }),
);

export const settings = pgTable("settings", {
  ...idColumn,
  companyId: uuid("company_id")
    .notNull()
    .unique()
    .references(() => companies.id, { onDelete: "cascade" }),
  data: jsonb("data").notNull().default({}),
  ...syncColumns,
  ...auditColumns,
});
