import { redirect } from "@/i18n/routing";
import { setRequestLocale } from "next-intl/server";

/** Legacy path — create flow lives at /host/new-listing. */
export default async function LegacyNewListingRedirect({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  const query = await searchParams;
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (typeof value === "string") {
      qs.set(key, value);
    } else if (Array.isArray(value)) {
      value.forEach((entry) => qs.append(key, entry));
    }
  }
  const href = qs.size > 0 ? `/host/new-listing?${qs.toString()}` : "/host/new-listing";
  setRequestLocale(locale);
  redirect({ href, locale });
}
