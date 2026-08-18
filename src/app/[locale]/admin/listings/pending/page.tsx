import { redirect } from "@/i18n/routing";

export default async function AdminPendingListingsRedirect({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect({ href: "/admin/listings?tab=queue", locale });
}
