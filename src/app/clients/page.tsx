"use client";

import React, { useState } from "react";
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
    Search,
    Plus,
    Users,
    Phone,
    Mail,
    Pencil,
    Trash2,
    AlertCircle,
} from "lucide-react";
import type { Client } from "@/lib/types";

const emptyClient = {
    name: "",
    email: "",
    phone: "",
    address: "",
    notes: "",
};

export default function ClientsPage() {
    const { clients, addClient, updateClient, deleteClient, invoices, payments } =
        useStore();
    const [search, setSearch] = useState("");
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [form, setForm] = useState(emptyClient);

    // Total receivables
    const totalReceivables = invoices
        .filter((i) => i.status !== "paid")
        .reduce((sum, inv) => {
            const paid = payments
                .filter((p) => p.invoiceId === inv.id)
                .reduce((s, p) => s + p.amount, 0);
            return sum + (inv.total - paid);
        }, 0);

    // Per-client balance
    const clientBalance = (clientId: string) => {
        return invoices
            .filter((i) => i.clientId === clientId && i.status !== "paid")
            .reduce((sum, inv) => {
                const paid = payments
                    .filter((p) => p.invoiceId === inv.id)
                    .reduce((s, p) => s + p.amount, 0);
                return sum + (inv.total - paid);
            }, 0);
    };

    const clientInvoiceCount = (clientId: string) =>
        invoices.filter((i) => i.clientId === clientId).length;

    const filtered = clients.filter((c) => {
        const q = search.toLowerCase();
        return (
            c.name.toLowerCase().includes(q) ||
            c.email.toLowerCase().includes(q) ||
            c.phone.toLowerCase().includes(q)
        );
    });

    const openNew = () => {
        setEditId(null);
        setForm(emptyClient);
        setDialogOpen(true);
    };

    const openEdit = (c: Client) => {
        setEditId(c.id);
        setForm({
            name: c.name,
            email: c.email,
            phone: c.phone,
            address: c.address,
            notes: c.notes,
        });
        setDialogOpen(true);
    };

    const handleSave = () => {
        if (!form.name) return;
        if (editId) {
            updateClient(editId, form);
        } else {
            addClient(form);
        }
        setDialogOpen(false);
    };

    return (
        <div className="p-4 lg:p-6 space-y-5 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Clientes</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        {clients.length} clientes registrados
                    </p>
                </div>
                <Button onClick={openNew} className="gap-2 rounded-xl shadow-sm">
                    <Plus className="h-4 w-4" /> Nuevo
                </Button>
            </div>

            {/* Receivables Card */}
            <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-500/10 to-orange-500/5">
                <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs text-muted-foreground font-medium">Total Cuentas por Cobrar</p>
                            <p className="text-2xl font-bold mt-1">{currency(totalReceivables)}</p>
                        </div>
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10">
                            <AlertCircle className="h-6 w-6 text-amber-500" />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Buscar clientes..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 rounded-xl border-0 bg-secondary"
                />
            </div>

            {/* Client Cards */}
            <div className="space-y-3">
                {filtered.map((c) => {
                    const balance = clientBalance(c.id);
                    const count = clientInvoiceCount(c.id);
                    const hasOverdue = invoices.some(
                        (i) => i.clientId === c.id && i.status === "overdue"
                    );
                    return (
                        <Card
                            key={c.id}
                            className="border-0 shadow-sm hover:shadow-md transition-shadow group"
                        >
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm">
                                            {c.name
                                                .split(" ")
                                                .map((n) => n[0])
                                                .join("")
                                                .slice(0, 2)}
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold">{c.name}</p>
                                            <div className="flex items-center gap-3 mt-1">
                                                {c.phone && (
                                                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                                        <Phone className="h-3 w-3" /> {c.phone}
                                                    </span>
                                                )}
                                                {c.email && (
                                                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                                        <Mail className="h-3 w-3" /> {c.email}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <div className="text-right mr-2">
                                            {balance > 0 ? (
                                                <>
                                                    <p className={`text-sm font-bold ${hasOverdue ? "text-red-500" : "text-amber-500"}`}>
                                                        {currency(balance)}
                                                    </p>
                                                    <Badge
                                                        variant="secondary"
                                                        className={`text-[10px] ${hasOverdue ? "status-overdue" : "status-partial"}`}
                                                    >
                                                        {hasOverdue ? "Vencido" : "Pendiente"}
                                                    </Badge>
                                                </>
                                            ) : (
                                                <Badge variant="secondary" className="status-paid text-[10px]">
                                                    Al día
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8"
                                                onClick={() => openEdit(c)}
                                            >
                                                <Pencil className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-destructive"
                                                onClick={() => deleteClient(c.id)}
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border text-xs text-muted-foreground">
                                    <span>{count} facturas</span>
                                    <span>Desde {shortDate(c.createdAt)}</span>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {filtered.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No se encontraron clientes</p>
                </div>
            )}

            {/* Add / Edit Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{editId ? "Editar Cliente" : "Nuevo Cliente"}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-3 py-2">
                        <div>
                            <Label className="text-xs">Nombre *</Label>
                            <Input
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                placeholder="Nombre completo"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label className="text-xs">Email</Label>
                                <Input
                                    value={form.email}
                                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                                    placeholder="email@ejemplo.com"
                                />
                            </div>
                            <div>
                                <Label className="text-xs">Teléfono</Label>
                                <Input
                                    value={form.phone}
                                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                    placeholder="+58 412..."
                                />
                            </div>
                        </div>
                        <div>
                            <Label className="text-xs">Dirección</Label>
                            <Input
                                value={form.address}
                                onChange={(e) => setForm({ ...form, address: e.target.value })}
                                placeholder="Dirección"
                            />
                        </div>
                        <div>
                            <Label className="text-xs">Notas</Label>
                            <Input
                                value={form.notes}
                                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                                placeholder="Notas internas"
                            />
                        </div>
                        <Button onClick={handleSave} className="w-full rounded-xl mt-2">
                            {editId ? "Guardar Cambios" : "Agregar Cliente"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
