import { setRequestLocale } from "next-intl/server";
import { AdminPhotoTagsSettingsContent } from "@/components/dashboard/admin-photo-tags-settings-content";

export default async function AdminPhotoTagsSettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <AdminPhotoTagsSettingsContent />;
}
