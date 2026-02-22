"use client";

import React, { useState, useMemo } from "react";
import { useStore } from "@/lib/store";
import { currency, pct } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
    TrendingUp,
    DollarSign,
    ArrowUpRight,
    ArrowDownRight,
    BarChart3,
} from "lucide-react";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Bar,
    Legend,
} from "recharts";

export default function ReportsPage() {
    // Date range
    const today = new Date().toISOString().slice(0, 10);
    const thirtyDaysAgo = (() => {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        return d.toISOString().slice(0, 10);
    })();

    const [startDate, setStartDate] = useState(thirtyDaysAgo);
    const [endDate, setEndDate] = useState(today);

    const { invoices, expenses, payments } = useStore();

    // Filter by date range
    const filteredInvoices = invoices.filter(
        (i) => i.createdAt >= startDate && i.createdAt <= endDate
    );
    const filteredExpenses = expenses.filter(
        (e) => e.date >= startDate && e.date <= endDate
    );
    const filteredPayments = payments.filter(
        (p) => p.date >= startDate && p.date <= endDate
    );

    // P&L
    const totalRevenue = filteredInvoices.reduce((s, i) => s + i.subtotal, 0);
    const cogs = filteredInvoices.reduce((s, i) => s + i.costTotal, 0);
    const grossProfit = totalRevenue - cogs;
    const grossMargin = totalRevenue > 0 ? grossProfit / totalRevenue : 0;
    const operatingExpenses = filteredExpenses.reduce((s, e) => s + e.amount, 0);
    const netProfit = grossProfit - operatingExpenses;
    const netMargin = totalRevenue > 0 ? netProfit / totalRevenue : 0;

    // Cash Flow
    const totalCashIn = filteredPayments.reduce((s, p) => s + p.amount, 0);
    const totalCashOut = operatingExpenses;
    const netCashFlow = totalCashIn - totalCashOut;

    // Cash flow chart (by day)
    const cashFlowChart = useMemo(() => {
        const days: Record<string, { inflow: number; outflow: number }> = {};
        // Fill all days in range
        const start = new Date(startDate + "T12:00:00");
        const end = new Date(endDate + "T12:00:00");
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            days[d.toISOString().slice(0, 10)] = { inflow: 0, outflow: 0 };
        }
        filteredPayments.forEach((p) => {
            if (days[p.date]) days[p.date].inflow += p.amount;
        });
        filteredExpenses.forEach((e) => {
            if (days[e.date]) days[e.date].outflow += e.amount;
        });

        let cumulative = 0;
        return Object.entries(days).map(([date, val]) => {
            cumulative += val.inflow - val.outflow;
            const d = new Date(date + "T12:00:00");
            return {
                name: d.toLocaleDateString("es", { day: "2-digit", month: "short" }),
                Ingresos: val.inflow,
                Gastos: val.outflow,
                Acumulado: cumulative,
            };
        });
    }, [startDate, endDate, filteredPayments, filteredExpenses]);

    return (
        <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold tracking-tight">Reportes</h2>
                <p className="text-sm text-muted-foreground mt-1">
                    Analiza el rendimiento de tu negocio
                </p>
            </div>

            {/* Date Range */}
            <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label className="text-xs text-muted-foreground">Desde</Label>
                            <Input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="rounded-xl border-0 bg-secondary"
                            />
                        </div>
                        <div>
                            <Label className="text-xs text-muted-foreground">Hasta</Label>
                            <Input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="rounded-xl border-0 bg-secondary"
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Cash Flow Summary Cards */}
            <div className="grid grid-cols-3 gap-3">
                <Card className="border-0 shadow-sm">
                    <CardContent className="p-4 text-center">
                        <div className="flex items-center justify-center mb-2">
                            <div className="h-9 w-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                                <ArrowUpRight className="h-4 w-4 text-emerald-500" />
                            </div>
                        </div>
                        <p className="text-lg font-bold text-emerald-500">{currency(totalCashIn)}</p>
                        <p className="text-[11px] text-muted-foreground font-medium">Ingresos</p>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm">
                    <CardContent className="p-4 text-center">
                        <div className="flex items-center justify-center mb-2">
                            <div className="h-9 w-9 rounded-xl bg-red-500/10 flex items-center justify-center">
                                <ArrowDownRight className="h-4 w-4 text-red-500" />
                            </div>
                        </div>
                        <p className="text-lg font-bold text-red-500">{currency(totalCashOut)}</p>
                        <p className="text-[11px] text-muted-foreground font-medium">Gastos</p>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm">
                    <CardContent className="p-4 text-center">
                        <div className="flex items-center justify-center mb-2">
                            <div className="h-9 w-9 rounded-xl bg-blue-500/10 flex items-center justify-center">
                                <DollarSign className="h-4 w-4 text-blue-500" />
                            </div>
                        </div>
                        <p className={`text-lg font-bold ${netCashFlow >= 0 ? "text-blue-500" : "text-red-500"}`}>
                            {currency(netCashFlow)}
                        </p>
                        <p className="text-[11px] text-muted-foreground font-medium">Flujo Neto</p>
                    </CardContent>
                </Card>
            </div>

            {/* Cash Flow Chart */}
            <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-primary" />
                        Flujo de Efectivo
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">Ingresos, gastos y acumulado</p>
                </CardHeader>
                <CardContent className="pt-0 pb-4">
                    <div className="h-[280px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={cashFlowChart}>
                                <defs>
                                    <linearGradient id="colorAccum" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="hsl(199, 89%, 48%)" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="hsl(199, 89%, 48%)" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                                <YAxis tick={{ fontSize: 10 }} />
                                <Tooltip
                                    contentStyle={{
                                        borderRadius: "12px",
                                        border: "1px solid hsl(var(--border))",
                                        background: "hsl(var(--card))",
                                        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                                        fontSize: "12px",
                                    }}
                                    formatter={(value: unknown) => currency(Number(value))}
                                />
                                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "11px" }} />
                                <Area
                                    type="monotone"
                                    dataKey="Acumulado"
                                    stroke="hsl(199, 89%, 48%)"
                                    fill="url(#colorAccum)"
                                    strokeWidth={2}
                                />
                                <Bar dataKey="Ingresos" fill="hsl(142, 70%, 45%)" radius={[4, 4, 0, 0]} barSize={8} />
                                <Bar dataKey="Gastos" fill="hsl(0, 80%, 60%)" radius={[4, 4, 0, 0]} barSize={8} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            {/* P&L Report */}
            <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-primary" />
                        Estado de Resultados (P&L)
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                    {/* Revenue */}
                    <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Ingresos por ventas</span>
                        <span className="text-sm font-bold">{currency(totalRevenue)}</span>
                    </div>
                    <div className="flex justify-between items-center pl-4">
                        <span className="text-xs text-muted-foreground">(-) Costo de mercancía vendida (COGS)</span>
                        <span className="text-xs text-red-500">-{currency(cogs)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between items-center">
                        <span className="text-sm font-semibold text-primary">Utilidad Bruta</span>
                        <div className="text-right">
                            <span className="text-sm font-bold">{currency(grossProfit)}</span>
                            <span className="text-xs text-muted-foreground ml-2">({pct(grossMargin)})</span>
                        </div>
                    </div>
                    <div className="flex justify-between items-center pl-4">
                        <span className="text-xs text-muted-foreground">(-) Gastos operativos</span>
                        <span className="text-xs text-red-500">-{currency(operatingExpenses)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between items-center rounded-lg bg-secondary/50 p-3">
                        <span className="text-sm font-bold">Utilidad Neta</span>
                        <div className="text-right">
                            <span className={`text-lg font-bold ${netProfit >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                                {currency(netProfit)}
                            </span>
                            <span className="text-xs text-muted-foreground ml-2">({pct(netMargin)})</span>
                        </div>
                    </div>

                    {/* Quick metrics */}
                    <div className="grid grid-cols-2 gap-3 mt-4">
                        <div className="rounded-lg bg-emerald-500/5 p-3 text-center">
                            <p className="text-xs text-muted-foreground">Margen Bruto</p>
                            <p className="text-lg font-bold text-emerald-500">{pct(grossMargin)}</p>
                        </div>
                        <div className="rounded-lg bg-blue-500/5 p-3 text-center">
                            <p className="text-xs text-muted-foreground">Margen Neto</p>
                            <p className={`text-lg font-bold ${netMargin >= 0 ? "text-blue-500" : "text-red-500"}`}>
                                {pct(netMargin)}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
