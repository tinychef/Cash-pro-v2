// ============================================================
// Cash Pro v2 — Zustand Store with mock data
// ============================================================
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
    Product,
    Client,
    Invoice,
    Payment,
    Expense,
    InvoiceStatus,
} from "./types";

// ---------- helpers ----------
const uid = () => Math.random().toString(36).slice(2, 10);
const today = () => new Date().toISOString().slice(0, 10);

function daysAgo(n: number) {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString().slice(0, 10);
}

// ---------- seed data ----------
const seedProducts: Product[] = [
    { id: "p1", code: "CAM-001", name: "Camiseta Básica", description: "Camiseta algodón 100%", unit: "und", purchasePrice: 5, salePrice: 15, taxRate: 0.16, stock: 120, minStock: 20, active: true, createdAt: daysAgo(30) },
    { id: "p2", code: "PAN-002", name: "Pantalón Casual", description: "Pantalón denim slim fit", unit: "und", purchasePrice: 12, salePrice: 35, taxRate: 0.16, stock: 45, minStock: 10, active: true, createdAt: daysAgo(28) },
    { id: "p3", code: "ZAP-003", name: "Zapatos Deportivos", description: "Zapatos running ergonómicos", unit: "par", purchasePrice: 25, salePrice: 70, taxRate: 0.16, stock: 8, minStock: 10, active: true, createdAt: daysAgo(25) },
    { id: "p4", code: "GOR-004", name: "Gorra Snapback", description: "Gorra ajustable bordada", unit: "und", purchasePrice: 3, salePrice: 12, taxRate: 0.16, stock: 200, minStock: 30, active: true, createdAt: daysAgo(20) },
    { id: "p5", code: "BOL-005", name: "Bolso de Cuero", description: "Bolso crossbody genuino", unit: "und", purchasePrice: 18, salePrice: 55, taxRate: 0.16, stock: 5, minStock: 8, active: true, createdAt: daysAgo(15) },
    { id: "p6", code: "CIN-006", name: "Cinturón Premium", description: "Cinturón cuero italiano", unit: "und", purchasePrice: 8, salePrice: 28, taxRate: 0.16, stock: 60, minStock: 15, active: true, createdAt: daysAgo(10) },
];

const seedClients: Client[] = [
    { id: "c1", name: "María González", email: "maria@email.com", phone: "+58 412-555-0101", address: "Av. Libertador 123", notes: "Cliente frecuente", createdAt: daysAgo(60) },
    { id: "c2", name: "Carlos Rodríguez", email: "carlos@email.com", phone: "+58 414-555-0202", address: "Calle Bolívar 456", notes: "", createdAt: daysAgo(45) },
    { id: "c3", name: "Ana Martínez", email: "ana@email.com", phone: "+58 416-555-0303", address: "Centro Comercial Plaza", notes: "Mayorista", createdAt: daysAgo(30) },
    { id: "c4", name: "Pedro Sánchez", email: "pedro@email.com", phone: "+58 424-555-0404", address: "Zona Industrial Norte", notes: "", createdAt: daysAgo(20) },
];

const seedInvoices: Invoice[] = [
    { id: "inv1", number: "INV-001", clientId: "c1", clientName: "María González", items: [{ id: "ii1", productId: "p1", productName: "Camiseta Básica", quantity: 3, unitPrice: 15, costPrice: 5, taxRate: 0.16 }, { id: "ii2", productId: "p4", productName: "Gorra Snapback", quantity: 2, unitPrice: 12, costPrice: 3, taxRate: 0.16 }], subtotal: 69, taxTotal: 11.04, total: 80.04, costTotal: 21, status: "paid", createdAt: daysAgo(5), dueDate: daysAgo(0), notes: "" },
    { id: "inv2", number: "INV-002", clientId: "c2", clientName: "Carlos Rodríguez", items: [{ id: "ii3", productId: "p2", productName: "Pantalón Casual", quantity: 1, unitPrice: 35, costPrice: 12, taxRate: 0.16 }], subtotal: 35, taxTotal: 5.6, total: 40.6, costTotal: 12, status: "pending", createdAt: daysAgo(3), dueDate: daysAgo(-7), notes: "" },
    { id: "inv3", number: "INV-003", clientId: "c3", clientName: "Ana Martínez", items: [{ id: "ii4", productId: "p3", productName: "Zapatos Deportivos", quantity: 5, unitPrice: 70, costPrice: 25, taxRate: 0.16 }, { id: "ii5", productId: "p6", productName: "Cinturón Premium", quantity: 10, unitPrice: 28, costPrice: 8, taxRate: 0.16 }], subtotal: 630, taxTotal: 100.8, total: 730.8, costTotal: 205, status: "partial", createdAt: daysAgo(7), dueDate: daysAgo(-3), notes: "Entrega parcial" },
    { id: "inv4", number: "INV-004", clientId: "c1", clientName: "María González", items: [{ id: "ii6", productId: "p5", productName: "Bolso de Cuero", quantity: 2, unitPrice: 55, costPrice: 18, taxRate: 0.16 }], subtotal: 110, taxTotal: 17.6, total: 127.6, costTotal: 36, status: "overdue", createdAt: daysAgo(15), dueDate: daysAgo(5), notes: "" },
    { id: "inv5", number: "INV-005", clientId: "c4", clientName: "Pedro Sánchez", items: [{ id: "ii7", productId: "p1", productName: "Camiseta Básica", quantity: 10, unitPrice: 15, costPrice: 5, taxRate: 0.16 }, { id: "ii8", productId: "p2", productName: "Pantalón Casual", quantity: 5, unitPrice: 35, costPrice: 12, taxRate: 0.16 }], subtotal: 325, taxTotal: 52, total: 377, costTotal: 110, status: "paid", createdAt: today(), dueDate: today(), notes: "Pago de contado" },
];

const seedPayments: Payment[] = [
    { id: "pay1", invoiceId: "inv1", amount: 80.04, method: "cash", date: daysAgo(5), notes: "" },
    { id: "pay2", invoiceId: "inv3", amount: 300, method: "transfer", date: daysAgo(4), notes: "Pago parcial" },
    { id: "pay3", invoiceId: "inv5", amount: 377, method: "card", date: today(), notes: "" },
];

const seedExpenses: Expense[] = [
    { id: "e1", description: "Alquiler local", amount: 200, category: "Alquiler", date: daysAgo(1), notes: "" },
    { id: "e2", description: "Servicio de internet", amount: 30, category: "Servicios", date: daysAgo(2), notes: "" },
    { id: "e3", description: "Compra de inventario", amount: 450, category: "Inventario", date: daysAgo(3), notes: "" },
    { id: "e4", description: "Publicidad redes sociales", amount: 50, category: "Marketing", date: today(), notes: "" },
];

// ---------- Store interface ----------
interface AppState {
    products: Product[];
    clients: Client[];
    invoices: Invoice[];
    payments: Payment[];
    expenses: Expense[];

    // Products
    addProduct: (p: Omit<Product, "id" | "createdAt">) => void;
    updateProduct: (id: string, p: Partial<Product>) => void;
    deleteProduct: (id: string) => void;

    // Clients
    addClient: (c: Omit<Client, "id" | "createdAt">) => void;
    updateClient: (id: string, c: Partial<Client>) => void;
    deleteClient: (id: string) => void;

    // Invoices
    addInvoice: (inv: Omit<Invoice, "id" | "number" | "createdAt">) => void;
    updateInvoiceStatus: (id: string, status: InvoiceStatus) => void;

    // Payments
    addPayment: (p: Omit<Payment, "id">) => void;

    // Expenses
    addExpense: (e: Omit<Expense, "id">) => void;

    // Derived helpers
    getInvoiceBalance: (invoiceId: string) => number;
    getTotalReceivables: () => number;
}

export const useStore = create<AppState>()(
    persist(
        (set, get) => ({
            products: seedProducts,
            clients: seedClients,
            invoices: seedInvoices,
            payments: seedPayments,
            expenses: seedExpenses,

            // ---- Products ----
            addProduct: (p) =>
                set((s) => ({
                    products: [...s.products, { ...p, id: uid(), createdAt: today() }],
                })),
            updateProduct: (id, p) =>
                set((s) => ({
                    products: s.products.map((x) => (x.id === id ? { ...x, ...p } : x)),
                })),
            deleteProduct: (id) =>
                set((s) => ({ products: s.products.filter((x) => x.id !== id) })),

            // ---- Clients ----
            addClient: (c) =>
                set((s) => ({
                    clients: [...s.clients, { ...c, id: uid(), createdAt: today() }],
                })),
            updateClient: (id, c) =>
                set((s) => ({
                    clients: s.clients.map((x) => (x.id === id ? { ...x, ...c } : x)),
                })),
            deleteClient: (id) =>
                set((s) => ({ clients: s.clients.filter((x) => x.id !== id) })),

            // ---- Invoices ----
            addInvoice: (inv) =>
                set((s) => {
                    const num = `INV-${String(s.invoices.length + 1).padStart(3, "0")}`;
                    return {
                        invoices: [
                            ...s.invoices,
                            { ...inv, id: uid(), number: num, createdAt: today() },
                        ],
                    };
                }),
            updateInvoiceStatus: (id, status) =>
                set((s) => ({
                    invoices: s.invoices.map((x) =>
                        x.id === id ? { ...x, status } : x
                    ),
                })),

            // ---- Payments ----
            addPayment: (p) =>
                set((s) => {
                    const newPayments = [...s.payments, { ...p, id: uid() }];
                    // Recalculate invoice status
                    const invoice = s.invoices.find((i) => i.id === p.invoiceId);
                    if (!invoice) return { payments: newPayments };
                    const totalPaid = newPayments
                        .filter((pay) => pay.invoiceId === p.invoiceId)
                        .reduce((sum, pay) => sum + pay.amount, 0);
                    let newStatus: InvoiceStatus = invoice.status;
                    if (totalPaid >= invoice.total) newStatus = "paid";
                    else if (totalPaid > 0) newStatus = "partial";
                    return {
                        payments: newPayments,
                        invoices: s.invoices.map((i) =>
                            i.id === p.invoiceId ? { ...i, status: newStatus } : i
                        ),
                    };
                }),

            // ---- Expenses ----
            addExpense: (e) =>
                set((s) => ({
                    expenses: [...s.expenses, { ...e, id: uid() }],
                })),

            // ---- Derived ----
            getInvoiceBalance: (invoiceId) => {
                const s = get();
                const invoice = s.invoices.find((i) => i.id === invoiceId);
                if (!invoice) return 0;
                const paid = s.payments
                    .filter((p) => p.invoiceId === invoiceId)
                    .reduce((sum, p) => sum + p.amount, 0);
                return invoice.total - paid;
            },
            getTotalReceivables: () => {
                const s = get();
                return s.invoices
                    .filter((i) => i.status !== "paid")
                    .reduce((sum, inv) => {
                        const paid = s.payments
                            .filter((p) => p.invoiceId === inv.id)
                            .reduce((s2, p) => s2 + p.amount, 0);
                        return sum + (inv.total - paid);
                    }, 0);
            },
        }),
        { name: "cashpro-v2-store" }
    )
);
