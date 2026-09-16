import { setRequestLocale } from "next-intl/server";
import { ForgotPasswordContent } from "@/components/auth/forgot-password-content";

export default async function ForgotPasswordPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <ForgotPasswordContent />;
}
