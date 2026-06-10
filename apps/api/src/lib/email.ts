// ============================================================
// Outbound email via Resend's HTTP API (no SDK dependency).
// Feature-flagged: enabled only when RESEND_API_KEY is set, so the
// app runs fine without it and "turns on" with the key.
// ============================================================

export function emailEnabled(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailInput): Promise<void> {
  const from = process.env.EMAIL_FROM ?? "Cash Pro <onboarding@resend.dev>";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to: [to], subject, html }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Email provider error ${res.status}: ${body.slice(0, 200)}`);
  }
}

/** Branded, customer-facing invoice email with the public share link. */
export function invoiceEmailHtml(opts: {
  companyName: string;
  accentColor: string;
  invoiceNumber: string;
  total: string;
  dueDate?: string;
  publicUrl: string;
  footerNote?: string;
  reminder?: boolean;
}): string {
  const accent = opts.accentColor || "#16a34a";
  const title = opts.reminder
    ? `Recordatorio: factura ${opts.invoiceNumber} pendiente`
    : `Factura ${opts.invoiceNumber} de ${opts.companyName}`;
  return `<!doctype html>
<html><body style="margin:0;background:#f4f5f7;font-family:Arial,Helvetica,sans-serif;color:#111">
  <div style="max-width:520px;margin:24px auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
    <div style="padding:20px 24px;border-bottom:1px solid #e5e7eb">
      <h2 style="margin:0;color:${accent};font-size:18px">${opts.companyName}</h2>
    </div>
    <div style="padding:24px">
      <p style="margin:0 0 12px;font-size:15px">${title}</p>
      <p style="margin:0 0 4px;font-size:24px;font-weight:bold">${opts.total}</p>
      ${opts.dueDate ? `<p style="margin:0 0 16px;font-size:13px;color:#666">Vence: ${opts.dueDate}</p>` : ""}
      <a href="${opts.publicUrl}"
         style="display:inline-block;margin-top:8px;padding:12px 20px;background:${accent};color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:bold">
        Ver factura y descargar PDF
      </a>
      <p style="margin:20px 0 0;font-size:12px;color:#999">Si el botón no funciona, copia este enlace:<br/>${opts.publicUrl}</p>
    </div>
    ${opts.footerNote ? `<div style="padding:14px 24px;border-top:1px solid #e5e7eb;font-size:12px;color:#666;text-align:center">${opts.footerNote}</div>` : ""}
  </div>
</body></html>`;
}
