import type { Metadata } from "next";
import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import { SignupContent } from "@/components/auth/signup-content";
import { NOINDEX_METADATA } from "@/lib/seo/site";

export const metadata: Metadata = {
  ...NOINDEX_METADATA,
  title: "Sign up",
};

export default async function SignupPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <Suspense fallback={null}>
      <SignupContent />
    </Suspense>
  );
}
