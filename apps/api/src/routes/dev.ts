// ============================================================
// Dev-only bootstrap: provisions a demo company and seeds sample data
// so the web app is usable end-to-end without Clerk. Disabled when
// CLERK_SECRET_KEY is set (production).
// ============================================================
import { Hono } from "hono";
import { companies, customers, expenses, products } from "@cash-pro/db";
import { getDb } from "@cash-pro/db";
import type { AppEnv } from "../context.js";

export const devRouter = new Hono<AppEnv>();

const seedProducts = [
  { code: "CAM-001", name: "Camiseta Básica", purchasePrice: "5", salePrice: "15", stock: 120, minStock: 20 },
  { code: "PAN-002", name: "Pantalón Casual", purchasePrice: "12", salePrice: "35", stock: 45, minStock: 10 },
  { code: "ZAP-003", name: "Zapatos Deportivos", purchasePrice: "25", salePrice: "70", stock: 8, minStock: 10 },
  { code: "GOR-004", name: "Gorra Snapback", purchasePrice: "3", salePrice: "12", stock: 200, minStock: 30 },
  { code: "BOL-005", name: "Bolso de Cuero", purchasePrice: "18", salePrice: "55", stock: 5, minStock: 8 },
  { code: "CIN-006", name: "Cinturón Premium", purchasePrice: "8", salePrice: "28", stock: 60, minStock: 15 },
];

const seedCustomers = [
  { name: "María González", email: "maria@email.com", phone: "+58 412-555-0101", address: "Av. Libertador 123" },
  { name: "Carlos Rodríguez", email: "carlos@email.com", phone: "+58 414-555-0202", address: "Calle Bolívar 456" },
  { name: "Ana Martínez", email: "ana@email.com", phone: "+58 416-555-0303", address: "Centro Comercial Plaza" },
  { name: "Pedro Sánchez", email: "pedro@email.com", phone: "+58 424-555-0404", address: "Zona Industrial Norte" },
];

const seedExpenses = [
  { description: "Alquiler local", amount: "200", category: "Alquiler" },
  { description: "Servicio de internet", amount: "30", category: "Servicios" },
  { description: "Compra de inventario", amount: "450", category: "Inventario" },
  { description: "Publicidad redes sociales", amount: "50", category: "Marketing" },
];

devRouter.post("/bootstrap", async (c) => {
  if (process.env.CLERK_SECRET_KEY) {
    return c.json({ error: "Disabled in production" }, 403);
  }
  const db = getDb();
  const name = (await c.req.json().catch(() => ({})))?.name ?? "Demo Cash Pro";

  const [company] = await db.insert(companies).values({ name }).returning();
  const companyId = company!.id;

  await db.insert(products).values(seedProducts.map((p) => ({ ...p, companyId, taxRate: "0.16" })));
  await db.insert(customers).values(seedCustomers.map((cu) => ({ ...cu, companyId })));
  await db.insert(expenses).values(seedExpenses.map((e) => ({ ...e, companyId })));

  return c.json({ companyId, name }, 201);
});
