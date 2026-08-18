import { setRequestLocale } from "next-intl/server";
import { AdminHostDetailContent } from "@/components/dashboard/admin-host-detail-content";

export default async function AdminHostDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  return <AdminHostDetailContent hostId={id} />;
}
