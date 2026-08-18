import { setRequestLocale } from "next-intl/server";
import { AdminExtraChargesSettingsContent } from "@/components/dashboard/admin-extra-charges-settings-content";

export default async function AdminExtraChargesSettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <AdminExtraChargesSettingsContent />;
}
