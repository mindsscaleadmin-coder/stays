import { setRequestLocale } from "next-intl/server";
import { SiteInfoPage } from "@/components/layout/site-info-page";

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <SiteInfoPage
      title="About Greenfield"
      subtitle="Farm stays and homestays across the UAE and beyond."
    >
      <p>
        Greenfield Farm Stays connects guests with verified farms, homestays, and rural stays.
        We focus on a clear booking path: search, pay, and see the same stay on the host calendar.
      </p>
      <p>
        Hosts list properties, set availability, and manage bookings from one dashboard. Guests
        get instant or request-to-book stays with transparent pricing.
      </p>
    </SiteInfoPage>
  );
}
