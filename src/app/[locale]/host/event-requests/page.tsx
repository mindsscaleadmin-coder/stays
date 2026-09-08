import { setRequestLocale } from "next-intl/server";
import { HostEventRequestsContent } from "@/components/dashboard/host-event-requests-content";

export default async function HostEventRequestsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <HostEventRequestsContent />;
}
