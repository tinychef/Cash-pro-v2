// ============================================================
// Serialization: postgres-js returns numeric/decimal columns as
// strings. We coerce known numeric fields back to numbers so the API
// contract is clean (numbers in, numbers out) for web + mobile.
// ============================================================

/* eslint-disable @typescript-eslint/no-explicit-any */
export const numericFields = {
  products: ["purchasePrice", "salePrice", "taxRate", "profitPerUnit", "profitMargin"],
  invoices: ["subtotal", "taxTotal", "total", "costOfGoods", "grossProfit", "profitMargin"],
  invoice_items: ["quantity", "unitPrice", "costPrice", "taxRate"],
  payments: ["amount"],
  expenses: ["amount"],
  suppliers: [] as string[],
  customers: [] as string[],
  purchase_orders: ["total"],
  purchase_order_items: ["quantity", "unitCost"],
  supplier_payments: ["amount"],
} as const;

export type NumericResource = keyof typeof numericFields;

function coerce(row: any, fields: readonly string[]): any {
  if (!row || typeof row !== "object") return row;
  const out: any = { ...row };
  for (const f of fields) {
    if (out[f] !== null && out[f] !== undefined) out[f] = Number(out[f]);
  }
  return out;
}

/** Serialize a single row's numeric fields for the given resource. */
export function serialize<T>(resource: NumericResource, row: T): T {
  return coerce(row, numericFields[resource]);
}

/** Serialize a list of rows. */
export function serializeList<T>(resource: NumericResource, rows: T[]): T[] {
  const fields = numericFields[resource];
  return rows.map((r) => coerce(r, fields));
}
