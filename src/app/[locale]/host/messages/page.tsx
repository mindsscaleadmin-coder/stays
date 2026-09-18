import { setRequestLocale } from "next-intl/server";
import { HostMessagesContent } from "@/components/dashboard/host-messages-content";

export default async function HostMessagesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <HostMessagesContent />;
}
