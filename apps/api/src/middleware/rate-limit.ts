import type { MiddlewareHandler } from "hono";
import type { AppEnv } from "../context.js";

// Lightweight in-memory fixed-window rate limiter. Keyed by client IP
// (best-effort via forwarded headers). Note: per-instance only — for
// multi-instance deployments back this with Redis/Upstash.
interface Bucket {
  count: number;
  resetAt: number;
}
const buckets = new Map<string, Bucket>();

export function rateLimit(opts: { windowMs: number; max: number }): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const key =
      c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
      c.req.header("x-real-ip") ||
      "unknown";
    const now = Date.now();
    const b = buckets.get(key);
    if (!b || now > b.resetAt) {
      buckets.set(key, { count: 1, resetAt: now + opts.windowMs });
    } else {
      b.count += 1;
      if (b.count > opts.max) {
        const retry = Math.ceil((b.resetAt - now) / 1000);
        c.header("Retry-After", String(retry));
        return c.json({ error: "Too many requests" }, 429);
      }
    }
    return next();
  };
}

// Opportunistic cleanup so the map doesn't grow unbounded.
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of buckets) if (now > v.resetAt) buckets.delete(k);
}, 60_000).unref?.();
