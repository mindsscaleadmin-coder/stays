import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import { HostHouseRulesContent } from "@/components/dashboard/host-house-rules-content";

export default async function HostHouseRulesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <Suspense fallback={null}>
      <HostHouseRulesContent />
    </Suspense>
  );
}
