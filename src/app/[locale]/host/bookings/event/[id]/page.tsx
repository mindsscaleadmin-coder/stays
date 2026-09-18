import { setRequestLocale } from "next-intl/server";
import { HostEventBookingDetailContent } from "@/components/dashboard/host-event-booking-detail-content";

export default async function HostEventBookingDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  return <HostEventBookingDetailContent requestId={id} />;
}
