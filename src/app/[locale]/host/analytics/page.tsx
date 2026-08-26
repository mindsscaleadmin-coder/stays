import { redirect } from "@/i18n/routing";
import { setRequestLocale } from "next-intl/server";

/** Analytics now lives on Overview — keep the old URL working. */
export default async function HostAnalyticsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  redirect({ href: "/host", locale });
}
