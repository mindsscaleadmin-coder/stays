import { setRequestLocale } from "next-intl/server";
import { CheckoutContent } from "@/components/booking/checkout-content";

export default async function CheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; listingId: string }>;
  searchParams: Promise<{
    checkIn?: string;
    checkOut?: string;
    guests?: string;
    rooms?: string;
    experiences?: string;
    extras?: string;
    kind?: string;
    date?: string;
    session?: string;
  }>;
}) {
  const { locale, listingId } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);

  const guests = Math.max(1, Math.min(50, Number(sp.guests) || 1));
  const rooms = sp.rooms ? sp.rooms.split(",").filter(Boolean) : [];
  const experienceIds = sp.experiences ? sp.experiences.split(",").filter(Boolean) : [];
  const extraIds = sp.extras ? sp.extras.split(",").filter(Boolean) : [];
  const kind = sp.kind === "experience" ? "experience" : "stay";

  return (
    <CheckoutContent
      listingId={listingId}
      kind={kind}
      checkIn={sp.checkIn ?? ""}
      checkOut={sp.checkOut ?? ""}
      date={sp.date ?? sp.checkIn ?? ""}
      sessionKey={sp.session ?? ""}
      guests={guests}
      rooms={rooms}
      experienceIds={experienceIds}
      extraIds={extraIds}
    />
  );
}
