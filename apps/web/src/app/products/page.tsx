"use client";

import React, { useState } from "react";
import { useStore } from "@/lib/store";
import { currency, pct, margin } from "@/lib/format";
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
    Package,
    AlertTriangle,
    Pencil,
    Trash2,
} from "lucide-react";
import type { Product } from "@/lib/types";

type Filter = "all" | "active" | "low";

const emptyProduct = {
    code: "",
    name: "",
    description: "",
    unit: "und",
    purchasePrice: 0,
    salePrice: 0,
    taxRate: 0.16,
    stock: 0,
    minStock: 0,
    active: true,
};

export default function ProductsPage() {
    const { products, addProduct, updateProduct, deleteProduct } = useStore();
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState<Filter>("all");
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [form, setForm] = useState(emptyProduct);

    const filtered = products.filter((p) => {
        const q = search.toLowerCase();
        const matchesSearch =
            p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q);
        if (filter === "active") return matchesSearch && p.active;
        if (filter === "low") return matchesSearch && p.stock < p.minStock;
        return matchesSearch;
    });

    const openNew = () => {
        setEditId(null);
        setForm(emptyProduct);
        setDialogOpen(true);
    };

    const openEdit = (p: Product) => {
        setEditId(p.id);
        setForm({
            code: p.code,
            name: p.name,
            description: p.description,
            unit: p.unit,
            purchasePrice: p.purchasePrice,
            salePrice: p.salePrice,
            taxRate: p.taxRate,
            stock: p.stock,
            minStock: p.minStock,
            active: p.active,
        });
        setDialogOpen(true);
    };

    const handleSave = () => {
        if (!form.name || !form.code) return;
        if (editId) {
            updateProduct(editId, form);
        } else {
            addProduct(form);
        }
        setDialogOpen(false);
    };

    const filters: { key: Filter; label: string }[] = [
        { key: "all", label: "Todos" },
        { key: "active", label: "Activos" },
        { key: "low", label: "Stock Bajo" },
    ];

    const lowStockCount = products.filter((p) => p.stock < p.minStock).length;

    return (
        <div className="p-4 lg:p-6 space-y-5 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Productos</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        {products.length} productos · {lowStockCount > 0 && (
                            <span className="text-amber-500 font-medium">{lowStockCount} con stock bajo</span>
                        )}
                    </p>
                </div>
                <Button onClick={openNew} className="gap-2 rounded-xl shadow-sm">
                    <Plus className="h-4 w-4" /> Nuevo
                </Button>
            </div>

            {/* Search & Filters */}
            <div className="space-y-3">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por nombre o código..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9 rounded-xl border-0 bg-secondary"
                    />
                </div>
                <div className="flex gap-2">
                    {filters.map((f) => (
                        <button
                            key={f.key}
                            onClick={() => setFilter(f.key)}
                            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${filter === f.key
                                    ? "bg-primary text-primary-foreground shadow-sm"
                                    : "bg-secondary text-muted-foreground hover:text-foreground"
                                }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Product Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {filtered.map((p) => {
                    const m = margin(p.salePrice, p.purchasePrice);
                    const lowStock = p.stock < p.minStock;
                    return (
                        <Card
                            key={p.id}
                            className="border-0 shadow-sm hover:shadow-md transition-shadow group relative overflow-hidden"
                        >
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                                            <Package className="h-5 w-5 text-primary" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold">{p.name}</p>
                                            <p className="text-xs text-muted-foreground">{p.code}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(p)}>
                                            <Pencil className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteProduct(p.id)}>
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs">
                                    <div>
                                        <p className="text-muted-foreground">Costo</p>
                                        <p className="font-semibold">{currency(p.purchasePrice)}</p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground">Precio Venta</p>
                                        <p className="font-semibold text-primary">{currency(p.salePrice)}</p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground">Margen</p>
                                        <p className="font-semibold text-blue-500">{pct(m)}</p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground">Ganancia/u</p>
                                        <p className="font-semibold text-emerald-500">{currency(p.salePrice - p.purchasePrice)}</p>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-muted-foreground">Stock:</span>
                                        <span className={`text-sm font-bold ${lowStock ? "text-red-500" : "text-foreground"}`}>
                                            {p.stock}
                                        </span>
                                        {lowStock && (
                                            <Badge variant="secondary" className="status-overdue text-[10px] px-1.5 py-0 gap-1">
                                                <AlertTriangle className="h-3 w-3" /> Bajo
                                            </Badge>
                                        )}
                                    </div>
                                    <span className="text-[11px] text-muted-foreground">
                                        Mín: {p.minStock}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {filtered.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No se encontraron productos</p>
                </div>
            )}

            {/* Add / Edit Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{editId ? "Editar Producto" : "Nuevo Producto"}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-3 py-2">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label className="text-xs">Código</Label>
                                <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="SKU-001" />
                            </div>
                            <div>
                                <Label className="text-xs">Unidad</Label>
                                <Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="und" />
                            </div>
                        </div>
                        <div>
                            <Label className="text-xs">Nombre</Label>
                            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nombre del producto" />
                        </div>
                        <div>
                            <Label className="text-xs">Descripción</Label>
                            <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descripción" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label className="text-xs">Precio Compra</Label>
                                <Input type="number" value={form.purchasePrice} onChange={(e) => setForm({ ...form, purchasePrice: +e.target.value })} />
                            </div>
                            <div>
                                <Label className="text-xs">Precio Venta</Label>
                                <Input type="number" value={form.salePrice} onChange={(e) => setForm({ ...form, salePrice: +e.target.value })} />
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <Label className="text-xs">Impuesto %</Label>
                                <Input type="number" value={(form.taxRate * 100).toFixed(0)} onChange={(e) => setForm({ ...form, taxRate: +e.target.value / 100 })} />
                            </div>
                            <div>
                                <Label className="text-xs">Stock</Label>
                                <Input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: +e.target.value })} />
                            </div>
                            <div>
                                <Label className="text-xs">Stock Mín</Label>
                                <Input type="number" value={form.minStock} onChange={(e) => setForm({ ...form, minStock: +e.target.value })} />
                            </div>
                        </div>
                        {form.salePrice > 0 && (
                            <div className="rounded-lg bg-secondary p-3 flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">Margen calculado</span>
                                <span className="text-sm font-bold text-primary">
                                    {pct(margin(form.salePrice, form.purchasePrice))} · {currency(form.salePrice - form.purchasePrice)}/u
                                </span>
                            </div>
                        )}
                        <Button onClick={handleSave} className="w-full rounded-xl mt-2">
                            {editId ? "Guardar Cambios" : "Agregar Producto"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
