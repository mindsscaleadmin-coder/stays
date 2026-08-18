import { setRequestLocale } from "next-intl/server";
import { HostDashboardContent } from "@/components/dashboard/host-dashboard-content";

export default async function HostDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <HostDashboardContent />;
}
