"use client";

import React, { useState } from "react";
import { currency, shortDate } from "@cash-pro/core";
import { useExpenses, useCreateExpense, useDeleteExpense } from "@/lib/queries";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Wallet, TrendingDown } from "lucide-react";
import { LoadingState, ErrorState, EmptyState } from "@/components/states";

const CATEGORIES = ["Alquiler", "Servicios", "Inventario", "Marketing", "Nómina", "Transporte", "Otros"];

const emptyExpense = {
  description: "",
  amount: 0,
  category: "Otros",
  date: new Date().toISOString().slice(0, 10),
  notes: "",
};

export default function ExpensesPage() {
  const { data: expenses = [], isLoading, error } = useExpenses();
  const createExpense = useCreateExpense();
  const deleteExpense = useDeleteExpense();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyExpense);

  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const thisMonth = expenses
    .filter((e) => e.date.slice(0, 7) === new Date().toISOString().slice(0, 7))
    .reduce((s, e) => s + e.amount, 0);

  const handleSave = async () => {
    if (!form.description || form.amount <= 0) return;
    try {
      await createExpense.mutateAsync(form);
      setForm(emptyExpense);
      setDialogOpen(false);
    } catch {
      /* toast handled */
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-5 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Gastos</h2>
          <p className="text-sm text-muted-foreground mt-1">{expenses.length} gastos registrados</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-2 rounded-xl shadow-sm">
          <Plus className="h-4 w-4" /> Nuevo
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-red-500/10 to-orange-500/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Total gastado</p>
                <p className="text-2xl font-bold mt-1 text-red-500">{currency(total)}</p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-500/10">
                <TrendingDown className="h-5 w-5 text-red-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Este mes</p>
                <p className="text-2xl font-bold mt-1">{currency(thisMonth)}</p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary">
                <Wallet className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState error={error as Error} />
      ) : expenses.length === 0 ? (
        <EmptyState icon={Wallet} title="Sin gastos registrados" description="Registra tus gastos operativos para ver tu utilidad neta real." />
      ) : (
        <div className="space-y-2">
          {[...expenses]
            .sort((a, b) => b.date.localeCompare(a.date))
            .map((e) => (
              <Card key={e.id} className="border-0 shadow-sm group">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{e.description}</p>
                    <p className="text-xs text-muted-foreground">{e.category} · {shortDate(e.date.slice(0, 10))}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-red-500">-{currency(e.amount)}</span>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => deleteExpense.mutate(e.id)}>
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
            <DialogTitle>Nuevo Gasto</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div>
              <Label className="text-xs">Descripción</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Ej. Alquiler local" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Monto</Label>
                <Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: +e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Fecha</Label>
                <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
            </div>
            <div>
              <Label className="text-xs">Categoría</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleSave} disabled={createExpense.isPending} className="w-full rounded-xl mt-2">
              {createExpense.isPending ? "Guardando…" : "Registrar Gasto"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
