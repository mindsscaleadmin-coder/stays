import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import { HostSignupContent } from "@/components/auth/host-signup-content";

export default async function HostSignupPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <Suspense fallback={null}>
      <HostSignupContent />
    </Suspense>
  );
}
