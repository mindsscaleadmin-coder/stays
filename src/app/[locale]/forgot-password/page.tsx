import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { ForgotPasswordContent } from "@/components/auth/forgot-password-content";
import { NOINDEX_METADATA } from "@/lib/seo/site";

export const metadata: Metadata = {
  ...NOINDEX_METADATA,
  title: "Forgot password",
};

export default async function ForgotPasswordPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <ForgotPasswordContent />;
}
