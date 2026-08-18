import type { TrustAdminSettings } from "@/lib/admin/trust-data";
import type { PendingCertification } from "@/lib/admin/trust-data";
import { isSharedDbEnabled } from "@/lib/shared-db";

export function shouldUseSharedTrust() {
  return isSharedDbEnabled();
}

export async function fetchTrustAdminSettingsFromApi(
  admin = false
): Promise<TrustAdminSettings> {
  const url = admin ? "/api/platform/trust-settings?admin=1" : "/api/platform/trust-settings";
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load trust settings");
  const data = (await res.json()) as { settings: TrustAdminSettings };
  return data.settings;
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

export async function fetchPendingCertificationsFromApi(): Promise<PendingCertification[]> {
  const res = await fetch("/api/admin/trust", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load pending certifications");
  const data = (await res.json()) as { pending: PendingCertification[] };
  return data.pending;
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
