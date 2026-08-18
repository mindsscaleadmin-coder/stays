import { setRequestLocale } from "next-intl/server";
import { AdminListingControlContent } from "@/components/dashboard/admin-listing-control-content";

export default async function AdminListingControlPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <AdminListingControlContent />;
}
