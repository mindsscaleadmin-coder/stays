import { setRequestLocale } from "next-intl/server";
import { SiteInfoPage } from "@/components/layout/site-info-page";

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <SiteInfoPage title="Contact us" subtitle="We usually reply within one business day.">
      <p>
        Email{" "}
        <a className="text-green-700 font-medium hover:underline" href="mailto:hello@greenfieldfarmstays.com">
          hello@greenfieldfarmstays.com
        </a>
        {" "}or call +971 4 123 4567.
      </p>
      <p>For an existing booking, message the host from your trip thread so they see it on that stay.</p>
    </SiteInfoPage>
  );
}
