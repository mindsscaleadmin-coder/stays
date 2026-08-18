import { setRequestLocale } from "next-intl/server";
import { HostCalendarContent } from "@/components/dashboard/host-calendar-content";

export default async function HostCalendarPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <HostCalendarContent />;
}
