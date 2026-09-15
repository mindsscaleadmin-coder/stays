import { setRequestLocale } from "next-intl/server";
import { AdminFiltersPageLoader } from "@/components/dashboard/admin-filters-page-loader";

export default async function AdminSettingsFiltersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <AdminFiltersPageLoader />;
}
