import { prisma } from "@/lib/prisma";
import {
  defaultHostPublicProfile,
} from "@/lib/host/host-profile-data";
import type { HostPublicProfile, HostPublicProfileInput } from "@/lib/host/host-profile-types";
import { isHostDirectoryPublic } from "@/lib/host/directory-billing";
import { eventsDirectoryIsFree } from "@/lib/admin/events-subscription";
import { getFinancialSettingsFromDb } from "@/lib/server/platform-catalog-repo";
import { mergeHostProfileSubscriptionFields } from "@/lib/host/merge-host-profile-fields";
import { isEventsSubscriptionActive } from "@/lib/host/events-subscription";

function parsePayload(raw: string): Omit<HostPublicProfile, "hostId"> {
  return JSON.parse(raw) as Omit<HostPublicProfile, "hostId">;
}

function mergeProfile(
  hostId: string,
  stored: Omit<HostPublicProfile, "hostId"> | null,
  fallbackName = ""
): HostPublicProfile {
  const base = defaultHostPublicProfile(hostId, fallbackName);
  if (!stored) return base;
  return {
    ...base,
    ...stored,
    hostId,
    companyName: stored.companyName ?? "",
    instantBookEnabled: true,
  };
}

async function ensureHostUser(hostId: string, fallbackName = "Host") {
  const existing = await prisma.user.findUnique({ where: { id: hostId } });
  if (existing) return existing;
  return prisma.user.create({
    data: {
      id: hostId,
      fullName: fallbackName || "Host",
      email: `${hostId.replace(/[^a-zA-Z0-9]/g, "")}@hosts.local`,
      roles: JSON.stringify(["host"]),
      isVerified: true,
    },
  });
}

async function syncListingInstantBook(hostId: string) {
  const listings = await prisma.listing.findMany({
    where: { hostId },
    select: { id: true, payload: true },
  });
  for (const listing of listings) {
    try {
      const payload = JSON.parse(listing.payload) as Record<string, unknown>;
      if (payload.instantBook === true) continue;
      await prisma.listing.update({
        where: { id: listing.id },
        data: { payload: JSON.stringify({ ...payload, instantBook: true }) },
      });
    } catch {
      // keep listing payload if it is not JSON
    }
  }
}

export async function getHostProfile(
  hostId: string,
  fallbackName = ""
): Promise<HostPublicProfile | null> {
  const user = await prisma.user.findUnique({ where: { id: hostId } });
  if (!user) return null;

  const row = await prisma.hostProfile.findUnique({ where: { hostId } });
  const stored = row ? parsePayload(row.payload) : null;
  return mergeProfile(hostId, stored, fallbackName || user.fullName);
}

export async function saveHostProfile(
  hostId: string,
  input: HostPublicProfileInput
): Promise<HostPublicProfile> {
  const user = await ensureHostUser(hostId, input.displayName);
  const existing = await prisma.hostProfile.findUnique({ where: { hostId } });
  const stored = existing ? parsePayload(existing.payload) : null;

  const next: HostPublicProfile = {
    hostId,
    displayName: input.displayName.trim() || user.fullName,
    companyName: (input.companyName ?? "").trim(),
    bio: input.bio.trim(),
    city: input.city.trim(),
    whatsapp: input.whatsapp?.trim() || undefined,
    preferWhatsapp: input.preferWhatsapp,
    logoUrl: input.logoUrl || undefined,
    logoFileName: input.logoFileName || undefined,
    logoBytes: input.logoBytes,
    logoWidth: input.logoWidth,
    logoHeight: input.logoHeight,
    instantBookEnabled: true,
    ...mergeHostProfileSubscriptionFields(input, stored),
  };

  const { hostId: _, ...payload } = next;
  await prisma.hostProfile.upsert({
    where: { hostId },
    create: { hostId, payload: JSON.stringify(payload) },
    update: { payload: JSON.stringify(payload) },
  });

  await syncListingInstantBook(hostId);
  return next;
}

export async function isHostInstantBookEnabled(_hostId: string): Promise<boolean> {
  return true;
}

export async function listEventSubscribedHostIds(now = new Date()): Promise<string[]> {
  return listDirectorySubscribedHostIds("events", now);
}

export async function listDiningSubscribedHostIds(now = new Date()): Promise<string[]> {
  return listDirectorySubscribedHostIds("dining", now);
}

async function listDirectorySubscribedHostIds(
  vertical: "events" | "dining",
  now = new Date()
): Promise<string[]> {
  let globalFree = true;
  try {
    const settings = await getFinancialSettingsFromDb();
    globalFree = eventsDirectoryIsFree(settings.eventsSubscription);
  } catch {
    globalFree = true;
  }

  const rows = await prisma.hostProfile.findMany({ select: { hostId: true, payload: true } });
  const hostIdsWithProfile = new Set(rows.map((row) => row.hostId));
  const ids: string[] = [];

  for (const row of rows) {
    try {
      const profile = mergeProfile(row.hostId, parsePayload(row.payload));
      if (isHostDirectoryPublic(profile, vertical, globalFree, now)) {
        ids.push(row.hostId);
      }
    } catch {
      // skip
    }
  }

  if (globalFree) {
    const users = await prisma.user.findMany({
      where: { roles: { contains: "host" } },
      select: { id: true },
    });
    for (const user of users) {
      if (hostIdsWithProfile.has(user.id)) continue;
      ids.push(user.id);
    }
  }

  return Array.from(new Set(ids));
}

export async function isHostEventsSubscriptionActive(hostId: string): Promise<boolean> {
  return isHostDirectorySubscriptionActive(hostId, "events");
}

export async function isHostDiningSubscriptionActive(hostId: string): Promise<boolean> {
  return isHostDirectorySubscriptionActive(hostId, "dining");
}

export async function isHostDirectorySubscriptionActive(
  hostId: string,
  vertical: "events" | "dining"
): Promise<boolean> {
  const profile = await getHostProfile(hostId);
  let globalFree = true;
  try {
    const settings = await getFinancialSettingsFromDb();
    globalFree = eventsDirectoryIsFree(settings.eventsSubscription);
  } catch {
    globalFree = true;
  }
  return isHostDirectoryPublic(profile, vertical, globalFree);
}
