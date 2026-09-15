import type { TrustAdminSettings } from "@/lib/admin/trust-data";
import type { PendingCertification } from "@/lib/admin/trust-data";
import { isSharedDbEnabled } from "@/lib/shared-db";

export function shouldUseSharedTrust() {
  return isSharedDbEnabled();
}

const TRUST_PULL_TTL_MS = 8_000;
let trustSettingsCache: TrustAdminSettings | null = null;
let trustSettingsFetchedAt = 0;
let trustSettingsInflight: Promise<TrustAdminSettings> | null = null;
let pendingCertsCache: PendingCertification[] | null = null;
let pendingCertsFetchedAt = 0;
let pendingCertsInflight: Promise<PendingCertification[]> | null = null;

export async function fetchTrustAdminSettingsFromApi(
  admin = false,
  force = false
): Promise<TrustAdminSettings> {
  if (!admin) {
    const res = await fetch("/api/platform/trust-settings", { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to load trust settings");
    const data = (await res.json()) as { settings: TrustAdminSettings };
    return data.settings;
  }
  if (!force && trustSettingsInflight) return trustSettingsInflight;
  if (!force && trustSettingsCache && Date.now() - trustSettingsFetchedAt < TRUST_PULL_TTL_MS) {
    return trustSettingsCache;
  }

  trustSettingsInflight = (async () => {
    try {
      const res = await fetch("/api/platform/trust-settings?admin=1", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load trust settings");
      const data = (await res.json()) as { settings: TrustAdminSettings };
      trustSettingsCache = data.settings;
      trustSettingsFetchedAt = Date.now();
      return data.settings;
    } catch {
      if (trustSettingsCache) return trustSettingsCache;
      throw new Error("Failed to load trust settings");
    } finally {
      trustSettingsInflight = null;
    }
  })();

  return trustSettingsInflight;
}

export async function saveTrustAdminSettingsToApi(
  settings: TrustAdminSettings
): Promise<TrustAdminSettings> {
  const res = await fetch("/api/platform/trust-settings", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(settings),
  });
  if (!res.ok) throw new Error("Failed to save trust settings");
  const data = (await res.json()) as { settings: TrustAdminSettings };
  return data.settings;
}

export async function fetchPendingCertificationsFromApi(
  force = false
): Promise<PendingCertification[]> {
  if (!force && pendingCertsInflight) return pendingCertsInflight;
  if (!force && pendingCertsCache && Date.now() - pendingCertsFetchedAt < TRUST_PULL_TTL_MS) {
    return pendingCertsCache;
  }

  pendingCertsInflight = (async () => {
    try {
      const res = await fetch("/api/admin/trust", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load pending certifications");
      const data = (await res.json()) as { pending: PendingCertification[] };
      pendingCertsCache = data.pending;
      pendingCertsFetchedAt = Date.now();
      return data.pending;
    } catch {
      return pendingCertsCache ?? [];
    } finally {
      pendingCertsInflight = null;
    }
  })();

  return pendingCertsInflight;
}

export async function reviewCertificationViaApi(input: {
  hostId: string;
  certId: string;
  status: "verified" | "rejected" | "none";
  note?: string;
}) {
  const res = await fetch("/api/admin/trust", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error("Failed to review certification");
  return res.json();
}
