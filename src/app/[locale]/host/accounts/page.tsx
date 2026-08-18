import { setRequestLocale } from "next-intl/server";
import { HostAccountsContent } from "@/components/dashboard/host-accounts-content";

export default async function HostAccountsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <HostAccountsContent />;
}
