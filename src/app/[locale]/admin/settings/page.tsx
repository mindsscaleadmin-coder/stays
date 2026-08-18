import { setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/routing";

export default async function AdminSettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  redirect({ href: "/admin/settings/home", locale });
}
