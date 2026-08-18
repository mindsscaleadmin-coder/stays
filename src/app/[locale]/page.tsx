import { setRequestLocale } from "next-intl/server";
import { HomePageContent } from "@/components/home/home-page-content";

export const revalidate = 60;

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <HomePageContent />;
}
