import { setRequestLocale } from "next-intl/server";
import { AdminPlatformConfigContent } from "@/components/dashboard/admin-platform-config-content";

export default async function AdminPlatformConfigPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <AdminPlatformConfigContent />;
}
