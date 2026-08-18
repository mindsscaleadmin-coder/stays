import { prisma } from "@/lib/prisma";
import {
  defaultForHost,
  mergeCertificationsWithCatalog,
} from "@/lib/host/host-trust-data";
import type {
  FarmCertification,
  HostTrustData,
  SafetyCheckItem,
} from "@/lib/host/host-trust-types";
import { getTrustAdminSettings } from "@/lib/server/trust-admin-repo";
import { resolveHostName } from "@/lib/admin/trust-data";
import type { PendingCertification, TrustBadgeDefinition } from "@/lib/admin/trust-data";

type StoredTrust = {
  certifications: FarmCertification[];
  safetyChecklist: SafetyCheckItem[];
};

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

function mergeStored(
  hostId: string,
  stored: StoredTrust | null,
  catalog: TrustBadgeDefinition[]
) {
  const defaults = defaultForHost(hostId);
  const base: HostTrustData = stored
    ? {
        ...defaults,
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
    certifications: mergeCertificationsWithCatalog(
      base.certifications,
      catalog.map((b) => ({ ...b, enabled: true }))
    ),
  };
}

export async function getHostTrust(hostId: string): Promise<HostTrustData> {
  await ensureHostUser(hostId);
  const adminSettings = await getTrustAdminSettings();
  const row = await prisma.hostTrust.findUnique({ where: { hostId } });
  const stored = row ? (JSON.parse(row.payload) as StoredTrust) : null;
  return mergeStored(hostId, stored, adminSettings.badgeCatalog);
}

export async function saveHostTrust(data: HostTrustData): Promise<HostTrustData> {
  await ensureHostUser(data.hostId);
  const { hostId, ...payload } = data;
  await prisma.hostTrust.upsert({
    where: { hostId },
    create: { hostId, payload: JSON.stringify(payload) },
    update: { payload: JSON.stringify(payload) },
  });
  return getHostTrust(hostId);
}

export async function toggleSafetyItem(hostId: string, itemId: string) {
  const data = await getHostTrust(hostId);
  const safetyChecklist = data.safetyChecklist.map((item) =>
    item.id === itemId ? { ...item, checked: !item.checked } : item
  );
  return saveHostTrust({ ...data, safetyChecklist });
}

export async function submitCertificationForReview(
  hostId: string,
  certId: string,
  documentName: string
) {
  const data = await getHostTrust(hostId);
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
  return saveHostTrust({ ...data, certifications });
}

export async function reviewFarmCertification(
  hostId: string,
  certId: string,
  status: "verified" | "rejected" | "none",
  reviewNote?: string
) {
  const data = await getHostTrust(hostId);
  const certifications = data.certifications.map((cert) => {
    if (cert.id !== certId) return cert;
    return {
      ...cert,
      status,
      reviewNote: reviewNote?.trim() || undefined,
      verifiedAt:
        status === "verified" ? new Date().toISOString().slice(0, 10) : cert.verifiedAt,
    };
  });
  return saveHostTrust({ ...data, certifications });
}

export async function listPendingCertifications(): Promise<PendingCertification[]> {
  const rows = await prisma.hostTrust.findMany();
  const pending: PendingCertification[] = [];

  for (const row of rows) {
    const data = await getHostTrust(row.hostId);
    for (const cert of data.certifications) {
      if (cert.status === "pending") {
        pending.push({
          hostId: row.hostId,
          hostName: resolveHostName(row.hostId),
          certification: cert,
        });
      }
    }
  }
  return pending;
}

export async function listVerifiedCertificationsForHost(hostId: string) {
  const data = await getHostTrust(hostId);
  return data.certifications.filter((c) => c.status === "verified");
}
