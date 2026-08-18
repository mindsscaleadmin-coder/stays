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
  const user = await prisma.user.findUnique({ where: { id: hostId } });
  if (!user) throw new Error("Host not found");

  const next: HostPublicProfile = {
    hostId,
    displayName: input.displayName.trim(),
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

  return next;
}

export async function isHostInstantBookEnabled(hostId: string): Promise<boolean> {
  const profile = await getHostProfile(hostId);
  return profile?.instantBookEnabled ?? false;
}
