// ============================================================
// Typed API client for the Cash Pro Hono backend.
//
// Auth headers adapt to the mode:
//  - Clerk on  → Authorization: Bearer <session token> (tenant resolved
//    server-side from the verified token / active organization)
//  - dev       → x-company-id from the bootstrapped demo company
// ============================================================
import { API_BASE, getCompanyId } from "./company";
import { clerkEnabled } from "./auth-config";

/* eslint-disable @typescript-eslint/no-explicit-any */
async function getClerkToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const w = window as any;
  for (let i = 0; i < 50 && !w.Clerk?.loaded; i++) {
    await new Promise((r) => setTimeout(r, 100));
  }
  try {
    return (await w.Clerk?.session?.getToken?.()) ?? null;
  } catch {
    return null;
  }
}

async function authHeaders(): Promise<Record<string, string>> {
  if (clerkEnabled) {
    const token = await getClerkToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }
  return { "x-company-id": await getCompanyId() };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}/api${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(await authHeaders()),
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
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  del: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
