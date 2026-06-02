"use client";

import React, { useEffect, useState } from "react";
import { useSettings, useUpdateSettings } from "@/lib/queries";
import { resetCompany } from "@/lib/company";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LoadingState } from "@/components/states";
import { Building2, Coins, RotateCcw } from "lucide-react";

const CURRENCIES = ["USD", "COP", "VES", "MXN", "EUR", "PEN", "ARS", "CLP"];

export default function SettingsPage() {
  const { data, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();

  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [taxPct, setTaxPct] = useState(16);

  useEffect(() => {
    if (data) {
      setName(data.name);
      setCurrency(data.currency);
      setTaxPct(Math.round(data.defaultTaxRate * 100));
    }
  }, [data]);

  if (isLoading) return <LoadingState />;

  const save = async () => {
    await updateSettings.mutateAsync({ name, currency, defaultTaxRate: taxPct / 100 });
  };

  const reset = () => {
    if (confirm("Esto creará una empresa demo nueva con datos de ejemplo. ¿Continuar?")) {
      resetCompany();
      window.location.reload();
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-5 max-w-2xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Configuración</h2>
        <p className="text-sm text-muted-foreground mt-1">Datos de tu empresa y preferencias</p>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" /> Empresa
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-xs">Nombre del negocio</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Mi Negocio" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs flex items-center gap-1">
                <Coins className="h-3 w-3" /> Moneda
              </Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Impuesto por defecto %</Label>
              <Input type="number" value={taxPct} onChange={(e) => setTaxPct(+e.target.value)} />
            </div>
          </div>
          <Button onClick={save} disabled={updateSettings.isPending} className="w-full rounded-xl mt-2">
            {updateSettings.isPending ? "Guardando…" : "Guardar cambios"}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <RotateCcw className="h-4 w-4 text-muted-foreground" /> Datos de demostración
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-3">
            Reinicia con una empresa de ejemplo (productos, clientes y gastos de muestra).
          </p>
          <Button variant="outline" onClick={reset} className="rounded-xl gap-2">
            <RotateCcw className="h-4 w-4" /> Reiniciar con datos demo
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
