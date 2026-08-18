import { setRequestLocale } from "next-intl/server";
import { AdminUserDetailContent } from "@/components/dashboard/admin-user-detail-content";

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  return <AdminUserDetailContent userId={id} />;
}
