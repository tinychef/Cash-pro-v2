// ============================================================
// TanStack Query hooks over the Cash Pro API.
// Domain types come from @cash-pro/core (single source of truth).
// ============================================================
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
} from "@tanstack/react-query";
import { toast } from "sonner";
import type {
  Customer,
  DashboardKPIs,
  Expense,
  Invoice,
  Payment,
  ProfitAndLoss,
  Product,
  Supplier,
} from "@cash-pro/core";
import { api } from "./api";

export const keys = {
  products: ["products"] as const,
  customers: ["customers"] as const,
  suppliers: ["suppliers"] as const,
  expenses: ["expenses"] as const,
  invoices: ["invoices"] as const,
  invoice: (id: string) => ["invoices", id] as const,
  payments: ["payments"] as const,
  dashboard: ["reports", "dashboard"] as const,
  pnl: ["reports", "pnl"] as const,
  settings: ["settings"] as const,
};

export interface CompanySettings {
  name: string;
  currency: string;
  locale: string;
  defaultTaxRate: number;
}

// ---- Invoice shape from API (customer* naming) -> UI (client* naming) ----
type ApiInvoice = Invoice & { customerId: string | null; customerName: string };
function normalizeInvoice(i: ApiInvoice): Invoice {
  return { ...i, clientId: i.customerId ?? "", clientName: i.customerName };
}

// ---------------- Queries ----------------
export function useProducts() {
  return useQuery({ queryKey: keys.products, queryFn: () => api.get<Product[]>("/products") });
}
export function useCustomers() {
  return useQuery({ queryKey: keys.customers, queryFn: () => api.get<Customer[]>("/customers") });
}
export function useSuppliers() {
  return useQuery({ queryKey: keys.suppliers, queryFn: () => api.get<Supplier[]>("/suppliers") });
}
export function useExpenses() {
  return useQuery({ queryKey: keys.expenses, queryFn: () => api.get<Expense[]>("/expenses") });
}
export function useInvoices() {
  return useQuery({
    queryKey: keys.invoices,
    queryFn: async () => (await api.get<ApiInvoice[]>("/invoices")).map(normalizeInvoice),
  });
}
export function useInvoice(id: string | undefined) {
  return useQuery({
    queryKey: keys.invoice(id ?? ""),
    enabled: Boolean(id),
    queryFn: async () => normalizeInvoice(await api.get<ApiInvoice>(`/invoices/${id}`)),
  });
}
export function usePayments() {
  return useQuery({ queryKey: keys.payments, queryFn: () => api.get<Payment[]>("/payments") });
}
export function useDashboard() {
  return useQuery({ queryKey: keys.dashboard, queryFn: () => api.get<DashboardKPIs & { revenue: number; netProfit: number }>("/reports/dashboard") });
}
export function usePnl() {
  return useQuery({ queryKey: keys.pnl, queryFn: () => api.get<ProfitAndLoss>("/reports/pnl") });
}
export function useSettings() {
  return useQuery({ queryKey: keys.settings, queryFn: () => api.get<CompanySettings>("/settings") });
}

// ---------------- Mutation helper ----------------
function useApiMutation<TVars, TData>(
  fn: (vars: TVars) => Promise<TData>,
  opts: { invalidate: readonly (readonly unknown[])[]; success?: string } & UseMutationOptions<TData, Error, TVars>,
) {
  const qc = useQueryClient();
  const { invalidate, success, ...rest } = opts;
  return useMutation<TData, Error, TVars>({
    mutationFn: fn,
    onSuccess: (...args) => {
      invalidate.forEach((k) => qc.invalidateQueries({ queryKey: k as unknown[] }));
      if (success) toast.success(success);
      rest.onSuccess?.(...args);
    },
    onError: (err) => toast.error(err.message),
    ...rest,
  });
}

const moneyKeys = [keys.dashboard, keys.pnl] as const;

// ---------------- Products ----------------
export function useCreateProduct() {
  return useApiMutation((b: Partial<Product>) => api.post<Product>("/products", b), {
    invalidate: [keys.products],
    success: "Producto creado",
  });
}
export function useUpdateProduct() {
  return useApiMutation(
    ({ id, ...b }: Partial<Product> & { id: string }) => api.put<Product>(`/products/${id}`, b),
    { invalidate: [keys.products], success: "Producto actualizado" },
  );
}
export function useDeleteProduct() {
  return useApiMutation((id: string) => api.del(`/products/${id}`), {
    invalidate: [keys.products],
    success: "Producto eliminado",
  });
}

// ---------------- Customers ----------------
export function useCreateCustomer() {
  return useApiMutation((b: Partial<Customer>) => api.post<Customer>("/customers", b), {
    invalidate: [keys.customers],
    success: "Cliente creado",
  });
}
export function useUpdateCustomer() {
  return useApiMutation(
    ({ id, ...b }: Partial<Customer> & { id: string }) => api.put<Customer>(`/customers/${id}`, b),
    { invalidate: [keys.customers], success: "Cliente actualizado" },
  );
}
export function useDeleteCustomer() {
  return useApiMutation((id: string) => api.del(`/customers/${id}`), {
    invalidate: [keys.customers],
    success: "Cliente eliminado",
  });
}

// ---------------- Suppliers ----------------
export function useCreateSupplier() {
  return useApiMutation((b: Partial<Supplier>) => api.post<Supplier>("/suppliers", b), {
    invalidate: [keys.suppliers],
    success: "Proveedor creado",
  });
}
export function useUpdateSupplier() {
  return useApiMutation(
    ({ id, ...b }: Partial<Supplier> & { id: string }) => api.put<Supplier>(`/suppliers/${id}`, b),
    { invalidate: [keys.suppliers], success: "Proveedor actualizado" },
  );
}
export function useDeleteSupplier() {
  return useApiMutation((id: string) => api.del(`/suppliers/${id}`), {
    invalidate: [keys.suppliers],
    success: "Proveedor eliminado",
  });
}

// ---------------- Expenses ----------------
export function useCreateExpense() {
  return useApiMutation((b: Partial<Expense>) => api.post<Expense>("/expenses", b), {
    invalidate: [keys.expenses, ...moneyKeys],
    success: "Gasto registrado",
  });
}
export function useDeleteExpense() {
  return useApiMutation((id: string) => api.del(`/expenses/${id}`), {
    invalidate: [keys.expenses, ...moneyKeys],
    success: "Gasto eliminado",
  });
}

// ---------------- Invoices & payments ----------------
export interface NewInvoicePayload {
  clientId: string;
  clientName: string;
  items: Invoice["items"];
  dueDate: string;
  notes: string;
}
export function useCreateInvoice() {
  return useApiMutation((b: NewInvoicePayload) => api.post<Invoice>("/invoices", b), {
    invalidate: [keys.invoices, keys.products, ...moneyKeys],
    success: "Factura creada",
  });
}
export function useCreatePayment() {
  return useApiMutation(
    (b: { invoiceId: string; amount: number; method: string; date: string; notes?: string }) =>
      api.post<Payment>("/payments", b),
    { invalidate: [keys.invoices, keys.payments, ...moneyKeys], success: "Pago registrado" },
  );
}

// ---------------- Settings ----------------
export function useUpdateSettings() {
  return useApiMutation((b: Partial<CompanySettings>) => api.put<CompanySettings>("/settings", b), {
    invalidate: [keys.settings],
    success: "Configuración guardada",
  });
}
