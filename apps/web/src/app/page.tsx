"use client";

import React from "react";
import { useStore } from "@/lib/store";
import { currency, shortDate } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  Receipt,
  Wallet,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

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

export default function DashboardPage() {
  const { invoices, expenses, payments } = useStore();

  // Today
  const todayStr = new Date().toISOString().slice(0, 10);

  // KPIs
  const todayInvoices = invoices.filter((i) => i.createdAt === todayStr);
  const salesToday = todayInvoices.reduce((s, i) => s + i.total, 0);
  const costToday = todayInvoices.reduce((s, i) => s + i.costTotal, 0);
  const profitToday = salesToday - costToday;
  const totalReceivables = invoices
    .filter((i) => i.status !== "paid")
    .reduce((sum, inv) => {
      const paid = payments
        .filter((p) => p.invoiceId === inv.id)
        .reduce((s, p) => s + p.amount, 0);
      return sum + (inv.total - paid);
    }, 0);

  const totalIncome = payments.reduce((s, p) => s + p.amount, 0);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const cashFlow = totalIncome - totalExpenses;

  // Chart data: last 7 days
  const chartData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const key = d.toISOString().slice(0, 10);
    const dayIncome = payments
      .filter((p) => p.date === key)
      .reduce((s, p) => s + p.amount, 0);
    const dayExpense = expenses
      .filter((e) => e.date === key)
      .reduce((s, e) => s + e.amount, 0);
    return {
      name: d.toLocaleDateString("es", { weekday: "short" }),
      Ingresos: dayIncome,
      Gastos: dayExpense,
    };
  });

  // Recent invoices (last 5)
  const recentInvoices = [...invoices]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5);

  // Recent expenses (last 5)
  const recentExpenses = [...expenses]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);

  const kpis = [
    {
      label: "Ventas Hoy",
      value: currency(salesToday),
      icon: DollarSign,
      change: todayInvoices.length + " facturas",
      up: true,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
    {
      label: "Utilidad Hoy",
      value: currency(profitToday),
      icon: TrendingUp,
      change: salesToday > 0 ? `${((profitToday / salesToday) * 100).toFixed(0)}% margen` : "—",
      up: profitToday > 0,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      label: "Por Cobrar",
      value: currency(totalReceivables),
      icon: CreditCard,
      change: invoices.filter((i) => i.status !== "paid").length + " facturas",
      up: false,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
    },
    {
      label: "Flujo Neto",
      value: currency(cashFlow),
      icon: Wallet,
      change: cashFlow >= 0 ? "Positivo" : "Negativo",
      up: cashFlow >= 0,
      color: cashFlow >= 0 ? "text-emerald-500" : "text-red-500",
      bg: cashFlow >= 0 ? "bg-emerald-500/10" : "bg-red-500/10",
    },
  ];

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Resumen de tu negocio · {new Date().toLocaleDateString("es", { weekday: "long", day: "numeric", month: "long" })}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="relative overflow-hidden border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4 lg:p-5">
              <div className="flex items-center justify-between mb-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${kpi.bg}`}>
                  <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
                </div>
                {kpi.up ? (
                  <ArrowUpRight className="h-4 w-4 text-emerald-500" />
                ) : (
                  <ArrowDownRight className="h-4 w-4 text-red-500" />
                )}
              </div>
              <p className="text-[22px] lg:text-2xl font-bold tracking-tight">{kpi.value}</p>
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-muted-foreground font-medium">{kpi.label}</p>
                <p className="text-[11px] text-muted-foreground">{kpi.change}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chart */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Ingresos vs Gastos</CardTitle>
          <p className="text-xs text-muted-foreground">Últimos 7 días</p>
        </CardHeader>
        <CardContent className="pt-0 pb-4">
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barGap={4} barCategoryGap="25%">
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} className="text-muted-foreground" />
                <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" />
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
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }}
                />
                <Bar dataKey="Ingresos" radius={[6, 6, 0, 0]} fill="hsl(142, 70%, 45%)" />
                <Bar dataKey="Gastos" radius={[6, 6, 0, 0]} fill="hsl(0, 80%, 60%)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Recent Items Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Invoices */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Receipt className="h-4 w-4 text-primary" />
              <CardTitle className="text-base font-semibold">Últimas Facturas</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            {recentInvoices.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center justify-between rounded-lg bg-secondary/50 p-3 hover:bg-secondary transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{inv.clientName}</p>
                  <p className="text-xs text-muted-foreground">
                    {inv.number} · {shortDate(inv.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm font-semibold">{currency(inv.total)}</span>
                  <Badge variant="secondary" className={`text-[10px] px-2 py-0.5 ${statusColor[inv.status]}`}>
                    {statusLabel[inv.status]}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Recent Expenses */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <ArrowDownRight className="h-4 w-4 text-red-500" />
              <CardTitle className="text-base font-semibold">Últimos Gastos</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            {recentExpenses.map((exp) => (
              <div
                key={exp.id}
                className="flex items-center justify-between rounded-lg bg-secondary/50 p-3 hover:bg-secondary transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{exp.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {exp.category} · {shortDate(exp.date)}
                  </p>
                </div>
                <span className="text-sm font-semibold text-red-500 shrink-0">
                  -{currency(exp.amount)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
