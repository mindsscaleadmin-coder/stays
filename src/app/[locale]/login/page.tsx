import type { Metadata } from "next";
import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import { LoginContent } from "@/components/auth/login-content";
import { NOINDEX_METADATA } from "@/lib/seo/site";

export const metadata: Metadata = {
  ...NOINDEX_METADATA,
  title: "Log in",
};

export default async function LoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}
