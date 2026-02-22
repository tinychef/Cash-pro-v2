// ============================================================
// Cash Pro v2 — Core Types
// ============================================================

export interface Product {
  id: string;
  code: string;
  name: string;
  description: string;
  unit: string;
  purchasePrice: number;
  salePrice: number;
  taxRate: number; // e.g. 0.16 = 16%
  stock: number;
  minStock: number;
  active: boolean;
  createdAt: string;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
  createdAt: string;
}

export type InvoiceStatus = "pending" | "paid" | "partial" | "overdue";
export type PaymentMethod = "cash" | "card" | "transfer" | "other";

export interface InvoiceItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  costPrice: number;
  taxRate: number;
}

export interface Invoice {
  id: string;
  number: string;
  clientId: string;
  clientName: string;
  items: InvoiceItem[];
  subtotal: number;
  taxTotal: number;
  total: number;
  costTotal: number;
  status: InvoiceStatus;
  createdAt: string;
  dueDate: string;
  notes: string;
}

export interface Payment {
  id: string;
  invoiceId: string;
  amount: number;
  method: PaymentMethod;
  date: string;
  notes: string;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  notes: string;
}
