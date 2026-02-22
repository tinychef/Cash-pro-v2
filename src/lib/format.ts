// ============================================================
// Cash Pro v2 — Formatting Utilities
// ============================================================

export function currency(n: number): string {
    return new Intl.NumberFormat("es-VE", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
    }).format(n);
}

export function pct(n: number): string {
    return `${(n * 100).toFixed(1)}%`;
}

export function shortDate(iso: string): string {
    const d = new Date(iso + "T12:00:00");
    return d.toLocaleDateString("es", { day: "2-digit", month: "short" });
}

export function fullDate(iso: string): string {
    const d = new Date(iso + "T12:00:00");
    return d.toLocaleDateString("es", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}

export function margin(sale: number, cost: number): number {
    if (sale === 0) return 0;
    return (sale - cost) / sale;
}

export function profit(sale: number, cost: number, qty: number): number {
    return (sale - cost) * qty;
}
