import type { Context } from "hono";
import type { AppEnv } from "../context.js";

const DEFAULT_LIMIT = 500;
const MAX_LIMIT = 500;

/**
 * Parse pagination params, bounded to keep list endpoints from returning
 * unbounded result sets. `?limit=` (default/cap 500) and `?offset=`.
 */
export function parsePaging(c: Context<AppEnv>): { limit: number; offset: number } {
  const rawLimit = Number(c.req.query("limit"));
  const rawOffset = Number(c.req.query("offset"));
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, MAX_LIMIT) : DEFAULT_LIMIT;
  const offset = Number.isFinite(rawOffset) && rawOffset > 0 ? rawOffset : 0;
  return { limit, offset };
}
