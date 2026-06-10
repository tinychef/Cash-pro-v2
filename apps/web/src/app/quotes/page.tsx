"use client";

import React, { useState } from "react";
import Link from "next/link";
import { currency, shortDate, type QuoteStatus } from "@cash-pro/core";
import { useQuotes, useConvertQuote } from "@/lib/queries";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, FileCheck, ArrowRightLeft } from "lucide-react";
import { LoadingState, ErrorState, EmptyState } from "@/components/states";

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

type StatusFilter = "all" | QuoteStatus;

export default function QuotesPage() {
  const { data: quotes = [], isLoading, error } = useQuotes();
  const convert = useConvertQuote();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const filtered = quotes
    .filter((q) => {
      if (statusFilter !== "all" && q.status !== statusFilter) return false;
      const s = search.toLowerCase();
      return q.number.toLowerCase().includes(s) || q.clientName.toLowerCase().includes(s);
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const filters: { key: StatusFilter; label: string }[] = [
    { key: "all", label: "Todas" },
    { key: "draft", label: "Borradores" },
    { key: "sent", label: "Enviadas" },
    { key: "accepted", label: "Aceptadas" },
    { key: "converted", label: "Convertidas" },
  ];

  return (
    <div className="p-4 lg:p-6 space-y-5 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Cotizaciones</h2>
          <p className="text-sm text-muted-foreground mt-1">{quotes.length} cotizaciones · conviértelas en factura con un clic</p>
        </div>
        <Link href="/quotes/new">
          <Button className="gap-2 rounded-xl shadow-sm">
            <Plus className="h-4 w-4" /> Nueva Cotización
          </Button>
        </Link>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar por número o cliente..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 rounded-xl border-0 bg-secondary" />
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setStatusFilter(f.key)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              statusFilter === f.key ? "bg-primary text-primary-foreground shadow-sm" : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState error={error as Error} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={FileCheck} title="No hay cotizaciones" description="Crea tu primera cotización; cuando el cliente acepte, conviértela en factura." />
      ) : (
        <div className="space-y-3">
          {filtered.map((q) => (
            <Card key={q.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-bold">{q.number}</p>
                      <Badge variant="secondary" className={`text-[10px] px-2 py-0.5 ${statusClass[q.status]}`}>{statusLabel[q.status]}</Badge>
                    </div>
                    <p className="text-sm text-foreground">{q.clientName}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{shortDate(q.createdAt.slice(0, 10))}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">{currency(q.total)}</p>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-border flex gap-2">
                  <Link href={`/quotes/${q.id}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full gap-2 rounded-xl text-xs">
                      Ver detalle
                    </Button>
                  </Link>
                  {q.status !== "converted" ? (
                    <Button
                      size="sm"
                      className="flex-1 gap-2 rounded-xl text-xs"
                      disabled={convert.isPending}
                      onClick={() => convert.mutate(q.id)}
                    >
                      <ArrowRightLeft className="h-3.5 w-3.5" /> Convertir en factura
                    </Button>
                  ) : (
                    <Badge variant="secondary" className="flex-1 justify-center rounded-xl text-xs py-2">Facturada</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
