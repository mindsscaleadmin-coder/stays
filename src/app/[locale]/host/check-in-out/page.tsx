import { setRequestLocale } from "next-intl/server";
import { HostCheckInOutContent } from "@/components/dashboard/host-check-in-out-content";

export default async function HostCheckInOutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <HostCheckInOutContent />;
}
