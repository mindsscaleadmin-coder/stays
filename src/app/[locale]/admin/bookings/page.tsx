import { setRequestLocale } from "next-intl/server";
import { AdminBookingsContent } from "@/components/dashboard/admin-bookings-content";

export default async function AdminBookingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <AdminBookingsContent />;
}
