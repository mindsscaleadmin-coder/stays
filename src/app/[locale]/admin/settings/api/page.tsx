import { setRequestLocale } from "next-intl/server";
import { AdminApiSettingsContent } from "@/components/dashboard/admin-api-settings-content";

export default async function AdminApiSettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <AdminApiSettingsContent />;
}
