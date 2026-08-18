import { setRequestLocale } from "next-intl/server";
import { HostReviewsContent } from "@/components/dashboard/host-reviews-content";

export default async function HostReviewsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <HostReviewsContent />;
}
