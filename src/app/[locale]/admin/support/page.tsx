import { setRequestLocale } from "next-intl/server";
import { AdminSupportContent } from "@/components/dashboard/admin-support-content";

export default async function AdminSupportPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <AdminSupportContent />;
}
