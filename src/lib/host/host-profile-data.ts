import type { HostPublicProfile, HostPublicProfileInput } from "./host-profile-types";
import { emitSyncEvent } from "@/lib/emit-sync-event";

const STORAGE_KEY = "farm-stays-host-profiles";
export const HOST_PROFILES_SYNC_EVENT = "farm-stays-host-profiles-sync";

type Store = Record<string, HostPublicProfile>;

function loadStore(): Store {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Store;
  } catch {
    return {};
  }
}

function saveStore(store: Store) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  emitSyncEvent(HOST_PROFILES_SYNC_EVENT);
}

export function defaultHostPublicProfile(
  hostId: string,
  fallbackName = ""
): HostPublicProfile {
  return {
    hostId,
    displayName: fallbackName,
    companyName: "",
    bio: "",
    city: "",
    whatsapp: "",
    preferWhatsapp: false,
    instantBookEnabled: false,
  };
}

export function loadHostPublicProfile(
  hostId: string,
  fallbackName = ""
): HostPublicProfile {
  const store = loadStore();
  const stored = store[hostId];
  if (!stored) return defaultHostPublicProfile(hostId, fallbackName);
  return {
    ...defaultHostPublicProfile(hostId, fallbackName),
    ...stored,
    hostId,
    companyName: stored.companyName ?? "",
    instantBookEnabled: stored.instantBookEnabled ?? false,
  };
}

export function saveHostPublicProfile(
  hostId: string,
  input: HostPublicProfileInput
): HostPublicProfile {
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
  const store = loadStore();
  store[hostId] = next;
  saveStore(store);
  return next;
}
