// ============================================================
// Resolves the active company (tenant) for API calls.
//
// Dev mode (no Clerk): provisions a demo company via /dev/bootstrap and
// caches its id in localStorage. When Clerk is wired this module is
// replaced by the Clerk session / active organization.
// ============================================================
export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

const STORAGE_KEY = "cashpro-company-id";
let cached: string | null = null;
let inflight: Promise<string> | null = null;

export async function getCompanyId(): Promise<string> {
  if (cached) return cached;
  if (typeof window === "undefined") throw new Error("getCompanyId is client-only");

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored) {
    cached = stored;
    return stored;
  }

  // De-dupe concurrent bootstraps.
  if (!inflight) {
    inflight = (async () => {
      const res = await fetch(`${API_BASE}/dev/bootstrap`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "Mi Negocio" }),
      });
      if (!res.ok) throw new Error("No se pudo inicializar la empresa");
      const data = (await res.json()) as { companyId: string };
      window.localStorage.setItem(STORAGE_KEY, data.companyId);
      cached = data.companyId;
      return data.companyId;
    })();
  }
  return inflight;
}

export function resetCompany() {
  cached = null;
  inflight = null;
  if (typeof window !== "undefined") window.localStorage.removeItem(STORAGE_KEY);
}
