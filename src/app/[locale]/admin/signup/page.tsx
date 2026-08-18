import { setRequestLocale } from "next-intl/server";
import { AdminSignupContent } from "@/components/auth/admin-signup-content";

export default async function AdminSignupPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <AdminSignupContent />;
}
