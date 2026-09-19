"use client";

import { useMemo } from "react";
import { useCountry } from "@/components/providers/country-provider";
import { loadSeoSettings, resolveSeoForCountry } from "./seo-settings-data";
import { useSeoSettings } from "./use-seo-settings";

export function useCountrySeo() {
  const { country, ready: countryReady } = useCountry();
  const { settings, ready: settingsReady } = useSeoSettings();

  const seo = useMemo(() => {
    const resolved = settings ?? loadSeoSettings();
    return resolveSeoForCountry(resolved, country.code);
  }, [settings, country.code]);

  return {
    ready: countryReady && settingsReady,
    countryCode: country.code,
    seo,
  };
}
