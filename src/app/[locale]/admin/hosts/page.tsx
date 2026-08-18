import { setRequestLocale } from "next-intl/server";
import { AdminHostsContent } from "@/components/dashboard/admin-hosts-content";

export default async function AdminHostsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <AdminHostsContent />;
}
