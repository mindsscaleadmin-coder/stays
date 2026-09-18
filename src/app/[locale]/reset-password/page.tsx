import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { ResetPasswordContent } from "@/components/auth/reset-password-content";
import { NOINDEX_METADATA } from "@/lib/seo/site";

export const metadata: Metadata = {
  ...NOINDEX_METADATA,
  title: "Reset password",
};

export default async function ResetPasswordPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <ResetPasswordContent />;
}
