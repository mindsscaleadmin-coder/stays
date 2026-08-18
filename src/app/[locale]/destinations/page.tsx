import { setRequestLocale } from "next-intl/server";
import { DestinationsPageContent } from "@/components/destinations/destinations-page-content";

export const revalidate = 60;

export default async function DestinationsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <DestinationsPageContent />;
}
