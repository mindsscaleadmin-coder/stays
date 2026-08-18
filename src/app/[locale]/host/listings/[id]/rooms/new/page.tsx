import { setRequestLocale } from "next-intl/server";
import { HostAddRoomContent } from "@/components/dashboard/host-add-room-content";

export default async function AddRoomPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  return <HostAddRoomContent listingId={id} />;
}
