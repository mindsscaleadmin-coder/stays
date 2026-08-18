import { setRequestLocale } from "next-intl/server";
import { ListingDetailContent } from "@/components/listing/listing-detail-content";
import { SubmissionListingLoader } from "@/components/listing/submission-listing-loader";
import { getStayById } from "@/lib/mock/data";

export const revalidate = 60;

export default async function ListingPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const stay = getStayById(id);
  if (stay) return <ListingDetailContent stay={stay} />;

  return <SubmissionListingLoader id={id} />;
}
