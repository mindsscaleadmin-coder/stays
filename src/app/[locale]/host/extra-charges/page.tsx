import { setRequestLocale } from "next-intl/server";
import { HostExtraChargesContent } from "@/components/dashboard/host-extra-charges-content";

export default async function HostExtraChargesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <HostExtraChargesContent />;
}
