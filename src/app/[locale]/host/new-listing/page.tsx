import { setRequestLocale } from "next-intl/server";
import { HostListingFormPageLoader } from "@/components/dashboard/host-listing-form-page-loader";

export default async function NewListingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <HostListingFormPageLoader />;
}
