import { setRequestLocale } from "next-intl/server";
import { AdminAlertsContent } from "@/components/dashboard/admin-alerts-content";

export default async function AdminAlertsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <AdminAlertsContent />;
}
