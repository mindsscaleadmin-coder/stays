import { setRequestLocale } from "next-intl/server";
import AdminFiltersPageClient from "@/components/dashboard/admin-filters-page-client";

export default async function AdminSettingsFiltersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <AdminFiltersPageClient />;
}
