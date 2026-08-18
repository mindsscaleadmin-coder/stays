import { setRequestLocale } from "next-intl/server";
import { HostStaffPageContent } from "@/components/dashboard/host-staff-page-content";

export default async function HostStaffPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <HostStaffPageContent />;
}
