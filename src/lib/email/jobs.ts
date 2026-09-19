import { prisma } from "@/lib/prisma";
import { normalizeBookingMoney } from "@/lib/booking/normalize-booking-money";
import { sendEmail } from "./send";
import { escapeHtml } from "@/lib/email/escape-html";
import { buildGuestInvoiceHtml, buildGuestInvoiceText } from "./guest-receipt";
import {
  estimateGuestQuoteSnapshot,
  parseGuestQuoteSnapshot,
} from "@/lib/booking/guest-quote-snapshot";
import { getListingPricing } from "@/lib/server/listing-pricing-repo";
import { defaultForListing } from "@/lib/host/host-pricing-data";
import { currencyForCountryName, normalizeCurrency } from "@/lib/currency";
import { LAUNCH_CURRENCY, LAUNCH_TAX_LABEL, LAUNCH_TAX_PCT } from "@/lib/tax/launch-market";

function appUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

export async function deliverWelcomeEmail(input: {
  email: string;
  fullName?: string;
}) {
  const name = escapeHtml(input.fullName?.trim() || "there");
  const listingsUrl = escapeHtml(`${appUrl()}/listings`);
  return sendEmail({
    to: input.email,
    subject: "Welcome to Farm Stays",
    text: `Hi ${input.fullName?.trim() || "there"},\n\nYour account is ready. Browse stays at ${appUrl()}/listings\n`,
    html: `<p>Hi ${name},</p><p>Your account is ready.</p><p><a href="${listingsUrl}">Browse stays</a></p>`,
  });
}

export async function deliverInvoiceEmail(bookingId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      listing: { select: { title: true, payload: true, country: true } },
      guest: { select: { email: true, fullName: true } },
    },
  });
  if (!booking?.guest?.email) return { sent: false };
  const normalized = normalizeBookingMoney(booking);

  const pricing =
    (await getListingPricing(booking.listingId)) ?? defaultForListing(booking.listingId);
  let listingCurrency = LAUNCH_CURRENCY;
  let listingCountry = booking.listing.country ?? "";
  try {
    const payload = JSON.parse(booking.listing.payload) as { currency?: string; country?: string };
    listingCurrency = payload.currency || listingCurrency;
    listingCountry = payload.country || listingCountry;
  } catch {
    // use defaults
  }
  const currency = normalizeCurrency(
    pricing.currency || listingCurrency || currencyForCountryName(listingCountry)
  );

  const quote =
    parseGuestQuoteSnapshot(booking.guestQuoteSnapshot) ??
    estimateGuestQuoteSnapshot({
      totalPrice: normalized.totalPrice,
      currency,
      taxPct: pricing.taxPct ?? LAUNCH_TAX_PCT,
      taxLabel: pricing.taxLabel ?? LAUNCH_TAX_LABEL,
    });

  const guestName = booking.guest.fullName?.trim() || "Guest";
  const tripsUrl = `${appUrl()}/account?tab=bookings&booking=${encodeURIComponent(booking.id)}`;
  const invoiceInput = {
    bookingReference: booking.bookingReference,
    issuedAt: booking.createdAt,
    guestName,
    propertyTitle: booking.listing.title,
    checkIn: booking.checkIn,
    checkOut: booking.checkOut,
    guestCount: booking.guestCount,
    quote,
    tripsUrl,
  };

  return sendEmail({
    to: booking.guest.email,
    subject: `${booking.bookingReference} · Your receipt · ${booking.listing.title}`,
    text: buildGuestInvoiceText(invoiceInput),
    html: buildGuestInvoiceHtml(invoiceInput),
  });
}

/** @deprecated Use deliverInvoiceEmail — kept as alias for worker compatibility during transition. */
export async function deliverBookingConfirmedEmail(bookingId: string) {
  return deliverInvoiceEmail(bookingId);
}
