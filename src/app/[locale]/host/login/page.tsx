import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import { HostLoginContent } from "@/components/auth/host-login-content";

export default async function HostLoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <Suspense fallback={null}>
      <HostLoginContent />
    </Suspense>
  );
}
