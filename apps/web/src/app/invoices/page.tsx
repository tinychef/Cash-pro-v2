"use client";

import React, { useState } from "react";
import Link from "next/link";
import { currency, shortDate, invoiceBalance, type InvoiceStatus, type PaymentMethod } from "@cash-pro/core";
import { useInvoices, usePayments, useCreatePayment, useCustomers } from "@/lib/queries";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, FileText, CreditCard, Download, Link2, Mail, BellRing } from "lucide-react";
import { api } from "@/lib/api";
import { LoadingState, ErrorState, EmptyState } from "@/components/states";
import { toast } from "sonner";

const statusColor: Record<string, string> = {
  paid: "status-paid",
  pending: "status-pending",
  partial: "status-partial",
  overdue: "status-overdue",
};
const statusLabel: Record<string, string> = {
  paid: "Pagada",
  pending: "Pendiente",
  partial: "Parcial",
  overdue: "Vencida",
};

type StatusFilter = "all" | InvoiceStatus;

export default function InvoicesPage() {
  const { data: invoices = [], isLoading, error } = useInvoices();
  const { data: payments = [] } = usePayments();
  const { data: customers = [] } = useCustomers();
  const createPayment = useCreatePayment();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [payInvoiceId, setPayInvoiceId] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState(0);
  const [payMethod, setPayMethod] = useState<PaymentMethod>("cash");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [mailDialogOpen, setMailDialogOpen] = useState(false);
  const [mailInvoiceId, setMailInvoiceId] = useState<string | null>(null);
  const [mailTo, setMailTo] = useState("");
  const [mailSending, setMailSending] = useState(false);
  const [reminding, setReminding] = useState(false);

  const filtered = invoices
    .filter((inv) => {
      if (statusFilter !== "all" && inv.status !== statusFilter) return false;
      const q = search.toLowerCase();
      return inv.number.toLowerCase().includes(q) || inv.clientName.toLowerCase().includes(q);
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const getBalance = (invoiceId: string) => {
    const inv = invoices.find((i) => i.id === invoiceId);
    return inv ? invoiceBalance(inv, payments) : 0;
  };

  const openPayDialog = (invoiceId: string) => {
    setPayInvoiceId(invoiceId);
    setPayAmount(getBalance(invoiceId));
    setPayMethod("cash");
    setPayDialogOpen(true);
  };

  const handlePay = async () => {
    if (!payInvoiceId || payAmount <= 0) return;
    try {
      await createPayment.mutateAsync({
        invoiceId: payInvoiceId,
        amount: payAmount,
        method: payMethod,
        date: new Date().toISOString().slice(0, 10),
        notes: "",
      });
      setPayDialogOpen(false);
    } catch {
      /* toast handled */
    }
  };

  const handleShare = async (id: string) => {
    try {
      const { path } = await api.get<{ path: string }>(`/invoices/${id}/share`);
      const url = `${window.location.origin}${path}`;
      await navigator.clipboard.writeText(url);
      toast.success("Link público copiado — compártelo con tu cliente");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const openMailDialog = (invoiceId: string) => {
    const inv = invoices.find((i) => i.id === invoiceId);
    const client = customers.find((c) => c.id === inv?.clientId);
    setMailInvoiceId(invoiceId);
    setMailTo(client?.email ?? "");
    setMailDialogOpen(true);
  };

  const handleSendMail = async () => {
    if (!mailInvoiceId || !mailTo) return;
    setMailSending(true);
    try {
      await api.post(`/invoices/${mailInvoiceId}/send`, { to: mailTo });
      toast.success(`Factura enviada a ${mailTo}`);
      setMailDialogOpen(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setMailSending(false);
    }
  };

  const handleRemindOverdue = async () => {
    setReminding(true);
    try {
      const r = await api.post<{ sent: number; eligible: number }>("/invoices/remind-overdue", {});
      toast.success(`Recordatorios enviados: ${r.sent} de ${r.eligible}`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setReminding(false);
    }
  };

  const handleDownload = async (id: string) => {
    setDownloadingId(id);
    try {
      // Code-split: @react-pdf/renderer only loads when a PDF is requested.
      const { downloadInvoicePdf } = await import("@/lib/invoice-pdf");
      await downloadInvoicePdf(id);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setDownloadingId(null);
    }
  };

  const filters: { key: StatusFilter; label: string }[] = [
    { key: "all", label: "Todas" },
    { key: "pending", label: "Pendientes" },
    { key: "partial", label: "Parciales" },
    { key: "paid", label: "Pagadas" },
    { key: "overdue", label: "Vencidas" },
  ];

  return (
    <div className="p-4 lg:p-6 space-y-5 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Facturas</h2>
          <p className="text-sm text-muted-foreground mt-1">{invoices.length} facturas registradas</p>
        </div>
        <Link href="/invoices/new">
          <Button className="gap-2 rounded-xl shadow-sm">
            <Plus className="h-4 w-4" /> Nueva Factura
          </Button>
        </Link>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar por número o cliente..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 rounded-xl border-0 bg-secondary" />
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar items-center">
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
        {statusFilter === "overdue" && filtered.length > 0 && (
          <Button variant="outline" size="sm" className="rounded-full text-xs gap-1.5 ml-auto shrink-0" disabled={reminding} onClick={handleRemindOverdue}>
            <BellRing className="h-3.5 w-3.5" /> {reminding ? "Enviando…" : "Enviar recordatorios"}
          </Button>
        )}
      </div>

      {isLoading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState error={error as Error} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={FileText} title="No se encontraron facturas" description="Crea tu primera factura desde el botón Nueva Factura." />
      ) : (
        <div className="space-y-3">
          {filtered.map((inv) => {
            const balance = getBalance(inv.id);
            return (
              <Card key={inv.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-bold">{inv.number}</p>
                        <Badge variant="secondary" className={`text-[10px] px-2 py-0.5 ${statusColor[inv.status]}`}>{statusLabel[inv.status]}</Badge>
                      </div>
                      <p className="text-sm text-foreground">{inv.clientName}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{shortDate(inv.createdAt.slice(0, 10))}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold">{currency(inv.total)}</p>
                      {balance > 0 && <p className="text-xs text-amber-500 font-medium mt-0.5">Saldo: {currency(balance)}</p>}
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-border flex gap-2">
                    <Link href={`/invoices/${inv.id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full gap-2 rounded-xl text-xs">
                        Ver detalle
                      </Button>
                    </Link>
                    {inv.status !== "paid" && (
                      <Button variant="outline" size="sm" className="flex-1 gap-2 rounded-xl text-xs" onClick={() => openPayDialog(inv.id)}>
                        <CreditCard className="h-3.5 w-3.5" /> Registrar Pago
                      </Button>
                    )}
                    <Button variant="outline" size="sm" className="flex-1 gap-2 rounded-xl text-xs" disabled={downloadingId === inv.id} onClick={() => handleDownload(inv.id)}>
                      <Download className="h-3.5 w-3.5" /> {downloadingId === inv.id ? "Generando…" : "PDF"}
                    </Button>
                    <Button variant="outline" size="sm" className="gap-2 rounded-xl text-xs" onClick={() => handleShare(inv.id)} aria-label="Copiar link público">
                      <Link2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="outline" size="sm" className="gap-2 rounded-xl text-xs" onClick={() => openMailDialog(inv.id)} aria-label="Enviar por email">
                      <Mail className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Registrar Pago</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div>
              <Label className="text-xs">Monto</Label>
              <Input type="number" value={payAmount} onChange={(e) => setPayAmount(+e.target.value)} step={0.01} />
            </div>
            <div>
              <Label className="text-xs">Método de pago</Label>
              <Select value={payMethod} onValueChange={(v) => setPayMethod(v as PaymentMethod)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Efectivo</SelectItem>
                  <SelectItem value="card">Tarjeta</SelectItem>
                  <SelectItem value="transfer">Transferencia</SelectItem>
                  <SelectItem value="other">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handlePay} disabled={createPayment.isPending} className="w-full rounded-xl">
              {createPayment.isPending ? "Procesando…" : "Confirmar Pago"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={mailDialogOpen} onOpenChange={setMailDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Enviar factura por email</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div>
              <Label className="text-xs">Email del destinatario</Label>
              <Input type="email" value={mailTo} onChange={(e) => setMailTo(e.target.value)} placeholder="cliente@correo.com" />
              <p className="text-[11px] text-muted-foreground mt-1.5">
                Recibirá un link para ver la factura y descargar el PDF, con tu logo y colores.
              </p>
            </div>
            <Button onClick={handleSendMail} disabled={mailSending || !mailTo} className="w-full rounded-xl gap-2">
              <Mail className="h-4 w-4" /> {mailSending ? "Enviando…" : "Enviar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
