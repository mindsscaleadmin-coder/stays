import { setRequestLocale } from "next-intl/server";
import { HostListingManageContent } from "@/components/dashboard/host-listing-manage-content";

export default async function HostListingManagePage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  return <HostListingManageContent listingId={id} />;
}
