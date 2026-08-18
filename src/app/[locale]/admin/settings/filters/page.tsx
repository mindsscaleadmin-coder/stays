import { setRequestLocale } from "next-intl/server";
import { AdminFiltersContent } from "@/components/dashboard/admin-filters-content";

export default async function AdminSettingsFiltersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <AdminFiltersContent />;
}
