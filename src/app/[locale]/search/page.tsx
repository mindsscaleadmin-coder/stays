import { setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/routing";

export const revalidate = 60;

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const qs = new URLSearchParams();
  const resolved = await searchParams;
  for (const [key, value] of Object.entries(resolved)) {
    if (value) qs.set(key, value);
  }

  const query = qs.toString();
  redirect({
    href: query ? `/listings?${query}` : "/listings",
    locale,
  });
}
