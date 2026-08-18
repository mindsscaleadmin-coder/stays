import { setRequestLocale } from "next-intl/server";
import { AdminResetPasswordContent } from "@/components/auth/admin-reset-password-content";

export default async function AdminResetPasswordPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <AdminResetPasswordContent />;
}
