// ============================================================
// Catalog: categories, products, customers, suppliers.
// ============================================================
import { boolean, index, integer, numeric, text, uuid } from "drizzle-orm/pg-core";
import { pgTable } from "drizzle-orm/pg-core";
import { auditColumns, idColumn, sql, syncColumns } from "./_shared";
import { companies } from "./tenancy";

export const categories = pgTable(
  "categories",
  {
    ...idColumn,
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    ...syncColumns,
    ...auditColumns,
  },
  (t) => ({ byCompany: index("categories_company_idx").on(t.companyId) }),
);

export const products = pgTable(
  "products",
  {
    ...idColumn,
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
    code: text("code").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    unit: text("unit").notNull().default("und"),
    purchasePrice: numeric("purchase_price", { precision: 12, scale: 2 }).notNull().default("0"),
    salePrice: numeric("sale_price", { precision: 12, scale: 2 }).notNull().default("0"),
    taxRate: numeric("tax_rate", { precision: 5, scale: 4 }).notNull().default("0.16"),
    stock: integer("stock").notNull().default(0),
    minStock: integer("min_stock").notNull().default(0),
    active: boolean("active").notNull().default(true),
    // GENERATED columns computed by Postgres (portable: STORED generated columns
    // are supported by Supabase / Cloud SQL / RDS / Neon / Postgres 15+).
    profitPerUnit: numeric("profit_per_unit", { precision: 12, scale: 2 }).generatedAlwaysAs(
      sql`(sale_price - purchase_price)`,
    ),
    profitMargin: numeric("profit_margin", { precision: 5, scale: 2 }).generatedAlwaysAs(
      sql`(CASE WHEN sale_price > 0 THEN ((sale_price - purchase_price) / sale_price * 100) ELSE 0 END)`,
    ),
    ...syncColumns,
    ...auditColumns,
  },
  (t) => ({
    byCompany: index("products_company_idx").on(t.companyId),
    byCode: index("products_code_idx").on(t.companyId, t.code),
  }),
);

export const customers = pgTable(
  "customers",
  {
    ...idColumn,
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    email: text("email").notNull().default(""),
    phone: text("phone").notNull().default(""),
    address: text("address").notNull().default(""),
    notes: text("notes").notNull().default(""),
    ...syncColumns,
    ...auditColumns,
  },
  (t) => ({ byCompany: index("customers_company_idx").on(t.companyId) }),
);

export const suppliers = pgTable(
  "suppliers",
  {
    ...idColumn,
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    email: text("email").notNull().default(""),
    phone: text("phone").notNull().default(""),
    address: text("address").notNull().default(""),
    notes: text("notes").notNull().default(""),
    ...syncColumns,
    ...auditColumns,
  },
  (t) => ({ byCompany: index("suppliers_company_idx").on(t.companyId) }),
);
