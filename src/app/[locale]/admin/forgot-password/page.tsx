import { setRequestLocale } from "next-intl/server";
import { AdminForgotPasswordContent } from "@/components/auth/admin-forgot-password-content";

export default async function AdminForgotPasswordPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <AdminForgotPasswordContent />;
}
