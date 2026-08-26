import { setRequestLocale } from "next-intl/server";
import { ListingDetailContent } from "@/components/listing/listing-detail-content";
import { SubmissionListingLoader } from "@/components/listing/submission-listing-loader";
import { getPublicStayById } from "@/lib/listings/public-listings-server";

export const revalidate = 60;

export default async function ListingPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const stay = await getPublicStayById(id);
  if (stay) return <ListingDetailContent stay={stay} />;

  return <SubmissionListingLoader id={id} />;
}
