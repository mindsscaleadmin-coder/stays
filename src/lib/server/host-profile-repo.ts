import { prisma } from "@/lib/prisma";
import {
  defaultHostPublicProfile,
} from "@/lib/host/host-profile-data";
import type { HostPublicProfile, HostPublicProfileInput } from "@/lib/host/host-profile-types";

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
    instantBookEnabled: stored.instantBookEnabled ?? false,
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

async function syncListingInstantBook(hostId: string, enabled: boolean) {
  const listings = await prisma.listing.findMany({
    where: { hostId },
    select: { id: true, payload: true },
  });
  for (const listing of listings) {
    try {
      const payload = JSON.parse(listing.payload) as Record<string, unknown>;
      if (payload.instantBook === enabled) continue;
      await prisma.listing.update({
        where: { id: listing.id },
        data: { payload: JSON.stringify({ ...payload, instantBook: enabled }) },
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
    instantBookEnabled: input.instantBookEnabled ?? false,
  };

  const { hostId: _, ...payload } = next;
  await prisma.hostProfile.upsert({
    where: { hostId },
    create: { hostId, payload: JSON.stringify(payload) },
    update: { payload: JSON.stringify(payload) },
  });

  await syncListingInstantBook(hostId, Boolean(next.instantBookEnabled));
  return next;
}

export async function isHostInstantBookEnabled(hostId: string): Promise<boolean> {
  const profile = await getHostProfile(hostId);
  return profile?.instantBookEnabled ?? false;
}
