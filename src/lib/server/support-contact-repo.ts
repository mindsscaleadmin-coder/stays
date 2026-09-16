import { mergeSupportContactSettings } from "@/lib/admin/support-contact-settings-data";
import type { SupportContactSettings } from "@/lib/admin/support-contact-settings-types";
import { CATALOG_KEYS, getCatalogPayload, saveCatalogPayload } from "@/lib/server/platform-catalog-repo";

export async function getSupportContactSettingsFromDb(): Promise<SupportContactSettings> {
  const raw = await getCatalogPayload(CATALOG_KEYS.supportContact);
  if (!raw) return mergeSupportContactSettings(null);
  try {
    return mergeSupportContactSettings(JSON.parse(raw) as Partial<SupportContactSettings>);
  } catch {
    return mergeSupportContactSettings(null);
  }
}

export async function saveSupportContactSettingsToDb(
  settings: SupportContactSettings
): Promise<SupportContactSettings> {
  const next = mergeSupportContactSettings(settings);
  await saveCatalogPayload(CATALOG_KEYS.supportContact, next);
  return next;
}
