import { setRequestLocale } from "next-intl/server";
import { HostBookingDetailContent } from "@/components/dashboard/host-booking-detail-content";

export default async function HostBookingDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  return <HostBookingDetailContent bookingId={id} />;
}
