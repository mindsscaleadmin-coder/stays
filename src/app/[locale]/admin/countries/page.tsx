import { setRequestLocale } from "next-intl/server";
import { AdminCountriesContent } from "@/components/dashboard/admin-countries-content";

export default async function AdminCountriesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <AdminCountriesContent />;
}
