import { setRequestLocale } from "next-intl/server";
import { HostSupportContent } from "@/components/dashboard/host-support-content";

export default async function HostSupportPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <HostSupportContent />;
}
