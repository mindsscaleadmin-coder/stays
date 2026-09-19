import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { buildRootMetadata } from "@/lib/seo/resolve-server-seo";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { SiteChrome } from "@/components/layout/site-chrome";
import { SiteFavicon } from "@/components/layout/site-favicon";
import { OrganizationJsonLd } from "@/components/seo/organization-json-ld";
import { SiteSeoHead } from "@/components/seo/site-seo-head";
import { AuthProvider } from "@/components/providers/auth-provider";
import { AppProviders } from "@/components/providers/app-providers";

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  return buildRootMetadata(cookieStore.toString());
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as Locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages}>
      <AuthProvider>
        <AppProviders>
          <SiteSeoHead />
          <OrganizationJsonLd />
          <SiteFavicon />
          <SiteChrome>{children}</SiteChrome>
        </AppProviders>
      </AuthProvider>
    </NextIntlClientProvider>
  );
}
