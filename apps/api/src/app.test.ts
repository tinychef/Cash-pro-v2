/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeAll } from "vitest";
import { createApp } from "./app.js";

const parse = async (res: Response): Promise<any> => res.json();

// The DB-backed suite runs only when DATABASE_URL points at a migrated
// Postgres; otherwise it is skipped (local default + lightweight CI).
const DB = process.env.DATABASE_URL;
const dbDescribe = DB ? describe : describe.skip;

it("serves /health without a database", async () => {
  const app = createApp();
  const res = await app.request("/health");
  expect(res.status).toBe(200);
  expect(await res.json()).toMatchObject({ status: "ok" });
});

dbDescribe("API integration (Postgres)", () => {
  let app: ReturnType<typeof createApp>;
  let companyA = "";
  let companyB = "";

  const json = (companyId: string, body?: unknown, method = "GET") =>
    ({
      method,
      headers: { "content-type": "application/json", "x-company-id": companyId },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    }) satisfies RequestInit;

  beforeAll(async () => {
    const postgres = (await import("postgres")).default;
    const { drizzle } = await import("drizzle-orm/postgres-js");
    const { migrate } = await import("drizzle-orm/postgres-js/migrator");
    const client = postgres(DB!, { max: 1 });
    await migrate(drizzle(client), {
      migrationsFolder: new URL("../../../packages/db/migrations", import.meta.url).pathname,
    });
    await client.end();

    app = createApp();
    const boot = async () =>
      (await parse(await app.request("/dev/bootstrap", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" }))).companyId as string;
    companyA = await boot();
    companyB = await boot();
  });

  it("creates and lists products scoped to the tenant", async () => {
    const res = await app.request("/api/products", json(companyA, { code: "IT-1", name: "Widget", purchasePrice: 4, salePrice: 10, stock: 3 }, "POST"));
    expect(res.status).toBe(201);
    const list = await parse(await app.request("/api/products", json(companyA)));
    expect(list.some((p: { code: string }) => p.code === "IT-1")).toBe(true);
  });

  it("isolates tenants: company B cannot see or fetch A's product", async () => {
    const created = await parse(await app.request("/api/products", json(companyA, { code: "SECRET", name: "Secret", purchasePrice: 1, salePrice: 2, stock: 5 }, "POST")));
    const listB = await parse(await app.request("/api/products", json(companyB)));
    expect(listB.some((p: { id: string }) => p.id === created.id)).toBe(false);
    const fetchB = await app.request(`/api/products/${created.id}`, json(companyB));
    expect(fetchB.status).toBe(404);
  });

  it("blocks a sale that would drive stock negative (409)", async () => {
    const prod = await parse(await app.request("/api/products", json(companyA, { code: "LOW", name: "Low", purchasePrice: 1, salePrice: 5, stock: 2 }, "POST")));
    const res = await app.request(
      "/api/invoices",
      json(companyA, { clientId: "", clientName: "X", dueDate: "2026-12-31", items: [{ productId: prod.id, productName: "Low", quantity: 5, unitPrice: 5, costPrice: 1, taxRate: 0.16 }] }, "POST"),
    );
    expect(res.status).toBe(409);
  });

  it("decrements stock on a valid sale", async () => {
    const prod = await parse(await app.request("/api/products", json(companyA, { code: "SELL", name: "Sell", purchasePrice: 2, salePrice: 6, stock: 10 }, "POST")));
    const inv = await app.request(
      "/api/invoices",
      json(companyA, { clientId: "", clientName: "X", dueDate: "2026-12-31", items: [{ productId: prod.id, productName: "Sell", quantity: 4, unitPrice: 6, costPrice: 2, taxRate: 0.16 }] }, "POST"),
    );
    expect(inv.status).toBe(201);
    const after = await parse(await app.request(`/api/products/${prod.id}`, json(companyA)));
    expect(after.stock).toBe(6);
  });

  it("applies per-line discounts to invoice totals", async () => {
    const prod = await parse(await app.request("/api/products", json(companyA, { code: "DISC", name: "Disc", purchasePrice: 8, salePrice: 20, stock: 50 }, "POST")));
    const res = await app.request(
      "/api/invoices",
      json(companyA, { clientId: "", clientName: "X", dueDate: "2026-12-31", items: [{ productId: prod.id, productName: "Disc", quantity: 10, unitPrice: 20, costPrice: 8, taxRate: 0.16, discountRate: 0.1 }] }, "POST"),
    );
    expect(res.status).toBe(201);
    const inv = await parse(res);
    expect(inv.subtotal).toBe(180); // 200 - 10%
    expect(inv.discountTotal).toBe(20);
    expect(inv.taxTotal).toBeCloseTo(28.8, 2);
    expect(inv.total).toBeCloseTo(208.8, 2);
    expect(inv.grossProfit).toBe(100);
  });

  it("creates a quote without touching stock, then converts it to an invoice", async () => {
    const prod = await parse(await app.request("/api/products", json(companyA, { code: "QUO", name: "Quotable", purchasePrice: 3, salePrice: 9, stock: 10 }, "POST")));

    // Creating a quote must NOT change stock.
    const quote = await parse(await app.request(
      "/api/quotes",
      json(companyA, { clientId: "", clientName: "Prospect", validUntil: "2026-12-31", items: [{ productId: prod.id, productName: "Quotable", quantity: 4, unitPrice: 9, costPrice: 3, taxRate: 0.16 }] }, "POST"),
    ));
    expect(quote.number).toMatch(/^COT-/);
    expect(quote.status).toBe("draft");
    const afterQuote = await parse(await app.request(`/api/products/${prod.id}`, json(companyA)));
    expect(afterQuote.stock).toBe(10);

    // Converting must create an invoice AND decrement stock.
    const conv = await app.request(`/api/quotes/${quote.id}/convert`, json(companyA, {}, "POST"));
    expect(conv.status).toBe(201);
    const invoice = await parse(conv);
    expect(invoice.number).toMatch(/^INV-/);
    const afterConv = await parse(await app.request(`/api/products/${prod.id}`, json(companyA)));
    expect(afterConv.stock).toBe(6);

    // Re-converting the same quote must be rejected.
    const again = await app.request(`/api/quotes/${quote.id}/convert`, json(companyA, {}, "POST"));
    expect(again.status).toBe(409);
  });

  it("isolates quotes per tenant", async () => {
    const prod = await parse(await app.request("/api/products", json(companyA, { code: "QISO", name: "QIso", purchasePrice: 1, salePrice: 50, stock: 5 }, "POST")));
    const q = await parse(await app.request(
      "/api/quotes",
      json(companyA, { clientId: "", clientName: "Only A", validUntil: "2026-12-31", items: [{ productId: prod.id, productName: "QIso", quantity: 1, unitPrice: 50, costPrice: 1, taxRate: 0 }] }, "POST"),
    ));
    const listB = await parse(await app.request("/api/quotes", json(companyB)));
    expect(listB.some((x: { id: string }) => x.id === q.id)).toBe(false);
    const fetchB = await app.request(`/api/quotes/${q.id}`, json(companyB));
    expect(fetchB.status).toBe(404);
  });
});
