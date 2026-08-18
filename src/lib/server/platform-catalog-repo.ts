import { prisma } from "@/lib/prisma";
import { normalizeTaxonomy, SEED_TAXONOMY } from "@/lib/admin/taxonomy-data";
import type { TaxonomyData } from "@/lib/admin/taxonomy-types";
import {
  DEFAULT_PHOTO_TAGS_CATALOG,
} from "@/lib/admin/photo-tags-catalog-data";
import type { PhotoTagCatalogItem } from "@/lib/admin/photo-tags-catalog-types";
import {
  DEFAULT_EXTRA_CHARGES_CATALOG,
} from "@/lib/admin/extra-charges-catalog-data";
import type { ExtraChargeCatalogItem } from "@/lib/admin/extra-charges-catalog-types";
import {
  DEFAULT_SUPPORT_TICKETS,
} from "@/lib/admin/support-data";
import type { SupportTicketRecord } from "@/lib/admin/support-types";
import {
  DEFAULT_FINANCIAL_SETTINGS,
} from "@/lib/admin/financial-data";
import type { FinancialSettings } from "@/lib/admin/financial-types";
import {
  DEFAULT_ADMIN_ALERT_SETTINGS,
} from "@/lib/admin/admin-alerts-data";
import type { AdminAlertsState } from "@/lib/admin/admin-alerts-types";

export const CATALOG_KEYS = {
  taxonomy: "taxonomy",
  photoTags: "photo-tags",
  extraCharges: "extra-charges",
  supportTickets: "support-tickets",
  financialSettings: "financial-settings",
  adminAlerts: "admin-alerts",
} as const;

async function getPayload(key: string): Promise<string | null> {
  const row = await prisma.platformCatalog.findUnique({ where: { key } });
  return row?.payload ?? null;
}

async function savePayload(key: string, payload: unknown) {
  const json = JSON.stringify(payload);
  await prisma.platformCatalog.upsert({
    where: { key },
    create: { key, payload: json },
    update: { payload: json },
  });
}

export async function getTaxonomyFromDb(): Promise<TaxonomyData> {
  const raw = await getPayload(CATALOG_KEYS.taxonomy);
  if (!raw) {
    await savePayload(CATALOG_KEYS.taxonomy, SEED_TAXONOMY);
    return SEED_TAXONOMY;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<TaxonomyData>;
    const normalized = normalizeTaxonomy(parsed);
    const missingCategoryLayer =
      !parsed.categories?.length ||
      !(parsed.mainTabs ?? []).some((tab) => tab.id === "category");
    if (missingCategoryLayer) {
      await savePayload(CATALOG_KEYS.taxonomy, normalized);
    }
    return normalized;
  } catch {
    return SEED_TAXONOMY;
  }
}

export async function saveTaxonomyToDb(data: TaxonomyData): Promise<TaxonomyData> {
  const next = normalizeTaxonomy(data);
  await savePayload(CATALOG_KEYS.taxonomy, next);
  return next;
}

function normalizePhotoTags(items: PhotoTagCatalogItem[]): PhotoTagCatalogItem[] {
  return items.map((item) => ({
    id: item.id,
    value: (item.value || "").trim().toLowerCase() || item.id,
    label: (item.label || "").trim() || "Untitled",
    enabled: item.enabled !== false,
  }));
}

export async function getPhotoTagsCatalogFromDb(): Promise<PhotoTagCatalogItem[]> {
  const raw = await getPayload(CATALOG_KEYS.photoTags);
  if (!raw) return DEFAULT_PHOTO_TAGS_CATALOG;
  try {
    const parsed = JSON.parse(raw) as PhotoTagCatalogItem[];
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_PHOTO_TAGS_CATALOG;
    return normalizePhotoTags(parsed);
  } catch {
    return DEFAULT_PHOTO_TAGS_CATALOG;
  }
}

export async function savePhotoTagsCatalogToDb(
  items: PhotoTagCatalogItem[]
): Promise<PhotoTagCatalogItem[]> {
  const next = normalizePhotoTags(items);
  await savePayload(CATALOG_KEYS.photoTags, next);
  return next;
}

function normalizeExtraCharges(items: ExtraChargeCatalogItem[]): ExtraChargeCatalogItem[] {
  return items.map((item) => ({
    id: item.id,
    label: item.label,
    defaultAmount: Math.max(0, Number(item.defaultAmount) || 0),
    defaultBilling:
      item.defaultBilling === "per_day" ||
      item.defaultBilling === "per_night" ||
      item.defaultBilling === "per_stay"
        ? item.defaultBilling
        : "per_stay",
    enabled: item.enabled !== false,
  }));
}

export async function getExtraChargesCatalogFromDb(): Promise<ExtraChargeCatalogItem[]> {
  const raw = await getPayload(CATALOG_KEYS.extraCharges);
  if (!raw) return DEFAULT_EXTRA_CHARGES_CATALOG;
  try {
    const parsed = JSON.parse(raw) as ExtraChargeCatalogItem[];
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_EXTRA_CHARGES_CATALOG;
    return normalizeExtraCharges(parsed);
  } catch {
    return DEFAULT_EXTRA_CHARGES_CATALOG;
  }
}

export async function saveExtraChargesCatalogToDb(
  items: ExtraChargeCatalogItem[]
): Promise<ExtraChargeCatalogItem[]> {
  const next = normalizeExtraCharges(items);
  await savePayload(CATALOG_KEYS.extraCharges, next);
  return next;
}

function mergeFinancialSettings(parsed: Partial<FinancialSettings>): FinancialSettings {
  return {
    commission: {
      ...DEFAULT_FINANCIAL_SETTINGS.commission,
      ...parsed.commission,
      hostOverrides:
        parsed.commission?.hostOverrides?.length
          ? parsed.commission.hostOverrides
          : DEFAULT_FINANCIAL_SETTINGS.commission.hostOverrides,
    },
    payoutStates: parsed.payoutStates ?? DEFAULT_FINANCIAL_SETTINGS.payoutStates,
    refundRequests:
      parsed.refundRequests?.length
        ? parsed.refundRequests
        : DEFAULT_FINANCIAL_SETTINGS.refundRequests,
  };
}

export async function getSupportTicketsFromDb(): Promise<SupportTicketRecord[]> {
  const raw = await getPayload(CATALOG_KEYS.supportTickets);
  if (!raw) {
    await savePayload(CATALOG_KEYS.supportTickets, DEFAULT_SUPPORT_TICKETS);
    return [...DEFAULT_SUPPORT_TICKETS];
  }
  try {
    const parsed = JSON.parse(raw) as SupportTicketRecord[];
    return parsed.length > 0 ? parsed : [...DEFAULT_SUPPORT_TICKETS];
  } catch {
    return [...DEFAULT_SUPPORT_TICKETS];
  }
}

export async function saveSupportTicketsToDb(
  tickets: SupportTicketRecord[]
): Promise<SupportTicketRecord[]> {
  await savePayload(CATALOG_KEYS.supportTickets, tickets);
  return tickets;
}

export async function getFinancialSettingsFromDb(): Promise<FinancialSettings> {
  const raw = await getPayload(CATALOG_KEYS.financialSettings);
  if (!raw) return DEFAULT_FINANCIAL_SETTINGS;
  try {
    return mergeFinancialSettings(JSON.parse(raw) as Partial<FinancialSettings>);
  } catch {
    return DEFAULT_FINANCIAL_SETTINGS;
  }
}

export async function saveFinancialSettingsToDb(
  settings: FinancialSettings
): Promise<FinancialSettings> {
  const next = mergeFinancialSettings(settings);
  await savePayload(CATALOG_KEYS.financialSettings, next);
  return next;
}

const DEFAULT_ADMIN_ALERTS_STATE: AdminAlertsState = {
  settings: DEFAULT_ADMIN_ALERT_SETTINGS,
  dismissedSourceKeys: [],
  readSourceKeys: [],
};

export async function getAdminAlertsStateFromDb(): Promise<AdminAlertsState> {
  const raw = await getPayload(CATALOG_KEYS.adminAlerts);
  if (!raw) return DEFAULT_ADMIN_ALERTS_STATE;
  try {
    const parsed = JSON.parse(raw) as Partial<AdminAlertsState>;
    return {
      settings: {
        ...DEFAULT_ADMIN_ALERT_SETTINGS,
        ...parsed.settings,
        enabledCategories: {
          ...DEFAULT_ADMIN_ALERT_SETTINGS.enabledCategories,
          ...parsed.settings?.enabledCategories,
        },
        systemHealth: {
          ...DEFAULT_ADMIN_ALERT_SETTINGS.systemHealth,
          ...parsed.settings?.systemHealth,
        },
      },
      dismissedSourceKeys: parsed.dismissedSourceKeys ?? [],
      readSourceKeys: parsed.readSourceKeys ?? [],
    };
  } catch {
    return DEFAULT_ADMIN_ALERTS_STATE;
  }
}

export async function saveAdminAlertsStateToDb(
  state: AdminAlertsState
): Promise<AdminAlertsState> {
  await savePayload(CATALOG_KEYS.adminAlerts, state);
  return state;
}
