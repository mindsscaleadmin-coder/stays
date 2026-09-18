import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { DestinationsPageContent } from "@/components/destinations/destinations-page-content";
import { publicPageMetadata } from "@/lib/seo/site";

export const revalidate = 60;

export const metadata: Metadata = publicPageMetadata({
  title: "Destinations",
  description: "Explore farm stays and homestays by destination across the UAE and beyond.",
  path: "/destinations",
});

export default async function DestinationsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <DestinationsPageContent />;
}
