import { setRequestLocale } from "next-intl/server";
import { AdminSupportContactSettingsContent } from "@/components/dashboard/admin-support-contact-settings-content";

export default async function AdminSupportContactSettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <AdminSupportContactSettingsContent />;
}
