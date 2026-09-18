import type { FarmCertification, HostTrustData, SafetyCheckItem } from "./host-trust-types";
import { loadTrustAdminSettings } from "@/lib/admin/trust-data";
import type { TrustBadgeDefinition } from "@/lib/admin/trust-data";
import { emitSyncEvent } from "@/lib/emit-sync-event";

const STORAGE_KEY = "farm-stays-host-trust";
export const HOST_TRUST_SYNC_EVENT = "farm-stays-host-trust-updated";

export function defaultForHost(hostId: string): HostTrustData {
  return {
    hostId,
    certifications: [
      {
        id: "cert-organic",
        label: "Organic certified (NPOP)",
        description: "Verified under India's National Programme for Organic Production.",
        status: "verified",
        verifiedAt: "2025-11-10",
      },
      {
        id: "cert-eco",
        label: "Eco-tourism registered",
        description: "Recognised by state or national eco-tourism programmes.",
        status: "pending",
      },
      {
        id: "cert-fssai",
        label: "FSSAI registered",
        description: "Food safety registration for on-site dining.",
        status: "none",
      },
    ],
    safetyChecklist: [
      {
        id: "safe-fire",
        label: "Fire extinguishers accessible",
        description: "Extinguishers in kitchen, main building, and cottages.",
        checked: true,
      },
      {
        id: "safe-aid",
        label: "First aid kit on site",
        description: "Stocked kit with expiry dates checked monthly.",
        checked: true,
      },
      {
        id: "safe-exits",
        label: "Emergency exits marked",
        description: "Clear signage and unobstructed paths.",
        checked: false,
      },
      {
        id: "safe-pool",
        label: "Pool safety rules posted",
        description: "Depth markers, no-diving signs, and life ring available.",
        checked: true,
      },
    ],
  };
}

/** Align host certifications with the admin badge catalog (enabled types). */
export function mergeCertificationsWithCatalog(
  certifications: FarmCertification[],
  catalog: TrustBadgeDefinition[] = loadTrustAdminSettings().badgeCatalog
): FarmCertification[] {
  const byId = new Map(certifications.map((c) => [c.id, c]));
  const enabled = catalog.filter((b) => b.enabled);

  const merged = enabled.map((badge) => {
    const existing = byId.get(badge.id);
    if (existing) {
      return {
        ...existing,
        label: badge.label,
        description: badge.description,
      };
    }
    return {
      id: badge.id,
      label: badge.label,
      description: badge.description,
      status: "none" as const,
    };
  });

  // Keep in-flight / verified badges even if admin later disables the catalog row
  for (const cert of certifications) {
    if (merged.some((m) => m.id === cert.id)) continue;
    if (cert.status === "none") continue;
    merged.push(cert);
  }

  return merged;
}

function notify() {
  if (typeof window === "undefined") return;
  emitSyncEvent(HOST_TRUST_SYNC_EVENT);
}

function readAll(): Record<string, HostTrustData> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, HostTrustData>;
  } catch {
    return {};
  }
}

function writeAll(map: Record<string, HostTrustData>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  notify();
}

export function loadHostTrust(hostId: string): HostTrustData {
  const stored = readAll()[hostId];
  const defaults = defaultForHost(hostId);
  const base = stored
    ? {
        ...defaults,
        ...stored,
        hostId,
        certifications: stored.certifications?.length
          ? stored.certifications
          : defaults.certifications,
        safetyChecklist: stored.safetyChecklist?.length
          ? stored.safetyChecklist
          : defaults.safetyChecklist,
      }
    : defaults;

  return {
    ...base,
    certifications: mergeCertificationsWithCatalog(base.certifications),
  };
}

export function saveHostTrust(data: HostTrustData): void {
  writeAll({ ...readAll(), [data.hostId]: data });
}

export function toggleSafetyItem(hostId: string, id: string): HostTrustData {
  const data = loadHostTrust(hostId);
  const safetyChecklist = data.safetyChecklist.map((item) =>
    item.id === id ? { ...item, checked: !item.checked } : item
  );
  const next = { ...data, safetyChecklist };
  saveHostTrust(next);
  return next;
}

export function updateSafetyChecklist(
  hostId: string,
  safetyChecklist: SafetyCheckItem[]
): HostTrustData {
  const data = loadHostTrust(hostId);
  const next = { ...data, safetyChecklist };
  writeAll({ ...readAll(), [hostId]: next });
  notify();
  return next;
}

const DEFAULT_TRUST_HOST_IDS = ["seed-host-4", "demo-host", "U-001"];

export function collectHostTrustHostIds(): string[] {
  const ids = new Set(DEFAULT_TRUST_HOST_IDS);
  Object.keys(readAll()).forEach((id) => ids.add(id));
  return Array.from(ids);
}

export function reviewFarmCertification(
  hostId: string,
  certId: string,
  status: "verified" | "rejected" | "none",
  reviewNote?: string
): HostTrustData | null {
  const data = loadHostTrust(hostId);
  const certifications = data.certifications.map((cert) => {
    if (cert.id !== certId) return cert;
    return {
      ...cert,
      status,
      reviewNote: reviewNote?.trim() || undefined,
      verifiedAt: status === "verified" ? new Date().toISOString().slice(0, 10) : cert.verifiedAt,
    };
  });
  if (certifications.every((c, i) => c === data.certifications[i])) return null;
  const next = { ...data, certifications };
  writeAll({ ...readAll(), [hostId]: next });
  notify();
  return next;
}

export function submitCertificationForReview(
  hostId: string,
  certId: string,
  documentName: string
): HostTrustData | null {
  const data = loadHostTrust(hostId);
  const certifications = data.certifications.map((cert) => {
    if (cert.id !== certId) return cert;
    if (cert.status === "verified") return cert;
    return {
      ...cert,
      status: "pending" as const,
      submittedAt: new Date().toISOString(),
      documentName: documentName.trim() || undefined,
    };
  });
  const next = { ...data, certifications };
  writeAll({ ...readAll(), [hostId]: next });
  notify();
  return next;
}
