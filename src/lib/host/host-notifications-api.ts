import type { HostNotificationPrefs, HostNotificationsData } from "./host-notifications-types";
import { isSharedDbEnabled } from "@/lib/shared-db";

export function shouldUseSharedHostNotifications() {
  return isSharedDbEnabled();
}

export async function fetchHostNotificationsFromApi(
  hostId: string
): Promise<HostNotificationsData> {
  const res = await fetch(`/api/hosts/${encodeURIComponent(hostId)}/notifications`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to load notifications");
  const json = (await res.json()) as { data: HostNotificationsData };
  return json.data;
}

async function patchNotifications(
  hostId: string,
  body: Record<string, unknown>
): Promise<HostNotificationsData> {
  const res = await fetch(`/api/hosts/${encodeURIComponent(hostId)}/notifications`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Failed to update notifications");
  const json = (await res.json()) as { data: HostNotificationsData };
  return json.data;
}

export async function saveNotificationPrefsViaApi(
  hostId: string,
  prefs: HostNotificationPrefs
): Promise<HostNotificationsData> {
  return patchNotifications(hostId, { action: "savePrefs", prefs });
}

export async function markAlertReadViaApi(
  hostId: string,
  alertId: string
): Promise<HostNotificationsData> {
  return patchNotifications(hostId, { action: "markRead", alertId });
}

export async function markAllAlertsReadViaApi(hostId: string): Promise<HostNotificationsData> {
  return patchNotifications(hostId, { action: "markAllRead" });
}

export async function broadcastPolicyAlertViaApi(
  title: string,
  message: string,
  audience?: { countries?: string[]; parentCategories?: string[]; categories?: string[] }
): Promise<number> {
  const res = await fetch("/api/admin/notifications/broadcast", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title,
      message,
      countries: audience?.countries ?? [],
      parentCategories: audience?.parentCategories ?? [],
      categories: audience?.categories ?? [],
    }),
  });
  if (!res.ok) throw new Error("Failed to broadcast announcement");
  const json = (await res.json()) as { count: number };
  return json.count;
}
