import { setRequestLocale } from "next-intl/server";
import { HostNewListingContent } from "@/components/dashboard/host-new-listing-content";

export default async function EditListingPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  return <HostNewListingContent listingId={id} />;
}
