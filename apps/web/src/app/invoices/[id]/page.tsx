"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { currency, pct, fullDate, invoiceBalance, type PaymentMethod } from "@cash-pro/core";
import { useInvoice, usePayments, useCreatePayment } from "@/lib/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, CreditCard, Download } from "lucide-react";
import { LoadingState, ErrorState } from "@/components/states";
import { toast } from "sonner";

const statusColor: Record<string, string> = { paid: "status-paid", pending: "status-pending", partial: "status-partial", overdue: "status-overdue" };
const statusLabel: Record<string, string> = { paid: "Pagada", pending: "Pendiente", partial: "Parcial", overdue: "Vencida" };
const methodLabel: Record<string, string> = { cash: "Efectivo", card: "Tarjeta", transfer: "Transferencia", other: "Otro" };

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === "string" ? params.id : Array.isArray(params.id) ? params.id[0] : undefined;

  const { data: invoice, isLoading, error } = useInvoice(id);
  const { data: payments = [] } = usePayments();
  const createPayment = useCreatePayment();

  const [payOpen, setPayOpen] = useState(false);
  const [payAmount, setPayAmount] = useState(0);
  const [payMethod, setPayMethod] = useState<PaymentMethod>("cash");
  const [downloading, setDownloading] = useState(false);

  if (isLoading) return <LoadingState />;
  if (error || !invoice) return <ErrorState error={(error as Error) ?? new Error("Factura no encontrada")} />;

  const invPayments = payments.filter((p) => p.invoiceId === invoice.id);
  const balance = invoiceBalance(invoice, payments);
  const grossProfit = invoice.subtotal - invoice.costTotal;
  const margin = invoice.subtotal > 0 ? grossProfit / invoice.subtotal : 0;

  const openPay = () => {
    setPayAmount(balance);
    setPayMethod("cash");
    setPayOpen(true);
  };
  const handlePay = async () => {
    if (payAmount <= 0) return;
    try {
      await createPayment.mutateAsync({ invoiceId: invoice.id, amount: payAmount, method: payMethod, date: new Date().toISOString().slice(0, 10), notes: "" });
      setPayOpen(false);
    } catch {
      /* toast handled */
    }
  };
  const handleDownload = async () => {
    setDownloading(true);
    try {
      const { downloadInvoicePdf } = await import("@/lib/invoice-pdf");
      await downloadInvoicePdf(invoice.id);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-5 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" className="gap-2 -ml-2" onClick={() => router.push("/invoices")}>
          <ArrowLeft className="h-4 w-4" /> Facturas
        </Button>
        <Button variant="outline" size="sm" className="gap-2 rounded-xl" disabled={downloading} onClick={handleDownload}>
          <Download className="h-4 w-4" /> {downloading ? "Generando…" : "PDF"}
        </Button>
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold tracking-tight">{invoice.number}</h2>
                <Badge variant="secondary" className={`text-[10px] px-2 py-0.5 ${statusColor[invoice.status]}`}>{statusLabel[invoice.status]}</Badge>
              </div>
              <p className="text-sm text-foreground mt-2">{invoice.clientName}</p>
              <p className="text-xs text-muted-foreground">Emitida: {fullDate(invoice.createdAt.slice(0, 10))}</p>
              {invoice.dueDate && <p className="text-xs text-muted-foreground">Vence: {fullDate(invoice.dueDate.slice(0, 10))}</p>}
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-primary">{currency(invoice.total)}</p>
              {balance > 0 && <p className="text-xs text-amber-500 font-medium mt-1">Saldo: {currency(balance)}</p>}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Productos</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-2">
          {invoice.items.map((it) => (
            <div key={it.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <div>
                <p className="text-sm font-medium">{it.productName}</p>
                <p className="text-xs text-muted-foreground">{currency(it.unitPrice)} × {it.quantity}{(it.discountRate ?? 0) > 0 ? ` · −${Math.round((it.discountRate ?? 0) * 100)}%` : ""}</p>
              </div>
              <span className="text-sm font-semibold">{currency(it.unitPrice * it.quantity * (1 - (it.discountRate ?? 0)))}</span>
            </div>
          ))}
          <div className="pt-3 space-y-1">
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span>{currency(invoice.subtotal)}</span></div>
            {(invoice.discountTotal ?? 0) > 0 && (<div className="flex justify-between text-sm"><span className="text-muted-foreground">Descuento</span><span className="text-emerald-600">−{currency(invoice.discountTotal ?? 0)}</span></div>)}
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Impuesto</span><span>{currency(invoice.taxTotal)}</span></div>
            <div className="flex justify-between text-base font-bold pt-1 border-t border-border"><span>Total</span><span className="text-primary">{currency(invoice.total)}</span></div>
            <div className="flex justify-between text-xs pt-2"><span className="text-muted-foreground">Margen</span><span className="font-semibold text-blue-500">{pct(margin)}</span></div>
            <div className="flex justify-between text-xs"><span className="text-muted-foreground">Utilidad</span><span className="font-semibold text-emerald-500">{currency(grossProfit)}</span></div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2 flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold">Pagos</CardTitle>
          {invoice.status !== "paid" && (
            <Button size="sm" className="gap-2 rounded-xl" onClick={openPay}>
              <CreditCard className="h-3.5 w-3.5" /> Registrar Pago
            </Button>
          )}
        </CardHeader>
        <CardContent className="pt-0 space-y-2">
          {invPayments.length === 0 && <p className="text-xs text-muted-foreground py-2">Sin pagos registrados</p>}
          {invPayments.map((p) => (
            <div key={p.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <div>
                <p className="text-sm font-medium">{methodLabel[p.method]}</p>
                <p className="text-xs text-muted-foreground">{fullDate(p.date.slice(0, 10))}</p>
              </div>
              <span className="text-sm font-semibold text-emerald-500">{currency(p.amount)}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={payOpen} onOpenChange={setPayOpen}>
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
                <SelectTrigger><SelectValue /></SelectTrigger>
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
    </div>
  );
}
