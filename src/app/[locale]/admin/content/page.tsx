import { setRequestLocale } from "next-intl/server";
import { AdminContentPolicyContent } from "@/components/dashboard/admin-content-policy-content";

export default async function AdminContentPolicyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <AdminContentPolicyContent />;
}
