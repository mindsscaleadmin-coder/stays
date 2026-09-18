import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { SiteInfoPage } from "@/components/layout/site-info-page";
import { SupportContactPhone } from "@/components/layout/support-contact-phone";
import { publicPageMetadata } from "@/lib/seo/site";

export const metadata: Metadata = publicPageMetadata({
  title: "Contact",
  description: "Get in touch with the Greenfield Farm Stays team. We usually reply within one business day.",
  path: "/contact",
});

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
        {" "}or call <SupportContactPhone className="text-green-700 font-medium hover:underline" />.
      </p>
      <p>For an existing booking, message the host from your trip thread so they see it on that stay.</p>
    </SiteInfoPage>
  );
}
