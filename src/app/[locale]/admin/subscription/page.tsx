import { setRequestLocale } from "next-intl/server";
import { AdminSubscriptionContent } from "@/components/dashboard/admin-subscription-content";

export default async function AdminSubscriptionPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <AdminSubscriptionContent />;
}
