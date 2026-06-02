// ============================================================
// Client-side invoice PDF generation (@react-pdf/renderer).
// Works offline — no server round-trip for rendering.
// ============================================================
import { Document, Page, Text, View, StyleSheet, pdf } from "@react-pdf/renderer";
import { currency } from "@cash-pro/core";
import { api } from "./api";

interface ApiInvoiceDetail {
  number: string;
  customerName: string;
  createdAt: string;
  dueDate: string | null;
  subtotal: number;
  taxTotal: number;
  total: number;
  notes: string;
  items: {
    id: string;
    productName: string;
    quantity: number;
    unitPrice: number;
  }[];
}

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 10, color: "#111", fontFamily: "Helvetica" },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 24 },
  brand: { fontSize: 20, fontWeight: "bold", color: "#16a34a" },
  muted: { color: "#666" },
  h2: { fontSize: 14, fontWeight: "bold", marginBottom: 4 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  tableHead: { flexDirection: "row", borderBottom: 1, borderColor: "#ddd", paddingBottom: 6, marginTop: 16, fontWeight: "bold" },
  tableRow: { flexDirection: "row", borderBottom: 1, borderColor: "#f0f0f0", paddingVertical: 6 },
  cName: { flex: 4 },
  cQty: { flex: 1, textAlign: "right" },
  cPrice: { flex: 2, textAlign: "right" },
  cTotal: { flex: 2, textAlign: "right" },
  totals: { marginTop: 16, marginLeft: "auto", width: 200 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  grand: { fontSize: 13, fontWeight: "bold", color: "#16a34a" },
  notes: { marginTop: 24, color: "#666" },
});

function InvoiceDoc({ inv }: { inv: ApiInvoiceDetail }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>Cash Pro</Text>
            <Text style={styles.muted}>Factura</Text>
          </View>
          <View style={{ textAlign: "right" }}>
            <Text style={styles.h2}>{inv.number}</Text>
            <Text style={styles.muted}>Emitida: {inv.createdAt.slice(0, 10)}</Text>
            {inv.dueDate && <Text style={styles.muted}>Vence: {inv.dueDate.slice(0, 10)}</Text>}
          </View>
        </View>

        <View>
          <Text style={styles.muted}>Cliente</Text>
          <Text style={{ fontSize: 12, fontWeight: "bold" }}>{inv.customerName}</Text>
        </View>

        <View style={styles.tableHead}>
          <Text style={styles.cName}>Producto</Text>
          <Text style={styles.cQty}>Cant.</Text>
          <Text style={styles.cPrice}>Precio</Text>
          <Text style={styles.cTotal}>Total</Text>
        </View>
        {inv.items.map((it) => (
          <View key={it.id} style={styles.tableRow}>
            <Text style={styles.cName}>{it.productName}</Text>
            <Text style={styles.cQty}>{it.quantity}</Text>
            <Text style={styles.cPrice}>{currency(it.unitPrice)}</Text>
            <Text style={styles.cTotal}>{currency(it.unitPrice * it.quantity)}</Text>
          </View>
        ))}

        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text style={styles.muted}>Subtotal</Text>
            <Text>{currency(inv.subtotal)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.muted}>Impuesto</Text>
            <Text>{currency(inv.taxTotal)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.grand}>Total</Text>
            <Text style={styles.grand}>{currency(inv.total)}</Text>
          </View>
        </View>

        {inv.notes ? <Text style={styles.notes}>Notas: {inv.notes}</Text> : null}
      </Page>
    </Document>
  );
}

export async function downloadInvoicePdf(invoiceId: string) {
  const inv = await api.get<ApiInvoiceDetail>(`/invoices/${invoiceId}`);
  const blob = await pdf(<InvoiceDoc inv={inv} />).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${inv.number}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
