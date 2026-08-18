import { setRequestLocale } from "next-intl/server";
import { HostAddonsContent } from "@/components/dashboard/host-addons-content";

export default async function HostAddonsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <HostAddonsContent />;
}
