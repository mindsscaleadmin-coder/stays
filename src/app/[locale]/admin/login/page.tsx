import { setRequestLocale } from "next-intl/server";
import { AdminLoginContent } from "@/components/auth/admin-login-content";

export default async function AdminLoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <AdminLoginContent />;
}
