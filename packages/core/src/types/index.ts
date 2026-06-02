// ============================================================
// Cash Pro v2 — Canonical domain types (shared web / mobile / api)
// ============================================================
// These mirror the database entities in @cash-pro/db. Sync/audit
// fields are optional here so the same types serve both the offline
// client cache and server responses.

/** Columns present on every multi-tenant, offline-syncable entity. */
export interface SyncMeta {
  companyId: string;
  /** Reconciliation id for records created while offline. */
  localId?: string;
  syncStatus?: "synced" | "pending" | "conflict";
  lastModifiedAt?: string;
  deletedAt?: string | null;
  createdBy?: string;
  updatedBy?: string;
}

export interface Category extends Partial<SyncMeta> {
  id: string;
  name: string;
  createdAt: string;
}

export interface Product extends Partial<SyncMeta> {
  id: string;
  code: string;
  name: string;
  description: string;
  unit: string;
  /** What it costs you. */
  purchasePrice: number;
  /** What you charge. */
  salePrice: number;
  taxRate: number; // e.g. 0.16 = 16%
  stock: number;
  minStock: number;
  active: boolean;
  categoryId?: string | null;
  createdAt: string;
}

export interface Customer extends Partial<SyncMeta> {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
  createdAt: string;
}

/** Back-compat alias used by the existing web screens. */
export type Client = Customer;

export interface Supplier extends Partial<SyncMeta> {
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

export interface Invoice extends Partial<SyncMeta> {
  id: string;
  number: string;
  clientId: string;
  clientName: string;
  items: InvoiceItem[];
  subtotal: number;
  taxTotal: number;
  total: number;
  /** Cost of goods sold for this invoice. */
  costTotal: number;
  status: InvoiceStatus;
  createdAt: string;
  dueDate: string;
  notes: string;
}

export interface Payment extends Partial<SyncMeta> {
  id: string;
  invoiceId: string;
  amount: number;
  method: PaymentMethod;
  date: string;
  notes: string;
}

export interface SupplierPayment extends Partial<SyncMeta> {
  id: string;
  purchaseOrderId: string;
  amount: number;
  method: PaymentMethod;
  date: string;
  notes: string;
}

export interface Expense extends Partial<SyncMeta> {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  notes: string;
}

export interface PurchaseOrderItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitCost: number;
}

export interface PurchaseOrder extends Partial<SyncMeta> {
  id: string;
  number: string;
  supplierId: string;
  supplierName: string;
  items: PurchaseOrderItem[];
  total: number;
  status: "pending" | "received" | "paid" | "partial";
  createdAt: string;
  notes: string;
}

export type InventoryMovementType = "in" | "out" | "adjustment";

export interface InventoryMovement extends Partial<SyncMeta> {
  id: string;
  productId: string;
  type: InventoryMovementType;
  quantity: number;
  reason: string;
  date: string;
}

/** Aggregated KPIs shown on the dashboard. */
export interface DashboardKPIs {
  dailySales: number;
  grossProfit: number;
  receivables: number;
  netCashFlow: number;
}

/** Profit & Loss statement for a period. */
export interface ProfitAndLoss {
  revenue: number;
  cogs: number;
  grossProfit: number;
  expenses: number;
  netProfit: number;
  grossMargin: number; // ratio 0..1
  netMargin: number; // ratio 0..1
}
