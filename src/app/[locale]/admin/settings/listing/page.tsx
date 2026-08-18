import { setRequestLocale } from "next-intl/server";
import { AdminListingSettingsContent } from "@/components/dashboard/admin-listing-settings-content";

export default async function AdminListingSettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <AdminListingSettingsContent />;
}
