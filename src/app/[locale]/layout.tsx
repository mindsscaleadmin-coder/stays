import type { Metadata } from "next";
import { Inter, Poppins } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { SiteChrome } from "@/components/layout/site-chrome";
import { SiteFavicon } from "@/components/layout/site-favicon";
import { AuthProvider } from "@/components/providers/auth-provider";
import { AppProviders } from "@/components/providers/app-providers";
import "../globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Greenfield Farm Stays",
    template: "%s | Greenfield Farm Stays",
  },
  description:
    "Discover authentic farm stays and homestays across the UAE. Book verified properties with instant confirmation.",
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
    <html lang={locale} dir="ltr" suppressHydrationWarning>
      <body className={`${inter.variable} ${poppins.variable} font-sans`} suppressHydrationWarning>
        <NextIntlClientProvider messages={messages}>
          <AuthProvider>
            <AppProviders>
              <SiteFavicon />
              <SiteChrome>{children}</SiteChrome>
            </AppProviders>
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
