// ============================================================
// Signed share tokens for public (no-login) invoice links.
// Token = "<invoiceId>.<hmac>" — the HMAC gates access, so only
// holders of a server-issued link can read the invoice.
// ============================================================
import { createHmac, timingSafeEqual } from "node:crypto";

function secret(): string {
  // APP_SECRET is preferred; CLERK_SECRET_KEY is already secret in prod.
  return process.env.APP_SECRET ?? process.env.CLERK_SECRET_KEY ?? "cash-pro-dev-secret";
}

function hmac(invoiceId: string): string {
  return createHmac("sha256", secret()).update(`invoice:${invoiceId}`).digest("hex").slice(0, 32);
}

export function signInvoiceToken(invoiceId: string): string {
  return `${invoiceId}.${hmac(invoiceId)}`;
}

/** Returns the invoice id when the token is valid, null otherwise. */
export function verifyInvoiceToken(token: string): string | null {
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const id = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = hmac(id);
  if (sig.length !== expected.length) return null;
  try {
    return timingSafeEqual(Buffer.from(sig), Buffer.from(expected)) ? id : null;
  } catch {
    return null;
  }
}
