"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    FileText,
    Package,
    Users,
    BarChart3,
    Plus,
    Menu,
    DollarSign,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/invoices", label: "Facturas", icon: FileText },
    { href: "/products", label: "Productos", icon: Package },
    { href: "/clients", label: "Clientes", icon: Users },
    { href: "/reports", label: "Reportes", icon: BarChart3 },
];

export function AppShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="flex h-screen w-full overflow-hidden bg-background">
            {/* ─── Desktop Sidebar ─── */}
            <aside className="hidden lg:flex flex-col w-64 border-r border-border bg-card">
                {/* Logo */}
                <div className="flex items-center gap-3 px-6 py-5 border-b border-border">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
                        <DollarSign className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold tracking-tight">Cash Pro</h1>
                        <p className="text-[11px] text-muted-foreground font-medium">v2 · Mini-ERP</p>
                    </div>
                </div>

                {/* Nav Links */}
                <nav className="flex-1 px-3 py-4 space-y-1">
                    {navItems.map((item) => {
                        const active =
                            item.href === "/"
                                ? pathname === "/"
                                : pathname.startsWith(item.href);
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                                    active
                                        ? "bg-primary/10 text-primary"
                                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                                )}
                            >
                                <item.icon className="h-[18px] w-[18px]" />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                {/* Bottom */}
                <div className="p-4 border-t border-border">
                    <div className="rounded-lg bg-primary/5 p-3">
                        <p className="text-xs font-semibold text-primary">Cash Pro v2</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                            Gestiona tu negocio fácilmente
                        </p>
                    </div>
                </div>
            </aside>

            {/* ─── Main Content ─── */}
            <div className="flex flex-1 flex-col min-w-0">
                {/* Top Bar (Mobile) */}
                <header className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-card/80 glass sticky top-0 z-30">
                    <div className="flex items-center gap-3">
                        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                            <SheetTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-9 w-9">
                                    <Menu className="h-5 w-5" />
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="left" className="w-72 p-0">
                                <div className="flex items-center gap-3 px-6 py-5 border-b border-border">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
                                        <DollarSign className="h-5 w-5 text-primary-foreground" />
                                    </div>
                                    <div>
                                        <h1 className="text-lg font-bold tracking-tight">Cash Pro</h1>
                                        <p className="text-[11px] text-muted-foreground font-medium">v2 · Mini-ERP</p>
                                    </div>
                                </div>
                                <nav className="px-3 py-4 space-y-1">
                                    {navItems.map((item) => {
                                        const active =
                                            item.href === "/"
                                                ? pathname === "/"
                                                : pathname.startsWith(item.href);
                                        return (
                                            <Link
                                                key={item.href}
                                                href={item.href}
                                                onClick={() => setSidebarOpen(false)}
                                                className={cn(
                                                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                                                    active
                                                        ? "bg-primary/10 text-primary"
                                                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                                                )}
                                            >
                                                <item.icon className="h-[18px] w-[18px]" />
                                                {item.label}
                                            </Link>
                                        );
                                    })}
                                </nav>
                            </SheetContent>
                        </Sheet>
                        <h1 className="text-base font-bold">Cash Pro</h1>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 overflow-y-auto pb-24 lg:pb-6">
                    {children}
                </main>

                {/* ─── Mobile Bottom Nav ─── */}
                <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-card/90 glass">
                    <div className="grid grid-cols-5 gap-0">
                        {navItems.map((item) => {
                            const active =
                                item.href === "/"
                                    ? pathname === "/"
                                    : pathname.startsWith(item.href);
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        "flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors",
                                        active
                                            ? "text-primary"
                                            : "text-muted-foreground"
                                    )}
                                >
                                    <item.icon className="h-5 w-5" />
                                    {item.label}
                                </Link>
                            );
                        })}
                    </div>
                </nav>
            </div>

            {/* ─── FAB: New Sale ─── */}
            <Link
                href="/invoices/new"
                className="fixed bottom-20 right-4 lg:bottom-6 lg:right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 fab-pulse hover:scale-105 transition-transform"
            >
                <Plus className="h-6 w-6" />
            </Link>
        </div>
    );
}
