import { setRequestLocale } from "next-intl/server";
import { HostNewListingContent } from "@/components/dashboard/host-new-listing-content";

export default async function NewListingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <HostNewListingContent />;
}
