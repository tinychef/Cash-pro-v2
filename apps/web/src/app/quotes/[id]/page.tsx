"use client";

import React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { currency, shortDate, type QuoteStatus } from "@cash-pro/core";
import { useQuote, useUpdateQuoteStatus, useConvertQuote } from "@/lib/queries";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRightLeft, Send, Check, X } from "lucide-react";
import { LoadingState, ErrorState } from "@/components/states";

const statusClass: Record<QuoteStatus, string> = {
  draft: "bg-secondary text-muted-foreground",
  sent: "bg-blue-500/15 text-blue-600",
  accepted: "bg-emerald-500/15 text-emerald-600",
  declined: "bg-red-500/15 text-red-600",
  expired: "bg-amber-500/15 text-amber-600",
  converted: "bg-primary/15 text-primary",
};
const statusLabel: Record<QuoteStatus, string> = {
  draft: "Borrador",
  sent: "Enviada",
  accepted: "Aceptada",
  declined: "Rechazada",
  expired: "Vencida",
  converted: "Convertida",
};

export default function QuoteDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id;
  const { data: quote, isLoading, error } = useQuote(id);
  const updateStatus = useUpdateQuoteStatus();
  const convert = useConvertQuote();

  if (isLoading) return <div className="p-6"><LoadingState /></div>;
  if (error) return <div className="p-6"><ErrorState error={error as Error} /></div>;
  if (!quote) return null;

  const items = quote.items ?? [];
  const isConverted = quote.status === "converted";

  const handleConvert = async () => {
    try {
      const invoice = await convert.mutateAsync(quote.id);
      router.push(`/invoices/${invoice.id}`);
    } catch {
      /* toast handled */
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-5 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <Link href="/quotes">
          <Button variant="ghost" size="icon" className="h-9 w-9"><ArrowLeft className="h-5 w-5" /></Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold tracking-tight">{quote.number}</h2>
            <Badge variant="secondary" className={`text-[10px] px-2 py-0.5 ${statusClass[quote.status]}`}>{statusLabel[quote.status]}</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">{quote.clientName}</p>
        </div>
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Creada</p>
            <p className="font-medium">{shortDate(quote.createdAt.slice(0, 10))}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Válida hasta</p>
            <p className="font-medium">{quote.validUntil ? shortDate(quote.validUntil.slice(0, 10)) : "—"}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-4 space-y-2">
          {items.map((it) => (
            <div key={it.id} className="flex items-center justify-between text-sm">
              <div className="min-w-0">
                <p className="font-medium truncate">{it.productName}</p>
                <p className="text-xs text-muted-foreground">{currency(it.unitPrice)} × {it.quantity}</p>
              </div>
              <span className="font-semibold">{currency(it.unitPrice * it.quantity)}</span>
            </div>
          ))}
          <div className="pt-2 border-t border-border flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{currency(quote.subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Impuesto</span>
            <span>{currency(quote.taxTotal)}</span>
          </div>
          <div className="flex justify-between text-base font-bold pt-2 border-t border-border">
            <span>Total</span>
            <span className="text-primary">{currency(quote.total)}</span>
          </div>
        </CardContent>
      </Card>

      {quote.notes && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 text-sm">
            <p className="text-xs text-muted-foreground mb-1">Notas</p>
            {quote.notes}
          </CardContent>
        </Card>
      )}

      {isConverted ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Esta cotización ya fue convertida en factura.</p>
            {quote.convertedInvoiceId && (
              <Link href={`/invoices/${quote.convertedInvoiceId}`}>
                <Button variant="outline" size="sm" className="rounded-xl">Ver factura</Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2 pb-8">
          <div className="grid grid-cols-3 gap-2">
            <Button variant="outline" size="sm" className="rounded-xl gap-1.5 text-xs" disabled={updateStatus.isPending} onClick={() => updateStatus.mutate({ id: quote.id, status: "sent" })}>
              <Send className="h-3.5 w-3.5" /> Enviada
            </Button>
            <Button variant="outline" size="sm" className="rounded-xl gap-1.5 text-xs" disabled={updateStatus.isPending} onClick={() => updateStatus.mutate({ id: quote.id, status: "accepted" })}>
              <Check className="h-3.5 w-3.5" /> Aceptada
            </Button>
            <Button variant="outline" size="sm" className="rounded-xl gap-1.5 text-xs" disabled={updateStatus.isPending} onClick={() => updateStatus.mutate({ id: quote.id, status: "declined" })}>
              <X className="h-3.5 w-3.5" /> Rechazada
            </Button>
          </div>
          <Button onClick={handleConvert} disabled={convert.isPending} className="w-full gap-2 rounded-xl h-12 text-sm font-semibold">
            <ArrowRightLeft className="h-4 w-4" /> {convert.isPending ? "Convirtiendo…" : "Convertir en factura"}
          </Button>
        </div>
      )}
    </div>
  );
}
