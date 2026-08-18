import { setRequestLocale } from "next-intl/server";
import { AdminReviewsSettingsContent } from "@/components/dashboard/admin-reviews-settings-content";

export default async function AdminSettingsReviewsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <AdminReviewsSettingsContent />;
}
