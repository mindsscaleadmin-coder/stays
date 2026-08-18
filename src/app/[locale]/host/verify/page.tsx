import { setRequestLocale } from "next-intl/server";
import { HostGetVerifiedContent } from "@/components/dashboard/host-get-verified-content";

export default async function HostVerifyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <HostGetVerifiedContent />;
}
