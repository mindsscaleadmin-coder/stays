import { setRequestLocale } from "next-intl/server";
import { HostEnquiriesContent } from "@/components/dashboard/host-event-requests-content";

export default async function HostEnquiriesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <HostEnquiriesContent />;
}
