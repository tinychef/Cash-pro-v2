"use client";

// Public invoice view — reachable without login via a signed share link.
// Fetches the sanitized payload from the API's /public endpoint directly
// (no auth headers) and renders a customer-facing, branded invoice.
import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { API_BASE } from "@/lib/company";
import { Download } from "lucide-react";

interface PublicItem {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  discountRate: number;
}

interface PublicInvoice {
  number: string;
  customerName: string;
  createdAt: string;
  dueDate: string | null;
  status: string;
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  total: number;
  notes: string;
  items: PublicItem[];
  brand: {
    name: string;
    currency: string;
    locale: string;
    taxId: string;
    address: string;
    phone: string;
    email: string;
    accentColor: string;
    footerNote: string;
    logoDataUrl: string;
  };
}

const statusLabel: Record<string, string> = {
  paid: "Pagada",
  pending: "Pendiente",
  partial: "Pago parcial",
  overdue: "Vencida",
};

export default function PublicInvoicePage() {
  const params = useParams<{ token: string }>();
  const token = params?.token;
  const [data, setData] = useState<PublicInvoice | null>(null);
  const [error, setError] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE}/public/invoices/${token}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then(setData)
      .catch(() => setError(true));
  }, [token]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary/30 p-6">
        <p className="text-sm text-muted-foreground">Este enlace no es válido o la factura ya no está disponible.</p>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary/30 p-6">
        <p className="text-sm text-muted-foreground">Cargando factura…</p>
      </div>
    );
  }

  const { brand } = data;
  const accent = brand.accentColor || "#16a34a";
  const fmt = new Intl.NumberFormat(brand.locale || "es-VE", {
    style: "currency",
    currency: brand.currency || "USD",
  });
  const money = (n: number) => fmt.format(n);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const { downloadInvoicePdfFromData } = await import("@/lib/invoice-pdf");
      await downloadInvoicePdfFromData(data, brand);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-secondary/30 py-8 px-4">
      <div className="max-w-2xl mx-auto bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
        <div className="p-6 border-b border-border flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            {brand.logoDataUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={brand.logoDataUrl} alt={brand.name} className="h-12 w-12 rounded-lg object-contain bg-white border border-border" />
            )}
            <div>
              <h1 className="text-lg font-bold" style={{ color: accent }}>{brand.name}</h1>
              {brand.taxId && <p className="text-xs text-muted-foreground">{brand.taxId}</p>}
              {brand.address && <p className="text-xs text-muted-foreground">{brand.address}</p>}
              {(brand.phone || brand.email) && (
                <p className="text-xs text-muted-foreground">{[brand.phone, brand.email].filter(Boolean).join(" · ")}</p>
              )}
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-base font-bold">{data.number}</p>
            <p className="text-xs text-muted-foreground">Emitida: {data.createdAt.slice(0, 10)}</p>
            {data.dueDate && <p className="text-xs text-muted-foreground">Vence: {data.dueDate.slice(0, 10)}</p>}
            <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-secondary">
              {statusLabel[data.status] ?? data.status}
            </span>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <p className="text-xs text-muted-foreground">Cliente</p>
            <p className="text-sm font-semibold">{data.customerName}</p>
          </div>

          <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
            {data.items.map((it) => (
              <div key={it.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <div className="min-w-0">
                  <p className="font-medium truncate">{it.productName}</p>
                  <p className="text-xs text-muted-foreground">
                    {money(it.unitPrice)} × {it.quantity}
                    {it.discountRate > 0 ? ` · −${Math.round(it.discountRate * 100)}%` : ""}
                  </p>
                </div>
                <span className="font-semibold shrink-0">{money(it.unitPrice * it.quantity * (1 - it.discountRate))}</span>
              </div>
            ))}
          </div>

          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{money(data.subtotal)}</span></div>
            {data.discountTotal > 0 && (
              <div className="flex justify-between"><span className="text-muted-foreground">Descuento</span><span className="text-emerald-600">−{money(data.discountTotal)}</span></div>
            )}
            <div className="flex justify-between"><span className="text-muted-foreground">Impuesto</span><span>{money(data.taxTotal)}</span></div>
            <div className="flex justify-between text-base font-bold pt-2 border-t border-border">
              <span>Total</span><span style={{ color: accent }}>{money(data.total)}</span>
            </div>
          </div>

          {data.notes && <p className="text-xs text-muted-foreground">Notas: {data.notes}</p>}

          <button
            onClick={handleDownload}
            disabled={downloading}
            className="w-full h-11 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-opacity disabled:opacity-60"
            style={{ backgroundColor: accent }}
          >
            <Download className="h-4 w-4" /> {downloading ? "Generando…" : "Descargar PDF"}
          </button>

          {brand.footerNote && <p className="text-center text-xs text-muted-foreground pt-2">{brand.footerNote}</p>}
        </div>
      </div>
    </div>
  );
}
