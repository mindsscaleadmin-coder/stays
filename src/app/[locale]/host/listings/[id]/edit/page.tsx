import { setRequestLocale } from "next-intl/server";
import { HostListingFormPageLoader } from "@/components/dashboard/host-listing-form-page-loader";

export default async function EditListingPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  return <HostListingFormPageLoader listingId={id} />;
}
