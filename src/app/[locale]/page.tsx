import { setRequestLocale } from "next-intl/server";
import { HomePageContent } from "@/components/home/home-page-content";
import { HERO_BG } from "@/lib/mock/data";

export const revalidate = 60;

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
