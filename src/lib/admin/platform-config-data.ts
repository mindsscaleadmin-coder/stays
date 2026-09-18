import type {
  CancellationStrictnessId,
  GlobalSettings,
  HostFeatureBounds,
  HostFeatureKey,
  IntegrationConfig,
  PlatformConfig,
  PlatformFeatureToggles,
  SecuritySettings,
  ServiceRegion,
} from "./platform-config-types";
import { DEFAULT_OPERATIONAL_SETTINGS } from "@/lib/host/operational-settings-data";
import type { OperationalSettings } from "@/lib/host/operational-settings-types";

import { emitSyncCustomEvent } from "@/lib/emit-sync-event";
const STORAGE_KEY = "farm-stays-platform-config";
export const PLATFORM_CONFIG_SYNC_EVENT = "farm-stays-platform-config-updated";

export const CANCELLATION_STRICTNESS_RANK: Record<CancellationStrictnessId, number> = {
  flexible: 1,
  moderate: 2,
  strict: 3,
  "non-refundable": 4,
};

export const DEFAULT_HOST_BOUNDS: HostFeatureBounds = {
  commissionFloorPct: 8,
  commissionCeilingPct: 25,
  maxCancellationStrictness: "strict",
  minNightlyPrice: 0,
  allowWeekendPricing: true,
  allowMonthlyPricing: true,
  allowSeasonalPricing: true,
  allowDiscounts: true,
  allowExtraCharges: true,
};

/** All Indian states & UTs (LGD codes) for launch-region toggles. */
export const INDIA_SERVICE_REGIONS: ServiceRegion[] = [
  { id: "in-35", label: "Andaman And Nicobar Islands", countryCode: "IN", enabled: true },
  { id: "in-28", label: "Andhra Pradesh", countryCode: "IN", enabled: true },
  { id: "in-12", label: "Arunachal Pradesh", countryCode: "IN", enabled: true },
  { id: "in-18", label: "Assam", countryCode: "IN", enabled: true },
  { id: "in-10", label: "Bihar", countryCode: "IN", enabled: true },
  { id: "in-04", label: "Chandigarh", countryCode: "IN", enabled: true },
  { id: "in-22", label: "Chhattisgarh", countryCode: "IN", enabled: true },
  { id: "in-07", label: "Delhi", countryCode: "IN", enabled: true },
  { id: "in-30", label: "Goa", countryCode: "IN", enabled: true },
  { id: "in-24", label: "Gujarat", countryCode: "IN", enabled: true },
  { id: "in-06", label: "Haryana", countryCode: "IN", enabled: true },
  { id: "in-02", label: "Himachal Pradesh", countryCode: "IN", enabled: true },
  { id: "in-01", label: "Jammu And Kashmir", countryCode: "IN", enabled: true },
  { id: "in-20", label: "Jharkhand", countryCode: "IN", enabled: true },
  { id: "in-29", label: "Karnataka", countryCode: "IN", enabled: true },
  { id: "in-32", label: "Kerala", countryCode: "IN", enabled: true },
  { id: "in-37", label: "Ladakh", countryCode: "IN", enabled: true },
  { id: "in-31", label: "Lakshadweep", countryCode: "IN", enabled: true },
  { id: "in-23", label: "Madhya Pradesh", countryCode: "IN", enabled: true },
  { id: "in-27", label: "Maharashtra", countryCode: "IN", enabled: true },
  { id: "in-14", label: "Manipur", countryCode: "IN", enabled: true },
  { id: "in-17", label: "Meghalaya", countryCode: "IN", enabled: true },
  { id: "in-15", label: "Mizoram", countryCode: "IN", enabled: true },
  { id: "in-13", label: "Nagaland", countryCode: "IN", enabled: true },
  { id: "in-21", label: "Odisha", countryCode: "IN", enabled: true },
  { id: "in-34", label: "Puducherry", countryCode: "IN", enabled: true },
  { id: "in-03", label: "Punjab", countryCode: "IN", enabled: true },
  { id: "in-08", label: "Rajasthan", countryCode: "IN", enabled: true },
  { id: "in-11", label: "Sikkim", countryCode: "IN", enabled: true },
  { id: "in-33", label: "Tamil Nadu", countryCode: "IN", enabled: true },
  { id: "in-36", label: "Telangana", countryCode: "IN", enabled: true },
  {
    id: "in-38",
    label: "The Dadra And Nagar Haveli And Daman And Diu",
    countryCode: "IN",
    enabled: true,
  },
  { id: "in-16", label: "Tripura", countryCode: "IN", enabled: true },
  { id: "in-05", label: "Uttarakhand", countryCode: "IN", enabled: true },
  { id: "in-09", label: "Uttar Pradesh", countryCode: "IN", enabled: true },
  { id: "in-19", label: "West Bengal", countryCode: "IN", enabled: true },
];

function mergeIndiaServiceRegions(parsed: ServiceRegion[] | undefined): ServiceRegion[] {
  if (!parsed?.length) return INDIA_SERVICE_REGIONS;
  const byId = new Map(parsed.map((region) => [region.id, region]));
  const legacyByLabel = new Map(
    parsed
      .filter((region) => region.countryCode === "IN")
      .map((region) => [region.label.trim().toLowerCase(), region])
  );

  return INDIA_SERVICE_REGIONS.map((defaultRegion) => {
    const existing =
      byId.get(defaultRegion.id) ??
      legacyByLabel.get(defaultRegion.label.trim().toLowerCase());
    if (!existing) return defaultRegion;
    return {
      ...defaultRegion,
      enabled: existing.enabled,
    };
  });
}

export const DEFAULT_PLATFORM_CONFIG: PlatformConfig = {
  global: {
    defaultCurrency: "INR",
    supportedCurrencies: ["INR", "USD"],
    supportedLanguages: [
      { code: "en", label: "English", enabled: true },
      { code: "hi", label: "Hindi", enabled: false },
    ],
    serviceRegions: INDIA_SERVICE_REGIONS,
  },
  features: {
    instantBookingPlatformWide: true,
    hostFeatures: {
      instantBooking: true,
      dynamicPricing: true,
      hostMessaging: true,
      calendarSync: true,
      coHostInvites: false,
    },
    hostBounds: { ...DEFAULT_HOST_BOUNDS },
  },
  integrations: {
    paymentGateway: {
      provider: "Stripe",
      publicKey: "pk_test_••••••••farm_stays",
      secretKey: "sk_test_••••••••farm_stays",
      webhookSecret: "whsec_••••••••",
      enabled: true,
    },
    emailProvider: {
      provider: "Resend",
      apiKey: "",
      fromAddress: "Farm Stays <noreply@example.com>",
      enabled: false,
    },
    smsProvider: {
      provider: "Twilio",
      apiKey: "",
      senderId: "FarmStays",
      enabled: false,
    },
    mapsApi: {
      provider: "Google Maps",
      apiKey: "AIza••••••••••••••••",
      enabled: true,
    },
  },
  security: {
    requireAdmin2FA: false,
    sessionTimeoutMinutes: 60,
    adminIpWhitelist: ["203.0.113.10", "198.51.100.42"],
    ipWhitelistEnabled: false,
  },
  operational: { ...DEFAULT_OPERATIONAL_SETTINGS },
  updatedAt: new Date().toISOString(),
};

function dispatchSync() {
  if (typeof window !== "undefined") {
    emitSyncCustomEvent(PLATFORM_CONFIG_SYNC_EVENT);
  }
}

function isLegacyGccLaunchConfig(global: Partial<GlobalSettings> | undefined): boolean {
  const regions = global?.serviceRegions ?? [];
  if (regions.length === 0) return false;
  return regions.every((region) => region.countryCode !== "IN");
}

function mergeGlobal(parsed: Partial<GlobalSettings> | undefined): GlobalSettings {
  if (isLegacyGccLaunchConfig(parsed)) {
    return { ...DEFAULT_PLATFORM_CONFIG.global };
  }

  return {
    defaultCurrency: parsed?.defaultCurrency ?? DEFAULT_PLATFORM_CONFIG.global.defaultCurrency,
    supportedCurrencies:
      parsed?.supportedCurrencies?.length
        ? parsed.supportedCurrencies
        : DEFAULT_PLATFORM_CONFIG.global.supportedCurrencies,
    supportedLanguages:
      parsed?.supportedLanguages?.length
        ? parsed.supportedLanguages
        : DEFAULT_PLATFORM_CONFIG.global.supportedLanguages,
    serviceRegions: mergeIndiaServiceRegions(parsed?.serviceRegions),
  };
}

function mergeFeatures(parsed: Partial<PlatformFeatureToggles> | undefined): PlatformFeatureToggles {
  return {
    instantBookingPlatformWide:
      parsed?.instantBookingPlatformWide ?? DEFAULT_PLATFORM_CONFIG.features.instantBookingPlatformWide,
    hostFeatures: {
      ...DEFAULT_PLATFORM_CONFIG.features.hostFeatures,
      ...parsed?.hostFeatures,
    },
    hostBounds: {
      ...DEFAULT_HOST_BOUNDS,
      ...parsed?.hostBounds,
    },
  };
}

function mergeIntegrations(parsed: Partial<IntegrationConfig> | undefined): IntegrationConfig {
  return {
    paymentGateway: {
      ...DEFAULT_PLATFORM_CONFIG.integrations.paymentGateway,
      ...parsed?.paymentGateway,
    },
    emailProvider: {
      ...DEFAULT_PLATFORM_CONFIG.integrations.emailProvider,
      ...parsed?.emailProvider,
    },
    smsProvider: {
      ...DEFAULT_PLATFORM_CONFIG.integrations.smsProvider,
      ...parsed?.smsProvider,
    },
    mapsApi: {
      ...DEFAULT_PLATFORM_CONFIG.integrations.mapsApi,
      ...parsed?.mapsApi,
    },
  };
}

function mergeSecurity(parsed: Partial<SecuritySettings> | undefined): SecuritySettings {
  return {
    requireAdmin2FA: parsed?.requireAdmin2FA ?? DEFAULT_PLATFORM_CONFIG.security.requireAdmin2FA,
    sessionTimeoutMinutes:
      parsed?.sessionTimeoutMinutes ?? DEFAULT_PLATFORM_CONFIG.security.sessionTimeoutMinutes,
    adminIpWhitelist:
      parsed?.adminIpWhitelist ?? DEFAULT_PLATFORM_CONFIG.security.adminIpWhitelist,
    ipWhitelistEnabled:
      parsed?.ipWhitelistEnabled ?? DEFAULT_PLATFORM_CONFIG.security.ipWhitelistEnabled,
  };
}

function mergeOperational(parsed: Partial<OperationalSettings> | undefined): OperationalSettings {
  return {
    ...DEFAULT_OPERATIONAL_SETTINGS,
    ...parsed,
  };
}

export function mergePlatformConfig(parsed: Partial<PlatformConfig> | null | undefined): PlatformConfig {
  if (!parsed) return DEFAULT_PLATFORM_CONFIG;
  return {
    global: mergeGlobal(parsed.global),
    features: mergeFeatures(parsed.features),
    integrations: mergeIntegrations(parsed.integrations),
    security: mergeSecurity(parsed.security),
    operational: mergeOperational(parsed.operational),
    updatedAt: parsed.updatedAt ?? DEFAULT_PLATFORM_CONFIG.updatedAt,
  };
}

export function loadPlatformConfig(): PlatformConfig {
  if (typeof window === "undefined") return DEFAULT_PLATFORM_CONFIG;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PLATFORM_CONFIG;
    const parsed = JSON.parse(raw) as Partial<PlatformConfig>;
    return mergePlatformConfig(parsed);
  } catch {
    return DEFAULT_PLATFORM_CONFIG;
  }
}

/** Redact integration secrets for public/client GET responses. */
export function sanitizePlatformConfig(config: PlatformConfig): PlatformConfig {
  return {
    ...config,
    integrations: {
      paymentGateway: {
        ...config.integrations.paymentGateway,
        secretKey: "",
        webhookSecret: "",
      },
      emailProvider: { ...config.integrations.emailProvider, apiKey: "" },
      smsProvider: { ...config.integrations.smsProvider, apiKey: "" },
      mapsApi: { ...config.integrations.mapsApi, apiKey: "" },
    },
    security: {
      ...config.security,
      adminIpWhitelist: [],
    },
  };
}

export function savePlatformConfig(config: PlatformConfig): void {
  if (typeof window === "undefined") return;
  const next = { ...config, updatedAt: new Date().toISOString() };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  dispatchSync();
}

export function updatePlatformConfig(
  updater: (prev: PlatformConfig) => PlatformConfig
): PlatformConfig {
  const next = updater(loadPlatformConfig());
  savePlatformConfig(next);
  return next;
}

export function getDefaultCurrency(config = loadPlatformConfig()): string {
  return config.global.defaultCurrency;
}

export function getEnabledLanguages(config = loadPlatformConfig()) {
  return config.global.supportedLanguages.filter((l) => l.enabled);
}

export function getEnabledServiceRegions(config = loadPlatformConfig()) {
  return config.global.serviceRegions.filter((r) => r.enabled);
}

export function isInstantBookingPlatformEnabled(config = loadPlatformConfig()): boolean {
  return (
    config.features.instantBookingPlatformWide && config.features.hostFeatures.instantBooking
  );
}

export function isHostFeatureEnabled(
  feature: HostFeatureKey,
  config = loadPlatformConfig()
): boolean {
  return config.features.hostFeatures[feature] ?? false;
}

export function getHostFeatureBounds(config = loadPlatformConfig()): HostFeatureBounds {
  return config.features.hostBounds;
}

export function clampCommissionPct(
  pct: number,
  config = loadPlatformConfig()
): number {
  const { commissionFloorPct, commissionCeilingPct } = config.features.hostBounds;
  const n = Number.isFinite(pct) ? pct : commissionFloorPct;
  return Math.min(commissionCeilingPct, Math.max(commissionFloorPct, n));
}

export function cancellationPolicyAllowed(
  policyId: string,
  config = loadPlatformConfig()
): boolean {
  const rank =
    CANCELLATION_STRICTNESS_RANK[policyId as CancellationStrictnessId] ??
    CANCELLATION_STRICTNESS_RANK.moderate;
  const maxRank =
    CANCELLATION_STRICTNESS_RANK[config.features.hostBounds.maxCancellationStrictness];
  return rank <= maxRank;
}

export function clampNightlyPrice(
  price: number,
  config = loadPlatformConfig()
): number {
  const min = config.features.hostBounds.minNightlyPrice;
  const n = Number.isFinite(price) ? Math.max(0, price) : 0;
  return Math.max(min, n);
}

export function getSessionTimeoutMs(config = loadPlatformConfig()): number {
  return config.security.sessionTimeoutMinutes * 60 * 1000;
}

export function isAdmin2FARequired(config = loadPlatformConfig()): boolean {
  return config.security.requireAdmin2FA;
}

export function isAdminIpAllowed(
  ip: string,
  config = loadPlatformConfig()
): boolean {
  if (!config.security.ipWhitelistEnabled) return true;
  const list = config.security.adminIpWhitelist.map((x) => x.trim()).filter(Boolean);
  if (list.length === 0) return true;
  return list.includes(ip.trim());
}

/** Bookings always confirm instantly when dates are available. */
export function isInstantBookingEffective(): boolean {
  return true;
}

export function countDisabledIntegrations(config = loadPlatformConfig()): number {
  const { integrations } = config;
  return [
    integrations.paymentGateway,
    integrations.emailProvider,
    integrations.smsProvider,
    integrations.mapsApi,
  ].filter((i) => !i.enabled).length;
}
