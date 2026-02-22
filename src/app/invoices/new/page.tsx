"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { currency, pct } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
    Minus,
    Trash2,
    UserPlus,
    ShoppingCart,
    Send,
    Save,
    Printer,
} from "lucide-react";
import type { InvoiceItem, InvoiceStatus } from "@/lib/types";

export default function NewInvoicePage() {
    const router = useRouter();
    const { products, clients, addClient, addInvoice } = useStore();

    // Client
    const [clientId, setClientId] = useState("");
    const [quickClientOpen, setQuickClientOpen] = useState(false);
    const [quickClientName, setQuickClientName] = useState("");
    const [quickClientPhone, setQuickClientPhone] = useState("");

    // Products search
    const [productSearch, setProductSearch] = useState("");
    const [items, setItems] = useState<InvoiceItem[]>([]);

    // Notes
    const [notes, setNotes] = useState("");

    // Search results
    const searchResults = useMemo(() => {
        if (!productSearch) return [];
        const q = productSearch.toLowerCase();
        return products
            .filter(
                (p) =>
                    p.active &&
                    (p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q))
            )
            .slice(0, 5);
    }, [productSearch, products]);

    const addItem = (productId: string) => {
        const existing = items.find((i) => i.productId === productId);
        if (existing) {
            setItems(
                items.map((i) =>
                    i.productId === productId
                        ? { ...i, quantity: i.quantity + 1 }
                        : i
                )
            );
        } else {
            const p = products.find((x) => x.id === productId);
            if (!p) return;
            setItems([
                ...items,
                {
                    id: Math.random().toString(36).slice(2, 10),
                    productId: p.id,
                    productName: p.name,
                    quantity: 1,
                    unitPrice: p.salePrice,
                    costPrice: p.purchasePrice,
                    taxRate: p.taxRate,
                },
            ]);
        }
        setProductSearch("");
    };

    const updateQty = (itemId: string, delta: number) => {
        setItems(
            items
                .map((i) =>
                    i.id === itemId ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i
                )
                .filter((i) => i.quantity > 0)
        );
    };

    const removeItem = (itemId: string) => {
        setItems(items.filter((i) => i.id !== itemId));
    };

    // Calculations
    const subtotal = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
    const taxTotal = items.reduce(
        (s, i) => s + i.unitPrice * i.quantity * i.taxRate,
        0
    );
    const total = subtotal + taxTotal;
    const costTotal = items.reduce((s, i) => s + i.costPrice * i.quantity, 0);
    const grossProfit = subtotal - costTotal;
    const marginPct = subtotal > 0 ? grossProfit / subtotal : 0;

    const handleQuickClient = () => {
        if (!quickClientName) return;
        addClient({
            name: quickClientName,
            phone: quickClientPhone,
            email: "",
            address: "",
            notes: "Creado desde factura",
        });
        // Select last client
        const store = useStore.getState();
        const last = store.clients[store.clients.length - 1];
        if (last) setClientId(last.id);
        setQuickClientOpen(false);
        setQuickClientName("");
        setQuickClientPhone("");
    };

    const selectedClient = clients.find((c) => c.id === clientId);

    const handleSave = (status: InvoiceStatus = "pending") => {
        if (items.length === 0) return;
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 15);
        addInvoice({
            clientId: clientId || "",
            clientName: selectedClient?.name || "Sin cliente",
            items,
            subtotal,
            taxTotal,
            total,
            costTotal,
            status,
            dueDate: dueDate.toISOString().slice(0, 10),
            notes,
        });
        router.push("/invoices");
    };

    return (
        <div className="p-4 lg:p-6 space-y-5 max-w-3xl mx-auto">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold tracking-tight">Nueva Factura</h2>
                <p className="text-sm text-muted-foreground mt-1">
                    Crea una factura en segundos
                </p>
            </div>

            {/* Client Selector */}
            <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                    <Label className="text-xs font-medium text-muted-foreground mb-2 block">
                        Cliente
                    </Label>
                    <div className="flex gap-2">
                        <Select value={clientId} onValueChange={setClientId}>
                            <SelectTrigger className="flex-1 rounded-xl">
                                <SelectValue placeholder="Seleccionar cliente..." />
                            </SelectTrigger>
                            <SelectContent>
                                {clients.map((c) => (
                                    <SelectItem key={c.id} value={c.id}>
                                        {c.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-10 w-10 rounded-xl shrink-0"
                            onClick={() => setQuickClientOpen(true)}
                        >
                            <UserPlus className="h-4 w-4" />
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Product Search */}
            <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                    <Label className="text-xs font-medium text-muted-foreground mb-2 block">
                        Agregar productos
                    </Label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por nombre o código..."
                            value={productSearch}
                            onChange={(e) => setProductSearch(e.target.value)}
                            className="pl-9 rounded-xl border-0 bg-secondary"
                        />
                    </div>
                    {searchResults.length > 0 && (
                        <div className="mt-2 space-y-1 border border-border rounded-xl overflow-hidden">
                            {searchResults.map((p) => (
                                <button
                                    key={p.id}
                                    className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-secondary transition-colors text-left"
                                    onClick={() => addItem(p.id)}
                                >
                                    <div>
                                        <p className="text-sm font-medium">{p.name}</p>
                                        <p className="text-xs text-muted-foreground">{p.code}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-semibold text-primary">
                                            {currency(p.salePrice)}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground">
                                            Stock: {p.stock}
                                        </p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Items List */}
            {items.length > 0 && (
                <Card className="border-0 shadow-sm">
                    <CardContent className="p-4 space-y-3">
                        <div className="flex items-center gap-2 mb-1">
                            <ShoppingCart className="h-4 w-4 text-primary" />
                            <span className="text-sm font-semibold">
                                {items.length} producto{items.length > 1 ? "s" : ""}
                            </span>
                        </div>
                        {items.map((item) => (
                            <div
                                key={item.id}
                                className="flex items-center justify-between p-3 rounded-xl bg-secondary/50"
                            >
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium truncate">
                                        {item.productName}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {currency(item.unitPrice)} × {item.quantity}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <div className="flex items-center gap-1 bg-background rounded-lg border border-border">
                                        <button
                                            className="h-8 w-8 flex items-center justify-center hover:bg-secondary rounded-l-lg transition-colors"
                                            onClick={() => updateQty(item.id, -1)}
                                        >
                                            <Minus className="h-3.5 w-3.5" />
                                        </button>
                                        <span className="w-8 text-center text-sm font-semibold">
                                            {item.quantity}
                                        </span>
                                        <button
                                            className="h-8 w-8 flex items-center justify-center hover:bg-secondary rounded-r-lg transition-colors"
                                            onClick={() => updateQty(item.id, 1)}
                                        >
                                            <Plus className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                    <span className="text-sm font-bold w-20 text-right">
                                        {currency(item.unitPrice * item.quantity)}
                                    </span>
                                    <button
                                        className="h-8 w-8 flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
                                        onClick={() => removeItem(item.id)}
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            {/* Notes */}
            <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                    <Label className="text-xs font-medium text-muted-foreground mb-2 block">
                        Notas (opcional)
                    </Label>
                    <Input
                        placeholder="Agregar notas a la factura..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="rounded-xl border-0 bg-secondary"
                    />
                </CardContent>
            </Card>

            {/* Summary */}
            <Card className="border-0 shadow-sm">
                <CardContent className="p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span>{currency(subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Impuesto</span>
                        <span>{currency(taxTotal)}</span>
                    </div>
                    <div className="flex justify-between text-base font-bold pt-2 border-t border-border">
                        <span>Total</span>
                        <span className="text-primary">{currency(total)}</span>
                    </div>
                    <div className="flex justify-between text-xs pt-2 border-t border-border">
                        <span className="text-muted-foreground">Margen</span>
                        <span className="font-semibold text-blue-500">{pct(marginPct)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Ganancia neta</span>
                        <span className="font-semibold text-emerald-500">
                            {currency(grossProfit)}
                        </span>
                    </div>
                </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="space-y-2 pb-8">
                <Button
                    onClick={() => handleSave("pending")}
                    className="w-full gap-2 rounded-xl h-12 text-sm font-semibold"
                    disabled={items.length === 0}
                >
                    <Send className="h-4 w-4" /> Guardar y Enviar
                </Button>
                <div className="grid grid-cols-2 gap-2">
                    <Button
                        variant="outline"
                        onClick={() => handleSave("pending")}
                        className="gap-2 rounded-xl h-10 text-xs"
                        disabled={items.length === 0}
                    >
                        <Save className="h-3.5 w-3.5" /> Borrador
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => handleSave("pending")}
                        className="gap-2 rounded-xl h-10 text-xs"
                        disabled={items.length === 0}
                    >
                        <Printer className="h-3.5 w-3.5" /> Imprimir
                    </Button>
                </div>
            </div>

            {/* Quick Add Client Dialog */}
            <Dialog open={quickClientOpen} onOpenChange={setQuickClientOpen}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Cliente Rápido</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-3 py-2">
                        <div>
                            <Label className="text-xs">Nombre *</Label>
                            <Input
                                value={quickClientName}
                                onChange={(e) => setQuickClientName(e.target.value)}
                                placeholder="Nombre del cliente"
                            />
                        </div>
                        <div>
                            <Label className="text-xs">Teléfono</Label>
                            <Input
                                value={quickClientPhone}
                                onChange={(e) => setQuickClientPhone(e.target.value)}
                                placeholder="+58 412..."
                            />
                        </div>
                        <Button onClick={handleQuickClient} className="w-full rounded-xl">
                            Agregar Cliente
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
