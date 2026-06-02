// ============================================================
// Typed API client for the Cash Pro Hono backend.
// Sends the tenant header (dev) — swap for Clerk auth headers later.
// ============================================================
import { API_BASE, getCompanyId } from "./company";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const companyId = await getCompanyId();
  const res = await fetch(`${API_BASE}/api${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      "x-company-id": companyId,
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `${res.status} ${res.statusText}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(body) }),
  del: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
