import { setRequestLocale } from "next-intl/server";
import { BookingSuccessContent } from "@/components/booking/booking-success-content";

export default async function BookingSuccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; listingId: string }>;
  searchParams: Promise<{ bookingId?: string }>;
}) {
  const { locale, listingId } = await params;
  const { bookingId } = await searchParams;
  setRequestLocale(locale);

  return <BookingSuccessContent listingId={listingId} bookingId={bookingId} />;
}
