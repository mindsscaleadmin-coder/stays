import { setRequestLocale } from "next-intl/server";
import { HostProfileContent } from "@/components/dashboard/host-profile-content";

export default async function HostProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <HostProfileContent />;
}
