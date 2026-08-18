import { setRequestLocale } from "next-intl/server";
import { AdminAnalyticsContent } from "@/components/dashboard/admin-analytics-content";

export default async function AdminAnalyticsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <AdminAnalyticsContent />;
}
