import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import { AdminUsersContent } from "@/components/dashboard/admin-users-content";

export default async function AdminUsersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <Suspense fallback={null}>
      <AdminUsersContent />
    </Suspense>
  );
}
