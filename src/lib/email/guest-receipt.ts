import { formatMoney } from "@/lib/currency";
import type { GuestQuoteSnapshot } from "@/lib/booking/guest-quote-snapshot";
import { escapeHtml } from "@/lib/email/escape-html";

export type GuestInvoiceEmailInput = {
  bookingReference: string;
  issuedAt: Date;
  guestName: string;
  propertyTitle: string;
  checkIn: Date;
  checkOut: Date | null;
  guestCount: number;
  quote: GuestQuoteSnapshot;
  tripsUrl: string;
};

function formatInvoiceDate(d: Date): string {
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function formatStayDates(checkIn: Date, checkOut: Date | null): string {
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  const end = checkOut ?? checkIn;
  return `${fmt(checkIn)} → ${fmt(end)}`;
}

function money(currency: string, amount: number): string {
  return formatMoney(amount, { currency, style: "code" });
}

export function buildGuestInvoiceText(input: GuestInvoiceEmailInput): string {
  const { quote } = input;
  const taxLabel = quote.taxLabel;
  const lines = [
    "INVOICE",
    input.bookingReference,
    "",
    `Issued          ${formatInvoiceDate(input.issuedAt)}`,
    `Guest           ${input.guestName}`,
    `Property        ${input.propertyTitle}`,
    `Stay dates      ${formatStayDates(input.checkIn, input.checkOut)} · ${input.guestCount} guest${input.guestCount === 1 ? "" : "s"}`,
    "",
    `Property rate (${taxLabel} inclusive)    ${money(quote.currency, quote.propertyRate)}`,
    quote.taxAmount > 0
      ? `${taxLabel} (${quote.taxPct}%, included)             ${money(quote.currency, quote.taxAmount)}`
      : null,
    "────────────────────────────────────",
    `Total paid                            ${money(quote.currency, quote.total)}`,
    "",
    `Farm Stays · Booking reference ${input.bookingReference}`,
    "Keep this email as your receipt for this booking.",
    "",
    `View your trips: ${input.tripsUrl}`,
  ].filter(Boolean);

  return lines.join("\n");
}

export function buildGuestInvoiceHtml(input: GuestInvoiceEmailInput): string {
  const { quote } = input;
  const taxLabel = escapeHtml(quote.taxLabel);
  const bookingReference = escapeHtml(input.bookingReference);
  const guestName = escapeHtml(input.guestName);
  const propertyTitle = escapeHtml(input.propertyTitle);
  const tripsUrl = escapeHtml(input.tripsUrl);
  const stayDates = escapeHtml(formatStayDates(input.checkIn, input.checkOut));
  const taxRow =
    quote.taxAmount > 0
      ? `<tr>
          <td style="padding:8px 0;color:#9ca3af;font-size:14px;">${taxLabel} (${quote.taxPct}%, included)</td>
          <td style="padding:8px 0;color:#e5e7eb;font-size:14px;text-align:right;">${money(quote.currency, quote.taxAmount)}</td>
        </tr>`
      : "";

  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:24px;background:#111827;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:480px;margin:0 auto;background:#1f2937;border-radius:16px;padding:28px;color:#e5e7eb;">
    <p style="margin:0 0 4px;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#6b7280;">Invoice</p>
    <h1 style="margin:0 0 24px;font-size:28px;font-weight:700;color:#f9fafb;">${bookingReference}</h1>

    <table style="width:100%;border-collapse:collapse;margin-bottom:24px;font-size:14px;">
      <tr><td style="padding:4px 0;color:#9ca3af;width:110px;">Issued</td><td style="padding:4px 0;color:#e5e7eb;">${formatInvoiceDate(input.issuedAt)}</td></tr>
      <tr><td style="padding:4px 0;color:#9ca3af;">Guest</td><td style="padding:4px 0;color:#e5e7eb;">${guestName}</td></tr>
      <tr><td style="padding:4px 0;color:#9ca3af;">Property</td><td style="padding:4px 0;color:#e5e7eb;">${propertyTitle}</td></tr>
      <tr><td style="padding:4px 0;color:#9ca3af;">Stay dates</td><td style="padding:4px 0;color:#e5e7eb;">${stayDates} · ${input.guestCount} guest${input.guestCount === 1 ? "" : "s"}</td></tr>
    </table>

    <table style="width:100%;border-collapse:collapse;margin-bottom:8px;">
      <tr>
        <td style="padding:8px 0;color:#9ca3af;font-size:14px;">Property rate (${taxLabel} inclusive)</td>
        <td style="padding:8px 0;color:#e5e7eb;font-size:14px;text-align:right;">${money(quote.currency, quote.propertyRate)}</td>
      </tr>
      ${taxRow}
      <tr>
        <td colspan="2" style="padding:8px 0;border-top:1px solid #374151;"></td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#f9fafb;font-size:15px;font-weight:600;">Total paid</td>
        <td style="padding:8px 0;color:#f9fafb;font-size:15px;font-weight:600;text-align:right;">${money(quote.currency, quote.total)}</td>
      </tr>
    </table>

    <p style="margin:24px 0 4px;font-size:12px;color:#6b7280;">Farm Stays · Booking reference ${bookingReference}</p>
    <p style="margin:0 0 20px;font-size:12px;color:#6b7280;">Keep this email as your receipt for this booking.</p>
    <a href="${tripsUrl}" style="display:inline-block;background:#15803d;color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 20px;border-radius:10px;">View your trips</a>
  </div>
</body>
</html>`;
}
