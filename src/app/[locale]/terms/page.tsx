import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { SiteInfoPage } from "@/components/layout/site-info-page";
import { publicPageMetadata } from "@/lib/seo/site";

export const metadata: Metadata = publicPageMetadata({
  title: "Terms of service",
  description: "Terms of service for using Greenfield Farm Stays.",
  path: "/terms",
});

export default async function TermsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <SiteInfoPage title="Terms of service">
      <p>
        By using Greenfield you agree to book in good faith, pay the quoted total, and follow the
        house rules on each listing. Hosts agree to honour confirmed stays and keep calendars
        accurate.
      </p>
      <p>
        Platform fees and host payouts follow the totals shown at checkout. Disputes are handled
        from the booking thread and, if needed, by platform support.
      </p>
    </SiteInfoPage>
  );
}
