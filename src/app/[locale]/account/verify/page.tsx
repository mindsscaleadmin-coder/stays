import { setRequestLocale } from "next-intl/server";
import { GetVerifiedContent } from "@/components/account/get-verified-content";

export default async function GetVerifiedPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <GetVerifiedContent />;
}
