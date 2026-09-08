import { redirect } from "@/i18n/routing";
import { setRequestLocale } from "next-intl/server";

/** Legacy path — create flow lives at /host/new-listing. */
export default async function LegacyNewListingRedirect({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  redirect({ href: "/host/new-listing", locale });
}
