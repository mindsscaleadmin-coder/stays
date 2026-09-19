import { mergeSeoSettings } from "@/lib/admin/seo-settings-data";
import type { SeoSettings } from "@/lib/admin/seo-settings-types";
import { CATALOG_KEYS, getCatalogPayload, saveCatalogPayload } from "@/lib/server/platform-catalog-repo";

export async function getSeoSettingsFromDb(): Promise<SeoSettings> {
  const raw = await getCatalogPayload(CATALOG_KEYS.seoSettings);
  if (!raw) return mergeSeoSettings(null);
  try {
    return mergeSeoSettings(JSON.parse(raw) as Partial<SeoSettings>);
  } catch {
    return mergeSeoSettings(null);
  }
}

export async function saveSeoSettingsToDb(settings: SeoSettings): Promise<SeoSettings> {
  const next = mergeSeoSettings(settings);
  await saveCatalogPayload(CATALOG_KEYS.seoSettings, next);
  return next;
}
