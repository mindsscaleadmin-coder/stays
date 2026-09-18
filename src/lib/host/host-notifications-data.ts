import type {
  HostNotificationAlert,
  HostNotificationsData,
  HostNotificationPrefs,
} from "./host-notifications-types";
import { emitSyncEvent } from "@/lib/emit-sync-event";
import {
  isAllHostsAudience,
  listingMatchesAudience,
  type AnnouncementAudience,
} from "@/lib/admin/announcement-audience";
import { loadAllSubmissions } from "@/lib/listings/submission-data";

const STORAGE_KEY = "farm-stays-host-notifications";
export const HOST_NOTIFICATIONS_SYNC_EVENT = "farm-stays-host-notifications-updated";

/** Legacy demo seed rows — strip so sidebar/inbox don't show fake unread alerts. */
const DEMO_ALERT_IDS = new Set(["n-1", "n-2", "n-3", "n-4"]);

function withoutDemoAlerts(alerts: HostNotificationAlert[]): HostNotificationAlert[] {
  return alerts.filter((alert) => !DEMO_ALERT_IDS.has(alert.id));
}

export function defaultHostNotifications(hostId: string): HostNotificationsData {
  return {
    hostId,
    prefs: {
      newBookings: true,
      paymentsReceived: true,
      reviewsPosted: true,
      policyUpdates: true,
    },
    alerts: [],
  };
}

function notify() {
  if (typeof window === "undefined") return;
  emitSyncEvent(HOST_NOTIFICATIONS_SYNC_EVENT);
}

function readAll(): Record<string, HostNotificationsData> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, HostNotificationsData>;
  } catch {
    return {};
  }
}

function writeAll(map: Record<string, HostNotificationsData>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  notify();
}

export function loadHostNotifications(hostId: string): HostNotificationsData {
  const defaults = defaultHostNotifications(hostId);
  const stored = readAll()[hostId];
  if (!stored) return defaults;
  return {
    ...defaults,
    ...stored,
    hostId,
    prefs: { ...defaults.prefs, ...stored.prefs },
    alerts: withoutDemoAlerts(
      Array.isArray(stored.alerts) ? stored.alerts : defaults.alerts
    ),
  };
}

export function saveNotificationPrefs(
  hostId: string,
  prefs: HostNotificationPrefs
): HostNotificationsData {
  const data = loadHostNotifications(hostId);
  const next = { ...data, prefs };
  writeAll({ ...readAll(), [hostId]: next });
  return next;
}

export function markAlertRead(hostId: string, alertId: string): HostNotificationsData {
  const data = loadHostNotifications(hostId);
  const alerts = data.alerts.map((a) => (a.id === alertId ? { ...a, read: true } : a));
  const next = { ...data, alerts };
  writeAll({ ...readAll(), [hostId]: next });
  return next;
}

export function markAllAlertsRead(hostId: string): HostNotificationsData {
  const data = loadHostNotifications(hostId);
  const next = { ...data, alerts: data.alerts.map((a) => ({ ...a, read: true })) };
  writeAll({ ...readAll(), [hostId]: next });
  return next;
}

const DEFAULT_NOTIFICATION_HOST_IDS = [
  "seed-host-4",
  "seed-host-5",
  "demo-host",
  "U-001",
  "U-003",
  "seed-host-1",
  "seed-host-2",
];

export function collectNotificationHostIds(): string[] {
  const ids = new Set(DEFAULT_NOTIFICATION_HOST_IDS);
  if (typeof window !== "undefined") {
    for (const key of Object.keys(readAll())) ids.add(key);
  }
  return Array.from(ids);
}

export function pushHostAlert(
  hostId: string,
  alert: Omit<HostNotificationAlert, "id" | "date" | "read"> &
    Partial<Pick<HostNotificationAlert, "id" | "date" | "read">>
): HostNotificationAlert {
  const data = loadHostNotifications(hostId);
  const nextAlert: HostNotificationAlert = {
    id: alert.id ?? `n-${alert.type}-${Date.now()}`,
    type: alert.type,
    title: alert.title,
    message: alert.message,
    date: alert.date ?? new Date().toISOString(),
    read: alert.read ?? false,
    href: alert.href,
  };
  writeAll({
    ...readAll(),
    [hostId]: { ...data, alerts: [nextAlert, ...data.alerts] },
  });
  return nextAlert;
}

function collectHostIdsForAudience(audience?: AnnouncementAudience): string[] {
  if (isAllHostsAudience(audience)) return collectNotificationHostIds();

  const ids = new Set<string>();
  for (const listing of loadAllSubmissions()) {
    if (listing.status === "rejected") continue;
    if (!listing.hostId) continue;
    if (listingMatchesAudience(listing, audience)) ids.add(listing.hostId);
  }
  return Array.from(ids);
}

/** Push a policy announcement to matching host inboxes (all hosts if no filters). */
export function pushPolicyAlertToAllHosts(
  title: string,
  message: string,
  audience?: AnnouncementAudience
): number {
  const hostIds = collectHostIdsForAudience(audience);
  const map = readAll();
  const alertId = `n-policy-${Date.now()}`;
  const date = new Date().toISOString();

  for (const hostId of hostIds) {
    const data = loadHostNotifications(hostId);
    const alert = {
      id: `${alertId}-${hostId}`,
      type: "policy" as const,
      title,
      message,
      date,
      read: false,
    };
    map[hostId] = { ...data, alerts: [alert, ...data.alerts] };
  }

  writeAll(map);
  return hostIds.length;
}
