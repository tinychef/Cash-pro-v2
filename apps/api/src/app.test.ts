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
});
