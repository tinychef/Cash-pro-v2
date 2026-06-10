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
import { Building2, Coins, Palette, RotateCcw, Upload, X } from "lucide-react";
import { toast } from "sonner";

const CURRENCIES = ["USD", "COP", "VES", "MXN", "EUR", "PEN", "ARS", "CLP"];
const MAX_LOGO_BYTES = 200 * 1024;

export default function SettingsPage() {
  const { data, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();

  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [taxPct, setTaxPct] = useState(16);
  const [taxId, setTaxId] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [accentColor, setAccentColor] = useState("#16a34a");
  const [footerNote, setFooterNote] = useState("");
  const [logoDataUrl, setLogoDataUrl] = useState("");

  useEffect(() => {
    if (data) {
      setName(data.name);
      setCurrency(data.currency);
      setTaxPct(Math.round(data.defaultTaxRate * 100));
      setTaxId(data.taxId ?? "");
      setAddress(data.address ?? "");
      setPhone(data.phone ?? "");
      setEmail(data.email ?? "");
      setAccentColor(data.accentColor ?? "#16a34a");
      setFooterNote(data.footerNote ?? "");
      setLogoDataUrl(data.logoDataUrl ?? "");
    }
  }, [data]);

  if (isLoading) return <LoadingState />;

  const save = async () => {
    await updateSettings.mutateAsync({
      name,
      currency,
      defaultTaxRate: taxPct / 100,
      taxId,
      address,
      phone,
      email,
      accentColor,
      footerNote,
      logoDataUrl,
    });
  };

  const onLogoFile = (file: File | undefined) => {
    if (!file) return;
    if (!/^image\/(png|jpe?g|svg\+xml)$/.test(file.type)) {
      toast.error("Usa una imagen PNG, JPG o SVG");
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      toast.error("El logo debe pesar menos de 200KB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setLogoDataUrl(String(reader.result));
    reader.readAsDataURL(file);
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
            <Palette className="h-4 w-4 text-primary" /> Marca en la factura
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            {logoDataUrl ? (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={logoDataUrl} alt="Logo" className="h-14 w-14 rounded-lg object-contain border border-border bg-white" />
                <button
                  onClick={() => setLogoDataUrl("")}
                  className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                  aria-label="Quitar logo"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </div>
            ) : (
              <label className="h-14 w-14 rounded-lg border border-dashed border-border flex items-center justify-center cursor-pointer hover:bg-secondary transition-colors">
                <Upload className="h-4 w-4 text-muted-foreground" />
                <input type="file" accept="image/png,image/jpeg,image/svg+xml" className="hidden" onChange={(e) => onLogoFile(e.target.files?.[0])} />
              </label>
            )}
            <div className="flex-1">
              <Label className="text-xs">Logo (PNG/JPG/SVG, máx. 200KB)</Label>
              <p className="text-[11px] text-muted-foreground">Aparece en el PDF de tus facturas.</p>
            </div>
            <div>
              <Label className="text-xs block mb-1">Color</Label>
              <input type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="h-9 w-12 rounded-md border border-border bg-background cursor-pointer" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">ID fiscal (RIF/NIT/RUC)</Label>
              <Input value={taxId} onChange={(e) => setTaxId(e.target.value)} placeholder="J-12345678-9" />
            </div>
            <div>
              <Label className="text-xs">Teléfono</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+58 412..." />
            </div>
          </div>
          <div>
            <Label className="text-xs">Dirección</Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Av. Principal, Local 1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ventas@minegocio.com" />
            </div>
            <div>
              <Label className="text-xs">Nota al pie del PDF</Label>
              <Input value={footerNote} onChange={(e) => setFooterNote(e.target.value)} placeholder="¡Gracias por su compra!" />
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
