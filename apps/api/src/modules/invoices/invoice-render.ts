import { Invoice } from '../../database/entities/invoice.entity';
import { Organization } from '../../database/entities/organization.entity';
import { Client } from '../../database/entities/client.entity';

export function renderInvoiceHtml(
  invoice: Invoice,
  org: Organization,
  client: Client,
): string {
  const fmt = (cents: number) =>
    `${invoice.currency} ${(cents / 100).toFixed(2)}`;
  const lines = invoice.lineItems
    .map(
      (l) => `
      <tr>
        <td>${escape(l.description)}</td>
        <td style="text-align:right">${l.quantity}</td>
        <td style="text-align:right">${fmt(l.unitAmount)}</td>
        <td style="text-align:right">${fmt(l.amount)}</td>
      </tr>`,
    )
    .join('');
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>${invoice.invoiceNo}</title>
<style>
  body { font-family: -apple-system, system-ui, sans-serif; color:#111; padding:32px; max-width:820px; margin:auto; }
  h1 { font-size:24px; margin:0 0 4px 0; }
  .muted { color:#555; }
  table { width:100%; border-collapse:collapse; margin:16px 0; }
  th, td { padding:8px 6px; border-bottom:1px solid #eee; font-size:13px; }
  th { background:#f6f7fb; text-align:left; }
  .totals td { border:none; padding:4px 6px; }
  .totals .lbl { text-align:right; color:#555; }
  .totals .val { text-align:right; font-weight:600; }
  .grand { border-top:2px solid #111; padding-top:6px; }
  .header { display:flex; justify-content:space-between; align-items:flex-start; }
  .footer { margin-top:32px; font-size:11px; color:#555; white-space:pre-wrap; }
</style></head><body>
<div class="header">
  <div>
    ${org.logoUrl ? `<img src="${org.logoUrl}" alt="logo" style="max-height:48px;margin-bottom:8px;">` : ''}
    <h1>${escape(org.displayName)}</h1>
    <div class="muted">${escape(org.legalName)}</div>
    ${org.taxId ? `<div class="muted">GSTIN: ${escape(org.taxId)}</div>` : ''}
  </div>
  <div style="text-align:right">
    <div style="font-size:18px;font-weight:700">INVOICE</div>
    <div>${escape(invoice.invoiceNo)}</div>
    <div class="muted">Issued: ${invoice.issueDate}</div>
    <div class="muted">Due: ${invoice.dueDate}</div>
    <div class="muted">Status: ${invoice.status}</div>
  </div>
</div>
<div style="display:flex;justify-content:space-between;margin-top:16px">
  <div>
    <div class="muted">Bill to</div>
    <div style="font-weight:600">${escape(client.legalName)}</div>
    ${client.taxId ? `<div class="muted">GSTIN: ${escape(client.taxId)}</div>` : ''}
    ${client.placeOfSupply ? `<div class="muted">Place of Supply: ${escape(client.placeOfSupply)}</div>` : ''}
  </div>
  <div>
    <div class="muted">Period</div>
    <div>${invoice.periodStart} → ${invoice.periodEnd}</div>
  </div>
</div>
<table>
  <thead><tr><th>Description</th><th style="text-align:right">Qty</th><th style="text-align:right">Unit</th><th style="text-align:right">Amount</th></tr></thead>
  <tbody>${lines}</tbody>
</table>
<table class="totals">
  <tr><td class="lbl">Subtotal</td><td class="val">${fmt(invoice.subtotal)}</td></tr>
  <tr><td class="lbl">Tax</td><td class="val">${fmt(invoice.tax)}</td></tr>
  <tr class="grand"><td class="lbl"><strong>Total</strong></td><td class="val"><strong>${fmt(invoice.total)}</strong></td></tr>
</table>
${org.bankDetails ? `<div class="muted">Pay to:<br><pre style="font-size:11px">${escape(JSON.stringify(org.bankDetails, null, 2))}</pre></div>` : ''}
${org.signingAuthority ? `<div style="margin-top:16px">For ${escape(org.displayName)}<br><br>____________________________<br><span class="muted">${escape(org.signingAuthority)}</span></div>` : ''}
${invoice.notes ? `<div class="footer">${escape(invoice.notes)}</div>` : ''}
${org.invoiceFooter ? `<div class="footer">${escape(org.invoiceFooter)}</div>` : ''}
</body></html>`;
}

function escape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
