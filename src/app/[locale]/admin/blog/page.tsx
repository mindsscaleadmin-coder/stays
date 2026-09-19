import { setRequestLocale } from "next-intl/server";
import { AdminBlogContent } from "@/components/dashboard/admin-blog-content";

export default async function AdminBlogPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <AdminBlogContent />;
}
