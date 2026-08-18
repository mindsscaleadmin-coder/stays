import { setRequestLocale } from "next-intl/server";
import { HostPromoteContent } from "@/components/dashboard/host-promote-content";

export default async function HostPromotePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <HostPromoteContent />;
}
