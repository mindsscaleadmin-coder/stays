import type { HostNotificationsData, HostNotificationPrefs } from "./host-notifications-types";
import { emitSyncEvent } from "@/lib/emit-sync-event";

const STORAGE_KEY = "farm-stays-host-notifications";
export const HOST_NOTIFICATIONS_SYNC_EVENT = "farm-stays-host-notifications-updated";

export function defaultHostNotifications(hostId: string): HostNotificationsData {
  return {
    hostId,
    prefs: {
      newBookings: true,
      paymentsReceived: true,
      reviewsPosted: true,
      policyUpdates: true,
    },
    alerts: [
      {
        id: "n-1",
        type: "booking",
        title: "New booking request",
        message: "Sarah Ahmed requested 3 nights at Green Valley Farmhouse.",
        date: "2026-07-20T09:15:00",
        read: false,
      },
      {
        id: "n-2",
        type: "payment",
        title: "Payment received",
        message: "AED 6,118 payout for booking GF-M9O2T4 is processing.",
        date: "2026-07-19T14:30:00",
        read: false,
      },
      {
        id: "n-3",
        type: "review",
        title: "New guest review",
        message: "Mehul Joshi left a 5-star review for Green Valley Farmhouse.",
        date: "2026-07-15T11:00:00",
        read: true,
      },
      {
        id: "n-4",
        type: "policy",
        title: "Platform policy update",
        message: "Updated cancellation policy for farm stays — review by Aug 1.",
        date: "2026-07-10T08:00:00",
        read: true,
      },
    ],
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
  const stored = readAll()[hostId];
  if (!stored) return defaultHostNotifications(hostId);
  return { ...defaultHostNotifications(hostId), ...stored, hostId };
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

/** Push a platform-wide policy announcement to every known host inbox. */
export function pushPolicyAlertToAllHosts(title: string, message: string): number {
  const hostIds = collectNotificationHostIds();
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
