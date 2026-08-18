import { prisma } from "@/lib/prisma";
import {
  mergeHostPromotionsSettings,
} from "@/lib/admin/host-promotions-settings-data";
import type { HostPromotionsSettings } from "@/lib/host/host-promotions-types";

const SETTINGS_ID = "default";

export async function getPromotionCatalogSettings(): Promise<HostPromotionsSettings> {
  const row = await prisma.promotionCatalogSettings.findUnique({
    where: { id: SETTINGS_ID },
  });
  if (!row) return mergeHostPromotionsSettings(null);
  return mergeHostPromotionsSettings(
    JSON.parse(row.payload) as Partial<HostPromotionsSettings>
  );
}

export async function savePromotionCatalogSettings(
  settings: HostPromotionsSettings
): Promise<HostPromotionsSettings> {
  const next = mergeHostPromotionsSettings(settings);
  await prisma.promotionCatalogSettings.upsert({
    where: { id: SETTINGS_ID },
    create: { id: SETTINGS_ID, payload: JSON.stringify(next) },
    update: { payload: JSON.stringify(next) },
  });
  return next;
}

export async function getEnabledPromotionPackageFromDb(
  kind: HostPromotionsSettings["packages"][0]["kind"],
  durationDays: HostPromotionsSettings["packages"][0]["durationDays"]
) {
  const settings = await getPromotionCatalogSettings();
  if (!settings.promotionsEnabled) return undefined;
  return settings.packages.find(
    (p) => p.enabled && p.kind === kind && p.durationDays === durationDays
  );
}
