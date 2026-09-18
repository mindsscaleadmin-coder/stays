import {
  CONTENT_POLICY_SYNC_EVENT,
} from "@/lib/admin/content-policy-data";
import { loadContentPolicyClient } from "@/lib/admin/content-policy-api";
import { announcementsForHost } from "@/lib/admin/announcement-audience";
import { emitSyncEvent } from "@/lib/emit-sync-event";
import { filterHostListings } from "@/lib/listings/host-listings-utils";
import { loadAllSubmissions } from "@/lib/listings/submission-data";
import {
  HOST_NOTIFICATIONS_SYNC_EVENT,
  loadHostNotifications,
} from "@/lib/host/host-notifications-data";

export const HOST_ANNOUNCEMENT_DISMISS_KEY = "farm-stays-host-dismissed-announcements";
export const HOST_ANNOUNCEMENT_DISMISS_EVENT = "farm-stays-host-announcements-dismissed";

export function announcementKey(title: string, message: string): string {
  return `${title}\n${message}`.trim().toLowerCase();
}

export function loadDismissedAnnouncementIds(hostId?: string): string[] {
  if (!hostId || typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HOST_ANNOUNCEMENT_DISMISS_KEY);
    const map = raw ? (JSON.parse(raw) as Record<string, string[]>) : {};
    return map[hostId] ?? [];
  } catch {
    return [];
  }
}

export function saveDismissedAnnouncementIds(hostId: string, ids: string[]) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(HOST_ANNOUNCEMENT_DISMISS_KEY);
    const map = raw ? (JSON.parse(raw) as Record<string, string[]>) : {};
    map[hostId] = ids;
    localStorage.setItem(HOST_ANNOUNCEMENT_DISMISS_KEY, JSON.stringify(map));
    emitSyncEvent(HOST_ANNOUNCEMENT_DISMISS_EVENT);
  } catch {
    // ignore quota / private mode
  }
}

export async function countHostOverviewAnnouncements(
  hostId?: string,
  hostName?: string
): Promise<number> {
  if (typeof window === "undefined") return 0;

  const dismissed = new Set(loadDismissedAnnouncementIds(hostId));
  const listings = filterHostListings(loadAllSubmissions(), hostId, hostName);
  const policy = await loadContentPolicyClient();
  const fromPolicy = announcementsForHost(
    policy.platformAnnouncements,
    listings
  ).filter((announcement) => !dismissed.has(announcement.id));

  const seen = new Set(
    fromPolicy.map((announcement) => announcementKey(announcement.title, announcement.message))
  );

  let inbox = 0;
  if (hostId) {
    inbox = loadHostNotifications(hostId).alerts.filter((alert) => {
      if (alert.type !== "policy" || alert.read || dismissed.has(alert.id)) return false;
      return !seen.has(announcementKey(alert.title, alert.message));
    }).length;
  }

  return fromPolicy.length + inbox;
}

export const HOST_OVERVIEW_ANNOUNCEMENT_EVENTS = [
  CONTENT_POLICY_SYNC_EVENT,
  HOST_NOTIFICATIONS_SYNC_EVENT,
  HOST_ANNOUNCEMENT_DISMISS_EVENT,
] as const;
