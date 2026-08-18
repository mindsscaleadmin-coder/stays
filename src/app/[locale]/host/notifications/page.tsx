import { setRequestLocale } from "next-intl/server";
import { HostNotificationsContent } from "@/components/dashboard/host-notifications-content";

export default async function HostNotificationsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <HostNotificationsContent />;
}
