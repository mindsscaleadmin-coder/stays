import { describe, expect, it } from "vitest";
import { buildGuestInvoiceHtml, buildGuestInvoiceText } from "./guest-receipt";

describe("guest receipt email", () => {
  const input = {
    bookingReference: "GS-2026-00417",
    issuedAt: new Date("2026-09-18T12:00:00Z"),
    guestName: "Fatima Al Marri",
    propertyTitle: "Green Valley Farmhouse",
    checkIn: new Date("2026-10-02T12:00:00Z"),
    checkOut: new Date("2026-10-05T12:00:00Z"),
    guestCount: 2,
    quote: {
      currency: "INR",
      propertyRate: 1180,
      taxAmount: 180,
      taxLabel: "GST",
      taxPct: 18,
      total: 1180,
    },
    tripsUrl: "https://example.com/account",
  };

  it("includes booking reference and tax line in text", () => {
    const text = buildGuestInvoiceText(input);
    expect(text).toContain("GS-2026-00417");
    expect(text).toContain("Fatima Al Marri");
    expect(text).toContain("GST (18%, included)");
    expect(text).not.toContain("commission");
    expect(text).not.toContain("Stripe");
  });

  it("uses one tax label consistently in html", () => {
    const html = buildGuestInvoiceHtml(input);
    expect(html).toContain("GST inclusive");
    expect(html).toContain("GST (18%, included)");
    expect(html).not.toContain("VAT");
  });
});
