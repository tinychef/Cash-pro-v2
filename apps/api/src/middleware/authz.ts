import type { MiddlewareHandler } from "hono";
import type { AppEnv } from "../context.js";

/**
 * Write authorization: the `viewer` role may only perform safe (GET)
 * requests. All mutating verbs require owner/admin/member.
 */
export const requireWrite: MiddlewareHandler<AppEnv> = async (c, next) => {
  const method = c.req.method.toUpperCase();
  const isWrite = method !== "GET" && method !== "HEAD" && method !== "OPTIONS";
  if (isWrite && c.get("role") === "viewer") {
    return c.json({ error: "Forbidden: your role is read-only" }, 403);
  }
  return next();
};
