import { setRequestLocale } from "next-intl/server";
import { AdminDashboardContent } from "@/components/dashboard/admin-dashboard-content";

export default async function AdminDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <AdminDashboardContent />;
}
