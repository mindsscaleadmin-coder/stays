"use client";

import { useCallback, useEffect, useState } from "react";
import {
  SEO_SETTINGS_SYNC_EVENT,
  loadSeoSettings,
  mergeSeoSettings,
  saveSeoSettings,
} from "./seo-settings-data";
import {
  fetchSeoSettingsFromApi,
  saveSeoSettingsToApi,
  shouldUseSharedSeoSettings,
} from "./seo-settings-api";
import type { CountrySeoProfile, SeoSettings } from "./seo-settings-types";

export function useSeoSettings() {
  const [settings, setSettings] = useState<SeoSettings | null>(() => loadSeoSettings());
  const [ready, setReady] = useState(true);
  const shared = shouldUseSharedSeoSettings();

  const refresh = useCallback(async () => {
    if (shared) {
      try {
        setSettings(await fetchSeoSettingsFromApi());
      } catch {
        setSettings(loadSeoSettings());
      }
    } else {
      setSettings(loadSeoSettings());
    }
    setReady(true);
  }, [shared]);

  useEffect(() => {
    void refresh();
    function onStorage(e: StorageEvent) {
      if (e.key === "farm-stays-seo-settings") void refresh();
    }
    window.addEventListener(SEO_SETTINGS_SYNC_EVENT, refresh);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(SEO_SETTINGS_SYNC_EVENT, refresh);
      window.removeEventListener("storage", onStorage);
    };
  }, [refresh]);

  const persist = useCallback(
    async (next: SeoSettings) => {
      const merged = mergeSeoSettings(next);
      if (shared) {
        try {
          const saved = await saveSeoSettingsToApi(merged);
          setSettings(saved);
          window.dispatchEvent(new Event(SEO_SETTINGS_SYNC_EVENT));
          return saved;
        } catch {
          saveSeoSettings(merged);
          setSettings(merged);
          return merged;
        }
      }
      saveSeoSettings(merged);
      setSettings(merged);
      return merged;
    },
    [shared]
  );

  const save = useCallback(
    (next: SeoSettings) => {
      void persist(next);
    },
    [persist]
  );

  const setFallback = useCallback(
    (patch: Partial<SeoSettings>) => {
      if (!settings) return;
      void persist({ ...settings, ...patch });
    },
    [persist, settings]
  );

  const updateProfile = useCallback(
    (countryCode: string, patch: Partial<CountrySeoProfile>) => {
      if (!settings) return;
      const code = countryCode.trim().toUpperCase();
      const profiles = settings.profiles.map((profile) =>
        profile.countryCode === code ? { ...profile, ...patch, countryCode: code } : profile
      );
      if (!profiles.some((profile) => profile.countryCode === code)) {
        profiles.push({
          countryCode: code,
          enabled: patch.enabled !== false,
          siteName: patch.siteName ?? settings.fallbackSiteName,
          metaDescription: patch.metaDescription ?? settings.fallbackMetaDescription,
          metaKeywords: patch.metaKeywords ?? settings.fallbackMetaKeywords,
          logoUrl: patch.logoUrl ?? "",
          ogImageUrl: patch.ogImageUrl ?? "",
          extraSitemapUrl: patch.extraSitemapUrl ?? "",
          schemaOrganizationName: patch.schemaOrganizationName ?? settings.fallbackSiteName,
          schemaOrganizationUrl: patch.schemaOrganizationUrl ?? "",
          schemaOrganizationLogo: patch.schemaOrganizationLogo ?? "",
          schemaOrganizationDescription:
            patch.schemaOrganizationDescription ?? settings.fallbackMetaDescription,
        });
      }
      void persist({ ...settings, profiles });
    },
    [persist, settings]
  );

  const ensureProfile = useCallback(
    (countryCode: string) => {
      if (!settings) return;
      const code = countryCode.trim().toUpperCase();
      if (settings.profiles.some((profile) => profile.countryCode === code)) return;
      void persist({
        ...settings,
        profiles: [
          ...settings.profiles,
          {
            countryCode: code,
            enabled: true,
            siteName: settings.fallbackSiteName,
            metaDescription: settings.fallbackMetaDescription,
            metaKeywords: settings.fallbackMetaKeywords,
            logoUrl: settings.fallbackLogoUrl,
            ogImageUrl: settings.fallbackOgImageUrl,
            extraSitemapUrl: "",
            schemaOrganizationName: settings.fallbackSiteName,
            schemaOrganizationUrl: "",
            schemaOrganizationLogo: settings.fallbackLogoUrl,
            schemaOrganizationDescription: settings.fallbackMetaDescription,
          },
        ],
      });
    },
    [persist, settings]
  );

  return {
    ready,
    settings,
    refresh,
    save,
    setFallback,
    updateProfile,
    ensureProfile,
  };
}
