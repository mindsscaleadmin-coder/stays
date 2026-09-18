import type { ExperienceSessionTemplate } from "@/lib/booking/experience-session-types";
import type { BookingQuote } from "@/lib/booking/compute-quote";
import { normalizeCurrency } from "@/lib/currency";
import { LAUNCH_CURRENCY, LAUNCH_TAX_LABEL } from "@/lib/tax/launch-market";

export function computeExperienceQuote(input: {
  session: ExperienceSessionTemplate;
  guestCount: number;
  taxPct?: number;
  taxLabel?: string;
  currency?: string;
}): BookingQuote {
  const guests = Math.max(1, Math.floor(input.guestCount));
  const accommodation =
    input.session.priceMode === "per_group"
      ? Math.max(0, input.session.price)
      : Math.max(0, input.session.price) * guests;
  const taxPct = Math.max(0, input.taxPct ?? 0);
  const total = Math.round(accommodation * 100) / 100;
  const taxAmount =
    taxPct > 0 ? Math.round((total * taxPct) / (100 + taxPct) * 100) / 100 : 0;
  const currency = normalizeCurrency(input.currency || LAUNCH_CURRENCY);
  const taxLabel = input.taxLabel ?? LAUNCH_TAX_LABEL;

  const lines: { label: string; amount: number }[] = [
    {
      label:
        input.session.priceMode === "per_group"
          ? `${input.session.label} · private group`
          : `${input.session.label} · ${guests} guest${guests === 1 ? "" : "s"}`,
      amount: accommodation,
    },
  ];
  if (taxAmount > 0) {
    lines.push({ label: `${taxLabel} (${taxPct}%, included)`, amount: taxAmount });
  }

  return {
    nights: 0,
    accommodation,
    experiencesTotal: 0,
    extrasTotal: 0,
    taxAmount,
    total,
    currency,
    lines,
  };
}
