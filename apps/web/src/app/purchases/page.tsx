"use client";

import React, { useMemo, useState } from "react";
import { currency, shortDate, purchaseTotal, totalPayables, type PaymentMethod } from "@cash-pro/core";
import {
  usePurchases,
  useSuppliers,
  useProducts,
  useSupplierPayments,
  useCreatePurchase,
  useCreateSupplierPayment,
} from "@/lib/queries";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Trash2, ShoppingBag, CreditCard, AlertCircle } from "lucide-react";
import { LoadingState, ErrorState, EmptyState } from "@/components/states";

const statusColor: Record<string, string> = { received: "status-pending", paid: "status-paid", partial: "status-partial" };
const statusLabel: Record<string, string> = { received: "Recibida", paid: "Pagada", partial: "Parcial" };

interface Line {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitCost: number;
}

export default function PurchasesPage() {
  const { data: purchases = [], isLoading, error } = usePurchases();
  const { data: suppliers = [] } = useSuppliers();
  const { data: products = [] } = useProducts();
  const { data: supplierPayments = [] } = useSupplierPayments();
  const createPurchase = useCreatePurchase();
  const createPayment = useCreateSupplierPayment();

  const [open, setOpen] = useState(false);
  const [supplierId, setSupplierId] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [notes, setNotes] = useState("");

  const [payOpen, setPayOpen] = useState(false);
  const [payPoId, setPayPoId] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState(0);
  const [payMethod, setPayMethod] = useState<PaymentMethod>("transfer");

  const payables = totalPayables(purchases, supplierPayments);

  const balanceOf = (poId: string, total: number) =>
    total - supplierPayments.filter((sp) => sp.purchaseOrderId === poId).reduce((s, sp) => s + sp.amount, 0);

  const searchResults = useMemo(() => {
    if (!productSearch) return [];
    const q = productSearch.toLowerCase();
    return products.filter((p) => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q)).slice(0, 5);
  }, [productSearch, products]);

  const addLine = (productId: string) => {
    const existing = lines.find((l) => l.productId === productId);
    if (existing) {
      setLines(lines.map((l) => (l.productId === productId ? { ...l, quantity: l.quantity + 1 } : l)));
    } else {
      const p = products.find((x) => x.id === productId);
      if (!p) return;
      setLines([...lines, { id: Math.random().toString(36).slice(2, 10), productId: p.id, productName: p.name, quantity: 1, unitCost: p.purchasePrice }]);
    }
    setProductSearch("");
  };
  const total = purchaseTotal(lines);
  const selectedSupplier = suppliers.find((s) => s.id === supplierId);

  const resetForm = () => {
    setSupplierId("");
    setLines([]);
    setNotes("");
    setProductSearch("");
  };

  const save = async () => {
    if (!supplierId || lines.length === 0) return;
    try {
      await createPurchase.mutateAsync({
        supplierId,
        supplierName: selectedSupplier?.name ?? "Proveedor",
        items: lines.map(({ productId, productName, quantity, unitCost }) => ({ productId, productName, quantity, unitCost })),
        notes,
      });
      resetForm();
      setOpen(false);
    } catch {
      /* toast handled */
    }
  };

  const openPay = (poId: string, balance: number) => {
    setPayPoId(poId);
    setPayAmount(balance);
    setPayMethod("transfer");
    setPayOpen(true);
  };
  const handlePay = async () => {
    if (!payPoId || payAmount <= 0) return;
    try {
      await createPayment.mutateAsync({ purchaseOrderId: payPoId, amount: payAmount, method: payMethod, date: new Date().toISOString().slice(0, 10) });
      setPayOpen(false);
    } catch {
      /* toast handled */
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-5 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Compras</h2>
          <p className="text-sm text-muted-foreground mt-1">{purchases.length} órdenes de compra</p>
        </div>
        <Button onClick={() => setOpen(true)} className="gap-2 rounded-xl shadow-sm" disabled={suppliers.length === 0}>
          <Plus className="h-4 w-4" /> Nueva
        </Button>
      </div>

      <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-500/10 to-indigo-500/5">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium">Total Cuentas por Pagar</p>
            <p className="text-2xl font-bold mt-1">{currency(payables)}</p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-500/10">
            <AlertCircle className="h-6 w-6 text-purple-500" />
          </div>
        </CardContent>
      </Card>

      {suppliers.length === 0 && (
        <p className="text-xs text-muted-foreground">Agrega un proveedor primero para registrar compras.</p>
      )}

      {isLoading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState error={error as Error} />
      ) : purchases.length === 0 ? (
        <EmptyState icon={ShoppingBag} title="Sin compras" description="Registra compras a proveedores; el stock se incrementa automáticamente." />
      ) : (
        <div className="space-y-3">
          {purchases.map((po) => {
            const balance = balanceOf(po.id, po.total);
            return (
              <Card key={po.id} className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-bold">{po.number}</p>
                        <Badge variant="secondary" className={`text-[10px] px-2 py-0.5 ${statusColor[po.status]}`}>{statusLabel[po.status]}</Badge>
                      </div>
                      <p className="text-sm">{po.supplierName}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{shortDate(po.createdAt.slice(0, 10))}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold">{currency(po.total)}</p>
                      {balance > 0 && <p className="text-xs text-purple-500 font-medium mt-0.5">Por pagar: {currency(balance)}</p>}
                    </div>
                  </div>
                  {po.status !== "paid" && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <Button variant="outline" size="sm" className="w-full gap-2 rounded-xl text-xs" onClick={() => openPay(po.id, balance)}>
                        <CreditCard className="h-3.5 w-3.5" /> Registrar Pago
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* New purchase dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nueva Compra</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div>
              <Label className="text-xs">Proveedor</Label>
              <Select value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger><SelectValue placeholder="Seleccionar proveedor..." /></SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Agregar productos</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar producto..." value={productSearch} onChange={(e) => setProductSearch(e.target.value)} className="pl-9 rounded-xl border-0 bg-secondary" />
              </div>
              {searchResults.length > 0 && (
                <div className="mt-2 space-y-1 border border-border rounded-xl overflow-hidden">
                  {searchResults.map((p) => (
                    <button key={p.id} className="w-full flex items-center justify-between px-3 py-2 hover:bg-secondary text-left" onClick={() => addLine(p.id)}>
                      <span className="text-sm">{p.name}</span>
                      <span className="text-xs text-muted-foreground">Costo {currency(p.purchasePrice)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {lines.length > 0 && (
              <div className="space-y-2">
                {lines.map((l) => (
                  <div key={l.id} className="flex items-center gap-2 bg-secondary/50 rounded-xl p-2">
                    <span className="text-sm flex-1 truncate">{l.productName}</span>
                    <Input type="number" value={l.quantity} onChange={(e) => setLines(lines.map((x) => (x.id === l.id ? { ...x, quantity: +e.target.value } : x)))} className="h-8 w-16" />
                    <span className="text-xs text-muted-foreground">×</span>
                    <Input type="number" value={l.unitCost} onChange={(e) => setLines(lines.map((x) => (x.id === l.id ? { ...x, unitCost: +e.target.value } : x)))} className="h-8 w-20" />
                    <button className="h-8 w-8 flex items-center justify-center text-muted-foreground hover:text-destructive" onClick={() => setLines(lines.filter((x) => x.id !== l.id))}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                <div className="flex justify-between font-bold text-sm pt-1">
                  <span>Total</span>
                  <span className="text-primary">{currency(total)}</span>
                </div>
              </div>
            )}
            <Input placeholder="Notas (opcional)" value={notes} onChange={(e) => setNotes(e.target.value)} className="rounded-xl border-0 bg-secondary" />
            <Button onClick={save} disabled={!supplierId || lines.length === 0 || createPurchase.isPending} className="w-full rounded-xl mt-1">
              {createPurchase.isPending ? "Guardando…" : "Registrar Compra"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Supplier payment dialog */}
      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Pago a Proveedor</DialogTitle>
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
