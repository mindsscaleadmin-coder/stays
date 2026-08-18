import { prisma } from "@/lib/prisma";
import { mergeTrustAdminSettings } from "@/lib/admin/trust-data";
import type { TrustAdminSettings } from "@/lib/admin/trust-data";

const SETTINGS_ID = "default";

export async function getTrustAdminSettings(): Promise<TrustAdminSettings> {
  const row = await prisma.trustCatalogSettings.findUnique({ where: { id: SETTINGS_ID } });
  if (!row) return mergeTrustAdminSettings(null);
  return mergeTrustAdminSettings(JSON.parse(row.payload) as Partial<TrustAdminSettings>);
}

export async function saveTrustAdminSettings(
  settings: TrustAdminSettings
): Promise<TrustAdminSettings> {
  const next = mergeTrustAdminSettings(settings);
  await prisma.trustCatalogSettings.upsert({
    where: { id: SETTINGS_ID },
    create: { id: SETTINGS_ID, payload: JSON.stringify(next) },
    update: { payload: JSON.stringify(next) },
  });
  return next;
}

export async function getPublicBadgeCatalog() {
  const settings = await getTrustAdminSettings();
  return settings.badgeCatalog.filter((b) => b.enabled);
}
