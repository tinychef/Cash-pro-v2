// ============================================================
// Cash Pro API — Hono app (edge/Docker/Cloud Run ready).
// ============================================================
import { Hono } from "hono";
import { cors } from "hono/cors";
import { clerkMiddleware } from "@hono/clerk-auth";
import {
  customerInputSchema,
  expenseInputSchema,
  productInputSchema,
  supplierInputSchema,
} from "@cash-pro/core";
import { customers, expenses, products, suppliers } from "@cash-pro/db";
import type { AppEnv } from "./context.js";
import { tenant } from "./middleware/tenant.js";
import { crudRouter } from "./lib/crud.js";
import { invoicesRouter } from "./routes/invoices.js";
import { paymentsRouter } from "./routes/payments.js";
import { reportsRouter } from "./routes/reports.js";

export function createApp() {
  const app = new Hono<AppEnv>();

  app.use("*", cors({ origin: process.env.WEB_ORIGIN?.split(",") ?? "*" }));

  app.onError((err, c) => {
    // eslint-disable-next-line no-console
    console.error(err);
    return c.json({ error: err.message || "Internal Server Error" }, 500);
  });

  // Liveness probe (no tenant required).
  app.get("/health", (c) => c.json({ status: "ok", service: "cash-pro-api" }));

  const api = new Hono<AppEnv>();

  // Apply Clerk middleware only when configured (keeps dev runnable).
  if (process.env.CLERK_SECRET_KEY) {
    api.use("*", clerkMiddleware());
  }
  api.use("*", tenant);

  api.route("/products", crudRouter(products, productInputSchema));
  api.route("/customers", crudRouter(customers, customerInputSchema));
  api.route("/suppliers", crudRouter(suppliers, supplierInputSchema));
  api.route("/expenses", crudRouter(expenses, expenseInputSchema));
  api.route("/invoices", invoicesRouter);
  api.route("/payments", paymentsRouter);
  api.route("/reports", reportsRouter);

  app.route("/api", api);
  return app;
}
