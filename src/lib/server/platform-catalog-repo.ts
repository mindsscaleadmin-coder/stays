import { prisma } from "@/lib/prisma";
import { DINING_PARENT_ID } from "@/lib/admin/dining-taxonomy-data";
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
import {
  DEFAULT_LISTING_ADS,
  normalizeListingAds,
} from "@/lib/admin/listing-ads-data";
import type { ListingAdsSettings } from "@/lib/admin/listing-ads-types";
import {
  DEFAULT_LISTING_QUALITY_RULES_STORE,
  normalizeListingQualityRulesStore,
} from "@/lib/admin/listing-quality-rules-data";
import type {
  ListingQualityRules,
  ListingQualityRulesStore,
} from "@/lib/admin/listing-quality-rules-types";
import type { HostVerificationRequest } from "@/lib/host/verification-types";
import type { GuestVerificationRequest } from "@/lib/guest/guest-verification-types";
import { normalizeEventsSubscription } from "@/lib/admin/events-subscription";

export const CATALOG_KEYS = {
  taxonomy: "taxonomy",
  photoTags: "photo-tags",
  extraCharges: "extra-charges",
  supportTickets: "support-tickets",
  financialSettings: "financial-settings",
  adminAlerts: "admin-alerts",
  listingAds: "listing-ads",
  listingQualityRules: "listing-quality-rules",
  hostVerifications: "host-verifications",
  guestVerifications: "guest-verifications",
  supportContact: "support-contact-settings",
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

export async function getCatalogPayload(key: string): Promise<string | null> {
  return getPayload(key);
}

export async function saveCatalogPayload(key: string, payload: unknown): Promise<void> {
  await savePayload(key, payload);
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
    const mainTabsChanged =
      JSON.stringify(normalized.mainTabs) !== JSON.stringify(parsed.mainTabs ?? []);
    const diningParentDrift = (parsed.parents ?? []).some(
      (p) => p.name.trim().toLowerCase() === "dining" && p.id !== DINING_PARENT_ID
    );
    const orphanDiningFilters = (parsed.extraFilters ?? []).some(
      (ef) =>
        ef.parentId === DINING_PARENT_ID &&
        !(parsed.parents ?? []).some((p) => p.id === DINING_PARENT_ID)
    );
    if (missingCategoryLayer || mainTabsChanged || diningParentDrift || orphanDiningFilters) {
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
    eventsSubscription: normalizeEventsSubscription(parsed.eventsSubscription),
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

export async function getListingAdsFromDb(): Promise<ListingAdsSettings> {
  const raw = await getPayload(CATALOG_KEYS.listingAds);
  if (!raw) return DEFAULT_LISTING_ADS;
  try {
    return normalizeListingAds(JSON.parse(raw) as Partial<ListingAdsSettings>);
  } catch {
    return DEFAULT_LISTING_ADS;
  }
}

export async function saveListingAdsToDb(
  settings: ListingAdsSettings
): Promise<ListingAdsSettings> {
  const next = normalizeListingAds(settings);
  await savePayload(CATALOG_KEYS.listingAds, next);
  return next;
}

export async function getListingQualityRulesStoreFromDb(): Promise<ListingQualityRulesStore> {
  const raw = await getPayload(CATALOG_KEYS.listingQualityRules);
  if (!raw) return { ...DEFAULT_LISTING_QUALITY_RULES_STORE };
  try {
    return normalizeListingQualityRulesStore(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_LISTING_QUALITY_RULES_STORE };
  }
}

export async function saveListingQualityRulesStoreToDb(
  store: ListingQualityRulesStore
): Promise<ListingQualityRulesStore> {
  const next = normalizeListingQualityRulesStore(store);
  await savePayload(CATALOG_KEYS.listingQualityRules, next);
  return next;
}

/** @deprecated Prefer getListingQualityRulesStoreFromDb */
export async function getListingQualityRulesFromDb(): Promise<ListingQualityRules> {
  return (await getListingQualityRulesStoreFromDb()).fallback;
}

/** @deprecated Prefer saveListingQualityRulesStoreToDb */
export async function saveListingQualityRulesToDb(
  rules: ListingQualityRules
): Promise<ListingQualityRules> {
  const next = await saveListingQualityRulesStoreToDb({
    fallback: rules,
    byParentId: {},
  });
  return next.fallback;
}

function parseVerifications(raw: string | null): Record<string, HostVerificationRequest> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, HostVerificationRequest>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export async function getHostVerificationsFromDb(): Promise<HostVerificationRequest[]> {
  const map = parseVerifications(await getPayload(CATALOG_KEYS.hostVerifications));
  return Object.values(map).sort(
    (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
  );
}

export async function getHostVerificationFromDb(
  hostId: string
): Promise<HostVerificationRequest | null> {
  const map = parseVerifications(await getPayload(CATALOG_KEYS.hostVerifications));
  return map[hostId] ?? null;
}

export async function saveHostVerificationToDb(
  request: HostVerificationRequest
): Promise<HostVerificationRequest> {
  const map = parseVerifications(await getPayload(CATALOG_KEYS.hostVerifications));
  map[request.hostId] = request;
  await savePayload(CATALOG_KEYS.hostVerifications, map);
  return request;
}

function parseGuestVerifications(
  raw: string | null
): Record<string, GuestVerificationRequest> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, GuestVerificationRequest>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export async function getGuestVerificationFromDb(
  userId: string
): Promise<GuestVerificationRequest | null> {
  const map = parseGuestVerifications(await getPayload(CATALOG_KEYS.guestVerifications));
  const stored = map[userId] ?? null;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isVerified: true },
  });
  if (user?.isVerified) {
    return (
      stored ?? {
        userId,
        idType: "emirates_id",
        notes: "",
        status: "verified",
        submittedAt: new Date().toISOString(),
      }
    );
  }
  return stored;
}

export async function saveGuestVerificationToDb(
  request: GuestVerificationRequest
): Promise<GuestVerificationRequest> {
  const map = parseGuestVerifications(await getPayload(CATALOG_KEYS.guestVerifications));
  map[request.userId] = request;
  await savePayload(CATALOG_KEYS.guestVerifications, map);
  if (request.status === "verified" || request.status === "rejected") {
    await prisma.user.updateMany({
      where: { id: request.userId },
      data: { isVerified: request.status === "verified" },
    });
  }
  return request;
}

