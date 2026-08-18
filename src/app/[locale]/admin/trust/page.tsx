import { setRequestLocale } from "next-intl/server";
import { AdminTrustContent } from "@/components/dashboard/admin-trust-content";

export default async function AdminTrustPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <AdminTrustContent />;
}
