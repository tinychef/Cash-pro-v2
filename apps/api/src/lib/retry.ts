/* eslint-disable @typescript-eslint/no-explicit-any */
// Retry a unit of work on a unique-constraint violation (Postgres 23505).
// Used to make count-based document numbering safe under concurrency:
// if two requests pick the same number, the loser retries with a fresh one.
export async function withUniqueRetry<T>(fn: () => Promise<T>, tries = 6): Promise<T> {
  let last: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (e: any) {
      const isUnique = e?.code === "23505" || /duplicate key value/i.test(e?.message ?? "");
      if (isUnique) {
        last = e;
        continue;
      }
      throw e;
    }
  }
  throw last;
}
