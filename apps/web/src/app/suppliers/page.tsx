"use client";

import React, { useState } from "react";
import { shortDate, type Supplier } from "@cash-pro/core";
import {
  useSuppliers,
  useCreateSupplier,
  useUpdateSupplier,
  useDeleteSupplier,
} from "@/lib/queries";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Plus, Truck, Phone, Mail, Pencil, Trash2 } from "lucide-react";
import { LoadingState, ErrorState, EmptyState } from "@/components/states";

const empty = { name: "", email: "", phone: "", address: "", notes: "" };

export default function SuppliersPage() {
  const { data: suppliers = [], isLoading, error } = useSuppliers();
  const create = useCreateSupplier();
  const update = useUpdateSupplier();
  const remove = useDeleteSupplier();

  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(empty);

  const filtered = suppliers.filter((s) => {
    const q = search.toLowerCase();
    return s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q) || s.phone.toLowerCase().includes(q);
  });

  const openNew = () => {
    setEditId(null);
    setForm(empty);
    setDialogOpen(true);
  };
  const openEdit = (s: Supplier) => {
    setEditId(s.id);
    setForm({ name: s.name, email: s.email, phone: s.phone, address: s.address, notes: s.notes });
    setDialogOpen(true);
  };
  const handleSave = async () => {
    if (!form.name) return;
    try {
      if (editId) await update.mutateAsync({ id: editId, ...form });
      else await create.mutateAsync(form);
      setDialogOpen(false);
    } catch {
      /* toast handled */
    }
  };
  const saving = create.isPending || update.isPending;

  return (
    <div className="p-4 lg:p-6 space-y-5 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Proveedores</h2>
          <p className="text-sm text-muted-foreground mt-1">{suppliers.length} proveedores registrados</p>
        </div>
        <Button onClick={openNew} className="gap-2 rounded-xl shadow-sm">
          <Plus className="h-4 w-4" /> Nuevo
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar proveedores..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 rounded-xl border-0 bg-secondary" />
      </div>

      {isLoading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState error={error as Error} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Truck} title="Sin proveedores" description="Agrega proveedores para llevar el control de tus compras." />
      ) : (
        <div className="space-y-3">
          {filtered.map((s) => (
            <Card key={s.id} className="border-0 shadow-sm hover:shadow-md transition-shadow group">
              <CardContent className="p-4 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Truck className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{s.name}</p>
                    <div className="flex items-center gap-3 mt-1">
                      {s.phone && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Phone className="h-3 w-3" /> {s.phone}
                        </span>
                      )}
                      {s.email && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Mail className="h-3 w-3" /> {s.email}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">Desde {shortDate(s.createdAt.slice(0, 10))}</p>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(s)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => remove.mutate(s.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editId ? "Editar Proveedor" : "Nuevo Proveedor"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div>
              <Label className="text-xs">Nombre *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nombre del proveedor" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Email</Label>
                <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@ejemplo.com" />
              </div>
              <div>
                <Label className="text-xs">Teléfono</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+58 412..." />
              </div>
            </div>
            <div>
              <Label className="text-xs">Dirección</Label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Dirección" />
            </div>
            <div>
              <Label className="text-xs">Notas</Label>
              <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Términos de pago, etc." />
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full rounded-xl mt-2">
              {saving ? "Guardando…" : editId ? "Guardar Cambios" : "Agregar Proveedor"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
