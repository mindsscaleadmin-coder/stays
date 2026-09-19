import type { Metadata } from "next";
import { cookies } from "next/headers";
import { setRequestLocale } from "next-intl/server";
import { HomePageContent } from "@/components/home/home-page-content";
import { HERO_BG } from "@/lib/mock/data";
import { resolveSeoForCountry } from "@/lib/admin/seo-settings-data";
import {
  loadServerSeoSettings,
  metadataFromSeoProfile,
} from "@/lib/seo/resolve-server-seo";
import { readCountryCodeFromCookieHeader } from "@/lib/seo/country-seo-cookie";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const settings = await loadServerSeoSettings();
  const profile = resolveSeoForCountry(
    settings,
    readCountryCodeFromCookieHeader(cookieStore.toString())
  );

  return {
    ...metadataFromSeoProfile(profile, {
      title: profile.siteName,
      path: "/",
      hreflang: true,
      settings,
    }),
    title: { absolute: profile.siteName },
  };
}

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
