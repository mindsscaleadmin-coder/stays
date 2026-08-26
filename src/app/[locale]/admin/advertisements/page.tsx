import { setRequestLocale } from "next-intl/server";
import { AdminPromotionsSettingsContent } from "@/components/dashboard/admin-promotions-settings-content";

export default async function AdminAdvertisementsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <AdminPromotionsSettingsContent />;
}
