import { setRequestLocale } from "next-intl/server";
import { HostBookingsContent } from "@/components/dashboard/host-bookings-content";

export default async function HostBookingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <HostBookingsContent />;
}
