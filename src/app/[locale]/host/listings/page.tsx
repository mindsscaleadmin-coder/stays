import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import { HostListingsContent } from "@/components/dashboard/host-listings-content";

export default async function HostListingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <Suspense fallback={null}>
      <HostListingsContent />
    </Suspense>
  );
}
