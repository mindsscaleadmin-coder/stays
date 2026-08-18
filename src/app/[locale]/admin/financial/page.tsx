import { setRequestLocale } from "next-intl/server";
import { AdminFinancialContent } from "@/components/dashboard/admin-financial-content";

export default async function AdminFinancialPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <AdminFinancialContent />;
}
