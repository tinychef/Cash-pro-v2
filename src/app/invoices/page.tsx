"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { currency, shortDate } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Search,
    Plus,
    FileText,
    CreditCard,
} from "lucide-react";
import type { InvoiceStatus, PaymentMethod } from "@/lib/types";

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
    const { invoices, payments, addPayment } = useStore();
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
    const [payDialogOpen, setPayDialogOpen] = useState(false);
    const [payInvoiceId, setPayInvoiceId] = useState<string | null>(null);
    const [payAmount, setPayAmount] = useState(0);
    const [payMethod, setPayMethod] = useState<PaymentMethod>("cash");

    const filtered = invoices
        .filter((inv) => {
            if (statusFilter !== "all" && inv.status !== statusFilter) return false;
            const q = search.toLowerCase();
            return (
                inv.number.toLowerCase().includes(q) ||
                inv.clientName.toLowerCase().includes(q)
            );
        })
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    const getBalance = (invoiceId: string) => {
        const inv = invoices.find((i) => i.id === invoiceId);
        if (!inv) return 0;
        const paid = payments
            .filter((p) => p.invoiceId === invoiceId)
            .reduce((s, p) => s + p.amount, 0);
        return inv.total - paid;
    };

    const openPayDialog = (invoiceId: string) => {
        setPayInvoiceId(invoiceId);
        setPayAmount(getBalance(invoiceId));
        setPayMethod("cash");
        setPayDialogOpen(true);
    };

    const handlePay = () => {
        if (!payInvoiceId || payAmount <= 0) return;
        addPayment({
            invoiceId: payInvoiceId,
            amount: payAmount,
            method: payMethod,
            date: new Date().toISOString().slice(0, 10),
            notes: "",
        });
        setPayDialogOpen(false);
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
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Facturas</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        {invoices.length} facturas registradas
                    </p>
                </div>
                <Link href="/invoices/new">
                    <Button className="gap-2 rounded-xl shadow-sm">
                        <Plus className="h-4 w-4" /> Nueva Factura
                    </Button>
                </Link>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Buscar por número o cliente..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 rounded-xl border-0 bg-secondary"
                />
            </div>

            {/* Status Filters */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
                {filters.map((f) => (
                    <button
                        key={f.key}
                        onClick={() => setStatusFilter(f.key)}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${statusFilter === f.key
                                ? "bg-primary text-primary-foreground shadow-sm"
                                : "bg-secondary text-muted-foreground hover:text-foreground"
                            }`}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {/* Invoice Cards */}
            <div className="space-y-3">
                {filtered.map((inv) => {
                    const balance = getBalance(inv.id);
                    return (
                        <Card
                            key={inv.id}
                            className="border-0 shadow-sm hover:shadow-md transition-shadow"
                        >
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <p className="text-sm font-bold">{inv.number}</p>
                                            <Badge
                                                variant="secondary"
                                                className={`text-[10px] px-2 py-0.5 ${statusColor[inv.status]}`}
                                            >
                                                {statusLabel[inv.status]}
                                            </Badge>
                                        </div>
                                        <p className="text-sm text-foreground">{inv.clientName}</p>
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            {shortDate(inv.createdAt)} · {inv.items.length} items
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-lg font-bold">{currency(inv.total)}</p>
                                        {balance > 0 && (
                                            <p className="text-xs text-amber-500 font-medium mt-0.5">
                                                Saldo: {currency(balance)}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {inv.status !== "paid" && (
                                    <div className="mt-3 pt-3 border-t border-border">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="w-full gap-2 rounded-xl text-xs"
                                            onClick={() => openPayDialog(inv.id)}
                                        >
                                            <CreditCard className="h-3.5 w-3.5" /> Registrar Pago
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {filtered.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No se encontraron facturas</p>
                </div>
            )}

            {/* Payment Dialog */}
            <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Registrar Pago</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-2">
                        <div>
                            <Label className="text-xs">Monto</Label>
                            <Input
                                type="number"
                                value={payAmount}
                                onChange={(e) => setPayAmount(+e.target.value)}
                                step={0.01}
                            />
                        </div>
                        <div>
                            <Label className="text-xs">Método de pago</Label>
                            <Select
                                value={payMethod}
                                onValueChange={(v) => setPayMethod(v as PaymentMethod)}
                            >
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
                        <Button onClick={handlePay} className="w-full rounded-xl">
                            Confirmar Pago
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
