import { emitSyncEvent } from "@/lib/emit-sync-event";
import {
  DEFAULT_HOST_PROMOTIONS_SETTINGS,
  DEFAULT_PROMOTION_PACKAGES,
  type HostPromotionsSettings,
  type ListingPromotionDurationDays,
  type ListingPromotionKind,
  type ListingPromotionPackage,
} from "@/lib/host/host-promotions-types";

const STORAGE_KEY = "farm-stays-host-promotions-settings";
export const HOST_PROMOTIONS_SETTINGS_SYNC_EVENT =
  "farm-stays-host-promotions-settings-updated";

function notify() {
  if (typeof window === "undefined") return;
  emitSyncEvent(HOST_PROMOTIONS_SETTINGS_SYNC_EVENT);
}

function normalizePackage(pkg: ListingPromotionPackage): ListingPromotionPackage {
  const durationDays = ([7, 14, 30] as ListingPromotionDurationDays[]).includes(
    pkg.durationDays
  )
    ? pkg.durationDays
    : 7;
  const kind: ListingPromotionKind = pkg.kind === "featured" ? "featured" : "trending";
  return {
    id: pkg.id || `pkg-${kind}-${durationDays}`,
    kind,
    durationDays,
    priceAed: Math.max(0, Math.round(Number(pkg.priceAed) || 0)),
    label: (pkg.label || `${kind} · ${durationDays} days`).trim(),
    description: (pkg.description || "").trim(),
    enabled: pkg.enabled !== false,
  };
}

export function mergeHostPromotionsSettings(
  raw: Partial<HostPromotionsSettings> | null
): HostPromotionsSettings {
  const packages =
    Array.isArray(raw?.packages) && raw.packages.length > 0
      ? raw.packages.map(normalizePackage)
      : DEFAULT_PROMOTION_PACKAGES.map((p) => ({ ...p }));

  // Ensure every default duration/kind exists (merge missing)
  const byKey = new Map(packages.map((p) => [`${p.kind}:${p.durationDays}`, p]));
  for (const def of DEFAULT_PROMOTION_PACKAGES) {
    const key = `${def.kind}:${def.durationDays}`;
    if (!byKey.has(key)) byKey.set(key, { ...def });
  }

  return {
    pageTitle: raw?.pageTitle?.trim() || DEFAULT_HOST_PROMOTIONS_SETTINGS.pageTitle,
    pageSubtitle: raw?.pageSubtitle?.trim() || DEFAULT_HOST_PROMOTIONS_SETTINGS.pageSubtitle,
    currency:
      raw?.currency === "AED" || !raw?.currency
        ? DEFAULT_HOST_PROMOTIONS_SETTINGS.currency
        : raw.currency,
    promotionsEnabled: raw?.promotionsEnabled !== false,
    packages: Array.from(byKey.values()).sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === "trending" ? -1 : 1;
      return a.durationDays - b.durationDays;
    }),
  };
}

export function loadHostPromotionsSettings(): HostPromotionsSettings {
  if (typeof window === "undefined") return { ...DEFAULT_HOST_PROMOTIONS_SETTINGS, packages: DEFAULT_PROMOTION_PACKAGES.map((p) => ({ ...p })) };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return mergeHostPromotionsSettings(null);
    const parsed = JSON.parse(raw) as Partial<HostPromotionsSettings>;
    const merged = mergeHostPromotionsSettings(parsed);
    if (parsed.currency === "AED") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    }
    return merged;
  } catch {
    return mergeHostPromotionsSettings(null);
  }
}

export function saveHostPromotionsSettings(settings: HostPromotionsSettings): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(mergeHostPromotionsSettings(settings)));
  notify();
}

export function updateHostPromotionsSettings(
  patch: Partial<HostPromotionsSettings>
): HostPromotionsSettings {
  const next = mergeHostPromotionsSettings({ ...loadHostPromotionsSettings(), ...patch });
  saveHostPromotionsSettings(next);
  return next;
}

export function updatePromotionPackage(
  id: string,
  patch: Partial<ListingPromotionPackage>
): HostPromotionsSettings {
  const current = loadHostPromotionsSettings();
  const packages = current.packages.map((p) =>
    p.id === id ? normalizePackage({ ...p, ...patch, id: p.id }) : p
  );
  return updateHostPromotionsSettings({ packages });
}

export function resetHostPromotionsSettings(): HostPromotionsSettings {
  const next = mergeHostPromotionsSettings(null);
  saveHostPromotionsSettings(next);
  return next;
}

/** Enabled packages for host checkout (respects master switch). */
export function getEnabledPromotionPackages(): ListingPromotionPackage[] {
  const settings = loadHostPromotionsSettings();
  if (!settings.promotionsEnabled) return [];
  return settings.packages.filter((p) => p.enabled);
}

export function getPromotionPackageFromSettings(
  kind: ListingPromotionKind,
  durationDays: ListingPromotionDurationDays
): ListingPromotionPackage | undefined {
  return getEnabledPromotionPackages().find(
    (p) => p.kind === kind && p.durationDays === durationDays
  );
}
