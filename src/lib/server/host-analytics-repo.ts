import { prisma } from "@/lib/prisma";
import { resolveHostName } from "@/lib/admin/trust-data";
import { defaultHostAnalytics } from "@/lib/host/host-analytics-data";
import type { HostAnalyticsData } from "@/lib/host/host-analytics-types";

type StoredAnalytics = Omit<HostAnalyticsData, "hostId">;

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

function parsePayload(raw: string): StoredAnalytics | null {
  try {
    return JSON.parse(raw) as StoredAnalytics;
  } catch {
    return null;
  }
}

function merge(hostId: string, stored: StoredAnalytics | null): HostAnalyticsData {
  const defaults = defaultHostAnalytics(hostId);
  if (!stored) return defaults;
  return {
    ...defaults,
    ...stored,
    hostId,
    occupancyTrend: Array.isArray(stored.occupancyTrend)
      ? stored.occupancyTrend
      : defaults.occupancyTrend,
    bookingTrend: Array.isArray(stored.bookingTrend)
      ? stored.bookingTrend
      : defaults.bookingTrend,
    revenueMonthly: Array.isArray(stored.revenueMonthly)
      ? stored.revenueMonthly
      : defaults.revenueMonthly,
    revenueYearly: Array.isArray(stored.revenueYearly)
      ? stored.revenueYearly
      : defaults.revenueYearly,
    demographics: stored.demographics
      ? { ...defaults.demographics, ...stored.demographics }
      : defaults.demographics,
    benchmarks: Array.isArray(stored.benchmarks) ? stored.benchmarks : defaults.benchmarks,
  };
}

export async function getHostAnalytics(hostId: string): Promise<HostAnalyticsData> {
  await ensureHostUser(hostId);
  const row = await prisma.hostAnalytics.findUnique({ where: { hostId } });
  return merge(hostId, row ? parsePayload(row.payload) : null);
}

export async function saveHostAnalytics(data: HostAnalyticsData): Promise<HostAnalyticsData> {
  await ensureHostUser(data.hostId);
  const { hostId, ...payload } = data;
  await prisma.hostAnalytics.upsert({
    where: { hostId },
    create: { hostId, payload: JSON.stringify(payload) },
    update: { payload: JSON.stringify(payload) },
  });
  return data;
}
