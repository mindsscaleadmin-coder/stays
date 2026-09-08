import { setRequestLocale } from "next-intl/server";
import { SiteInfoPage } from "@/components/layout/site-info-page";

export default async function CancellationPolicyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <SiteInfoPage title="Cancellation policy">
      <p>
        Each listing shows its cancellation window at checkout. Refunds follow that policy and
        the amount already paid. Hosts see the same rules on the booking.
      </p>
      <p>
        To cancel, open the booking and use Cancel. Refunds follow the listing policy and the
        amount already paid.
      </p>
    </SiteInfoPage>
  );
}
