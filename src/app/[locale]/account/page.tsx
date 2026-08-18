import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import { AccountContent } from "@/components/account/account-content";

export default async function AccountPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <Suspense fallback={null}>
      <AccountContent />
    </Suspense>
  );
}
