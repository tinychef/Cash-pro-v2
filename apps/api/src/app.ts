// ============================================================
// Cash Pro API — Hono app (edge/Docker/Cloud Run ready).
// ============================================================
import { Hono } from "hono";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import { bodyLimit } from "hono/body-limit";
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
import { requireWrite } from "./middleware/authz.js";
import { rateLimit } from "./middleware/rate-limit.js";
import { crudRouter } from "./lib/crud.js";
import { invoicesRouter } from "./routes/invoices.js";
import { paymentsRouter } from "./routes/payments.js";
import { reportsRouter } from "./routes/reports.js";
import { settingsRouter } from "./routes/settings.js";
import { purchasesRouter, supplierPaymentsRouter } from "./routes/purchases.js";
import { devRouter } from "./routes/dev.js";

export function createApp() {
  const app = new Hono<AppEnv>();

  const isProd = process.env.NODE_ENV === "production";

  app.use("*", secureHeaders());
  app.use("*", cors({ origin: process.env.WEB_ORIGIN?.split(",") ?? "*" }));
  // Cap request bodies (defense against memory-exhaustion payloads).
  app.use("*", bodyLimit({ maxSize: 1024 * 1024 }));
  // Basic abuse protection (per-instance, IP-keyed).
  app.use("*", rateLimit({ windowMs: 60_000, max: 300 }));

  app.onError((err, c) => {
    // eslint-disable-next-line no-console
    console.error(err);
    // Don't leak internal error details to clients in production.
    return c.json({ error: isProd ? "Internal Server Error" : err.message }, 500);
  });

  // Liveness probe (no tenant required).
  app.get("/health", (c) => c.json({ status: "ok", service: "cash-pro-api" }));

  // Dev bootstrap (no tenant; self-disables when Clerk is configured).
  app.route("/dev", devRouter);

  const api = new Hono<AppEnv>();

  // Apply Clerk middleware only when configured (keeps dev runnable).
  if (process.env.CLERK_SECRET_KEY) {
    api.use("*", clerkMiddleware());
  }
  api.use("*", tenant);
  api.use("*", requireWrite);

  api.route("/products", crudRouter(products, productInputSchema, "products"));
  api.route("/customers", crudRouter(customers, customerInputSchema, "customers"));
  api.route("/suppliers", crudRouter(suppliers, supplierInputSchema, "suppliers"));
  api.route("/expenses", crudRouter(expenses, expenseInputSchema, "expenses"));
  api.route("/invoices", invoicesRouter);
  api.route("/payments", paymentsRouter);
  api.route("/purchases", purchasesRouter);
  api.route("/supplier-payments", supplierPaymentsRouter);
  api.route("/reports", reportsRouter);
  api.route("/settings", settingsRouter);

  app.route("/api", api);
  return app;
}
