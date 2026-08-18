import { setRequestLocale } from "next-intl/server";
import { HostPricingContent } from "@/components/dashboard/host-pricing-content";

export default async function HostPricingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <HostPricingContent />;
}
