// ============================================================
// Cash Pro v2 — Zod validation schemas (shared by api + clients)
// ============================================================
import { z } from "zod";

export const paymentMethodSchema = z.enum(["cash", "card", "transfer", "other"]);
export const invoiceStatusSchema = z.enum(["pending", "paid", "partial", "overdue"]);

export const productInputSchema = z.object({
  code: z.string().min(1, "Código requerido"),
  name: z.string().min(1, "Nombre requerido"),
  description: z.string().default(""),
  unit: z.string().min(1).default("und"),
  purchasePrice: z.number().nonnegative(),
  salePrice: z.number().nonnegative(),
  taxRate: z.number().min(0).max(1).default(0.16),
  stock: z.number().int().default(0),
  minStock: z.number().int().nonnegative().default(0),
  active: z.boolean().default(true),
  categoryId: z.string().uuid().nullable().optional(),
});
export type ProductInput = z.infer<typeof productInputSchema>;

export const customerInputSchema = z.object({
  name: z.string().min(1, "Nombre requerido"),
  email: z.string().email().or(z.literal("")).default(""),
  phone: z.string().default(""),
  address: z.string().default(""),
  notes: z.string().default(""),
});
export type CustomerInput = z.infer<typeof customerInputSchema>;

export const supplierInputSchema = customerInputSchema;
export type SupplierInput = z.infer<typeof supplierInputSchema>;

export const invoiceItemInputSchema = z.object({
  productId: z.string().min(1),
  productName: z.string().min(1),
  quantity: z.number().positive(),
  unitPrice: z.number().nonnegative(),
  costPrice: z.number().nonnegative(),
  taxRate: z.number().min(0).max(1),
});

export const invoiceInputSchema = z.object({
  clientId: z.string().min(1, "Cliente requerido"),
  clientName: z.string().min(1),
  items: z.array(invoiceItemInputSchema).min(1, "Agrega al menos un producto"),
  dueDate: z.string(),
  notes: z.string().default(""),
});
export type InvoiceInput = z.infer<typeof invoiceInputSchema>;

export const paymentInputSchema = z.object({
  invoiceId: z.string().min(1),
  amount: z.number().positive(),
  method: paymentMethodSchema,
  date: z.string(),
  notes: z.string().default(""),
});
export type PaymentInput = z.infer<typeof paymentInputSchema>;

export const purchaseItemInputSchema = z.object({
  productId: z.string().min(1),
  productName: z.string().min(1),
  quantity: z.number().positive(),
  unitCost: z.number().nonnegative(),
});

export const purchaseInputSchema = z.object({
  supplierId: z.string().min(1, "Proveedor requerido"),
  supplierName: z.string().min(1),
  items: z.array(purchaseItemInputSchema).min(1, "Agrega al menos un producto"),
  notes: z.string().default(""),
});
export type PurchaseInput = z.infer<typeof purchaseInputSchema>;

export const supplierPaymentInputSchema = z.object({
  purchaseOrderId: z.string().min(1),
  amount: z.number().positive(),
  method: paymentMethodSchema,
  date: z.string(),
  notes: z.string().default(""),
});
export type SupplierPaymentInput = z.infer<typeof supplierPaymentInputSchema>;

export const expenseInputSchema = z.object({
  description: z.string().min(1, "Descripción requerida"),
  amount: z.number().positive(),
  category: z.string().min(1),
  date: z.string(),
  notes: z.string().default(""),
});
export type ExpenseInput = z.infer<typeof expenseInputSchema>;
