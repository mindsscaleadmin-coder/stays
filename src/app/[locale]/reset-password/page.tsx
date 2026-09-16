import { setRequestLocale } from "next-intl/server";
import { ResetPasswordContent } from "@/components/auth/reset-password-content";

export default async function ResetPasswordPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <ResetPasswordContent />;
}
