import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { HomePageContent } from "@/components/home/home-page-content";
import { HERO_BG } from "@/lib/mock/data";
import { DEFAULT_DESCRIPTION, publicPageMetadata, SITE_NAME } from "@/lib/seo/site";

export const revalidate = 60;

export const metadata: Metadata = {
  ...publicPageMetadata({
    title: SITE_NAME,
    description: DEFAULT_DESCRIPTION,
    path: "/",
  }),
  title: { absolute: SITE_NAME },
};

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <link rel="preload" as="image" href={HERO_BG} fetchPriority="high" />
      <HomePageContent />
    </>
  );
}
