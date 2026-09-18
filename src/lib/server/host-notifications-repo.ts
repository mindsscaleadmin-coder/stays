import { prisma } from "@/lib/prisma";
import { resolveHostName } from "@/lib/admin/trust-data";
import { defaultHostNotifications } from "@/lib/host/host-notifications-data";
import type {
  HostNotificationAlert,
  HostNotificationPrefs,
  HostNotificationsData,
} from "@/lib/host/host-notifications-types";
import {
  isAllHostsAudience,
  listingMatchesAudience,
  normalizeAnnouncementAudience,
  type AnnouncementAudience,
} from "@/lib/admin/announcement-audience";

type StoredNotifications = Omit<HostNotificationsData, "hostId">;

async function ensureHostUser(hostId: string) {
  const existing = await prisma.user.findUnique({ where: { id: hostId } });
  if (existing) return existing;
  return prisma.user.create({
    data: {
      id: hostId,
      fullName: resolveHostName(hostId),
      email: `${hostId.replace(/[^a-zA-Z0-9]/g, "")}@hosts.local`,
      roles: JSON.stringify(["host"]),
      isVerified: true,
    },
  });
}

function parsePayload(raw: string): StoredNotifications | null {
  try {
    return JSON.parse(raw) as StoredNotifications;
  } catch {
    return null;
  }
}

const DEMO_ALERT_IDS = new Set(["n-1", "n-2", "n-3", "n-4"]);

function withoutDemoAlerts(alerts: HostNotificationAlert[]): HostNotificationAlert[] {
  return alerts.filter((alert) => !DEMO_ALERT_IDS.has(alert.id));
}

function merge(
  hostId: string,
  stored: StoredNotifications | null
): HostNotificationsData {
  const defaults = defaultHostNotifications(hostId);
  if (!stored) return defaults;
  const alerts = withoutDemoAlerts(
    Array.isArray(stored.alerts) ? stored.alerts : defaults.alerts
  );
  return {
    ...defaults,
    ...stored,
    hostId,
    prefs: { ...defaults.prefs, ...stored.prefs },
    alerts,
  };
}

async function persist(data: HostNotificationsData): Promise<HostNotificationsData> {
  await ensureHostUser(data.hostId);
  const { hostId, ...payload } = data;
  await prisma.hostNotifications.upsert({
    where: { hostId },
    create: { hostId, payload: JSON.stringify(payload) },
    update: { payload: JSON.stringify(payload) },
  });
  return data;
}

export async function getHostNotifications(hostId: string): Promise<HostNotificationsData> {
  const row = await prisma.hostNotifications.findUnique({ where: { hostId } });
  return merge(hostId, row ? parsePayload(row.payload) : null);
}

export async function saveNotificationPrefs(
  hostId: string,
  prefs: HostNotificationPrefs
): Promise<HostNotificationsData> {
  const current = await getHostNotifications(hostId);
  return persist({ ...current, prefs });
}

export async function markAlertRead(
  hostId: string,
  alertId: string
): Promise<HostNotificationsData> {
  const current = await getHostNotifications(hostId);
  return persist({
    ...current,
    alerts: current.alerts.map((a) => (a.id === alertId ? { ...a, read: true } : a)),
  });
}

export async function markAllAlertsRead(hostId: string): Promise<HostNotificationsData> {
  const current = await getHostNotifications(hostId);
  return persist({
    ...current,
    alerts: current.alerts.map((a) => ({ ...a, read: true })),
  });
}

export async function collectNotificationHostIds(): Promise<string[]> {
  const [users, listingHosts, existing] = await Promise.all([
    prisma.user.findMany({
      where: { roles: { contains: "host" } },
      select: { id: true },
    }),
    prisma.listing.findMany({
      distinct: ["hostId"],
      select: { hostId: true },
    }),
    prisma.hostNotifications.findMany({ select: { hostId: true } }),
  ]);

  const ids = new Set<string>();
  for (const u of users) ids.add(u.id);
  for (const l of listingHosts) ids.add(l.hostId);
  for (const e of existing) ids.add(e.hostId);
  return Array.from(ids);
}

async function collectHostIdsForAudience(
  audience?: AnnouncementAudience
): Promise<string[]> {
  const next = normalizeAnnouncementAudience(audience);
  if (isAllHostsAudience(next)) return collectNotificationHostIds();

  const listings = await prisma.listing.findMany({
    where: { status: { not: "rejected" } },
    select: {
      hostId: true,
      country: true,
      parentCategory: true,
      category: true,
    },
  });

  const ids = new Set<string>();
  for (const listing of listings) {
    if (listingMatchesAudience(listing, next)) ids.add(listing.hostId);
  }
  return Array.from(ids);
}

export async function pushHostAlert(
  hostId: string,
  alert: Omit<HostNotificationAlert, "id" | "date" | "read"> &
    Partial<Pick<HostNotificationAlert, "id" | "date" | "read">>
): Promise<HostNotificationAlert> {
  const data = await getHostNotifications(hostId);
  const nextAlert: HostNotificationAlert = {
    id: alert.id ?? `n-${alert.type}-${Date.now()}-${hostId}`,
    type: alert.type,
    title: alert.title,
    message: alert.message,
    date: alert.date ?? new Date().toISOString(),
    read: alert.read ?? false,
    href: alert.href,
  };
  await persist({ ...data, alerts: [nextAlert, ...data.alerts] });
  return nextAlert;
}

export async function pushPolicyAlertToAllHosts(
  title: string,
  message: string,
  audience?: AnnouncementAudience
): Promise<number> {
  const hostIds = await collectHostIdsForAudience(audience);
  const date = new Date().toISOString();
  const alertId = `n-policy-${Date.now()}`;

  for (const hostId of hostIds) {
    const data = await getHostNotifications(hostId);
    const alert: HostNotificationAlert = {
      id: `${alertId}-${hostId}`,
      type: "policy",
      title,
      message,
      date,
      read: false,
    };
    await persist({ ...data, alerts: [alert, ...data.alerts] });
  }

  return hostIds.length;
}
