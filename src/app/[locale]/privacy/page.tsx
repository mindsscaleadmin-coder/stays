import { setRequestLocale } from "next-intl/server";
import { SiteInfoPage } from "@/components/layout/site-info-page";

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <SiteInfoPage title="Privacy policy">
      <p>
        We collect the details you give us to run bookings: name, email, stay dates, and payment
        status. Hosts see guest contact for confirmed stays. We do not sell personal data.
      </p>
      <p>
        Session cookies keep you signed in. You can ask us to delete a demo or account record by
        emailing hello@greenfieldfarmstays.com.
      </p>
    </SiteInfoPage>
  );
}
