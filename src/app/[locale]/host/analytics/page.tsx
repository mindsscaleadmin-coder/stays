import { setRequestLocale } from "next-intl/server";
import { HostAnalyticsContent } from "@/components/dashboard/host-analytics-content";

export default async function HostAnalyticsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <HostAnalyticsContent />;
}
