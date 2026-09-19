import { setRequestLocale } from "next-intl/server";
import { AdminSeoSettingsContent } from "@/components/dashboard/admin-seo-settings-content";

export default async function AdminSeoSettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <AdminSeoSettingsContent />;
}
