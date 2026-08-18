import { prisma } from "@/lib/prisma";
import { resolveHostName } from "@/lib/admin/trust-data";
import { defaultHostAddons } from "@/lib/host/host-addons-data";
import type { HostAddonsData } from "@/lib/host/host-addons-types";

type StoredAddons = Omit<HostAddonsData, "hostId">;

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

function parsePayload(raw: string): StoredAddons | null {
  try {
    return JSON.parse(raw) as StoredAddons;
  } catch {
    return null;
  }
}

function merge(hostId: string, stored: StoredAddons | null): HostAddonsData {
  const defaults = defaultHostAddons(hostId);
  if (!stored) return defaults;
  return {
    ...defaults,
    ...stored,
    hostId,
    activities: Array.isArray(stored.activities) ? stored.activities : defaults.activities,
    products: Array.isArray(stored.products) ? stored.products : defaults.products,
    weatherAdvisories: Array.isArray(stored.weatherAdvisories)
      ? stored.weatherAdvisories
      : defaults.weatherAdvisories,
  };
}

export async function getHostAddons(hostId: string): Promise<HostAddonsData> {
  const row = await prisma.hostAddons.findUnique({ where: { hostId } });
  return merge(hostId, row ? parsePayload(row.payload) : null);
}

export async function saveHostAddons(data: HostAddonsData): Promise<HostAddonsData> {
  await ensureHostUser(data.hostId);
  const { hostId, ...payload } = data;
  await prisma.hostAddons.upsert({
    where: { hostId },
    create: { hostId, payload: JSON.stringify(payload) },
    update: { payload: JSON.stringify(payload) },
  });
  return data;
}
