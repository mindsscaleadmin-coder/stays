import { setRequestLocale } from "next-intl/server";
import { AdminHomePageSettingsContent } from "@/components/dashboard/admin-home-page-settings-content";

export default async function AdminHomePageSettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <AdminHomePageSettingsContent />;
}
