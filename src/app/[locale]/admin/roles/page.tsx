import { redirect } from "@/i18n/routing";
import { setRequestLocale } from "next-intl/server";

/** Roles merged into Users & Access — keep old URL working. */
export default async function AdminRolesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  redirect({ href: "/admin/users?tab=staff", locale });
}
