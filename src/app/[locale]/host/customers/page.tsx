import { setRequestLocale } from "next-intl/server";
import { HostCustomersContent } from "@/components/dashboard/host-customers-content";

export default async function HostCustomersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <HostCustomersContent />;
}
