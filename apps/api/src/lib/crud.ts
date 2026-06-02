// ============================================================
// Generic tenant-scoped, soft-delete CRUD router factory.
// Used for the "simple" entities (products, customers, suppliers,
// expenses). Invoices and payments have dedicated handlers because
// they recompute aggregates via @cash-pro/core.
// ============================================================
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { and, desc, eq, isNull } from "drizzle-orm";
import type { ZodTypeAny } from "zod";
import type { AppEnv } from "../context.js";

// Tables share these columns; we access them dynamically so one factory
// serves many tables. Typed loosely on purpose.
/* eslint-disable @typescript-eslint/no-explicit-any */
export function crudRouter(table: any, schema: ZodTypeAny) {
  const router = new Hono<AppEnv>();

  router.get("/", async (c) => {
    const db = c.get("db");
    const companyId = c.get("companyId");
    const rows = await db
      .select()
      .from(table)
      .where(and(eq(table.companyId, companyId), isNull(table.deletedAt)))
      .orderBy(desc(table.createdAt));
    return c.json(rows);
  });

  router.get("/:id", async (c) => {
    const db = c.get("db");
    const companyId = c.get("companyId");
    const rows = await db
      .select()
      .from(table)
      .where(and(eq(table.id, c.req.param("id")), eq(table.companyId, companyId)))
      .limit(1);
    if (!rows[0]) return c.json({ error: "Not found" }, 404);
    return c.json(rows[0]);
  });

  router.post("/", zValidator("json", schema), async (c) => {
    const db = c.get("db");
    const companyId = c.get("companyId");
    const userId = c.get("userId");
    const input = c.req.valid("json") as Record<string, unknown>;
    const [row] = await db
      .insert(table)
      .values({ ...input, companyId, createdBy: userId, syncStatus: "synced" })
      .returning();
    return c.json(row, 201);
  });

  const updateSchema = "partial" in schema ? (schema as any).partial() : schema;
  router.put("/:id", zValidator("json", updateSchema), async (c) => {
    const db = c.get("db");
    const companyId = c.get("companyId");
    const userId = c.get("userId");
    const input = c.req.valid("json") as Record<string, unknown>;
    const [row] = await db
      .update(table)
      .set({ ...input, updatedBy: userId, lastModifiedAt: new Date() })
      .where(and(eq(table.id, c.req.param("id")), eq(table.companyId, companyId)))
      .returning();
    if (!row) return c.json({ error: "Not found" }, 404);
    return c.json(row);
  });

  router.delete("/:id", async (c) => {
    const db = c.get("db");
    const companyId = c.get("companyId");
    const [row] = await db
      .update(table)
      .set({ deletedAt: new Date(), syncStatus: "pending", lastModifiedAt: new Date() })
      .where(and(eq(table.id, c.req.param("id")), eq(table.companyId, companyId)))
      .returning();
    if (!row) return c.json({ error: "Not found" }, 404);
    return c.json({ ok: true });
  });

  return router;
}
