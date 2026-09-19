"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useAdminTaxonomy } from "@/components/providers/admin-taxonomy-provider";
import {
  LAUNCH_PLATFORM_COUNTRY,
  resolveDefaultPlatformCountry,
  toPlatformCountry,
} from "@/lib/admin/country-utils";
import { writeCountrySeoCookie } from "@/lib/seo/country-seo-cookie";
import type { Country } from "@/lib/mock/countries";

const STORAGE_KEY = "farm-stays-selected-country";
const STORAGE_NAME_KEY = "farm-stays-selected-country-name";
const STORAGE_FLAG_KEY = "farm-stays-selected-country-flag";

interface CountryContextValue {
  country: Country;
  /** False until localStorage + taxonomy countries have been applied once. */
  ready: boolean;
  setCountry: (code: string) => void;
  enabledCountries: Country[];
  allCountries: Country[];
}

const CountryContext = createContext<CountryContextValue | null>(null);

function readStoredCode(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStoredCountry(country: Country) {
  try {
    localStorage.setItem(STORAGE_KEY, country.code);
    localStorage.setItem(STORAGE_NAME_KEY, country.name);
    localStorage.setItem(STORAGE_FLAG_KEY, country.flag);
  } catch {
    // ignore
  }
}

export function CountryProvider({ children }: { children: ReactNode }) {
  const { data } = useAdminTaxonomy();
  const allCountries = useMemo(
    () => data.countries.map(toPlatformCountry),
    [data.countries]
  );
  const enabledCountries = useMemo(
    () => allCountries.filter((c) => c.enabled),
    [allCountries]
  );

  const defaultCountry = useMemo(
    () => resolveDefaultPlatformCountry(enabledCountries),
    [enabledCountries]
  );

  const [country, setCountryState] = useState<Country>(LAUNCH_PLATFORM_COUNTRY);
  const [ready, setReady] = useState(false);
  const hydratedRef = useRef(false);

  useEffect(() => {
    if (enabledCountries.length === 0) return;

    const stored = readStoredCode();
    const fromStore = stored
      ? enabledCountries.find((c) => c.code === stored)
      : undefined;
    const resolved = fromStore ?? defaultCountry;

    setCountryState((prev) => {
      if (
        prev.code === resolved.code &&
        prev.enabled === resolved.enabled &&
        prev.currency === resolved.currency &&
        prev.name === resolved.name &&
        prev.flag === resolved.flag
      ) {
        return prev;
      }
      return resolved;
    });

    if (!fromStore || fromStore.code !== stored) {
      writeStoredCountry(resolved);
    }
    writeCountrySeoCookie(resolved.code);

    if (!hydratedRef.current) {
      hydratedRef.current = true;
      setReady(true);
    }
  }, [defaultCountry, enabledCountries]);

  const setCountry = useCallback((code: string) => {
    const found = enabledCountries.find((c) => c.code === code);
    if (!found) return;
    setCountryState(found);
    writeStoredCountry(found);
    writeCountrySeoCookie(found.code);

    if (typeof window !== "undefined") {
      const next = new URL(window.location.href);
      next.searchParams.set("market", found.code);
      window.history.replaceState(null, "", next.toString());
    }
  }, [enabledCountries]);

  const contextValue = useMemo(
    () => ({ country, ready, setCountry, enabledCountries, allCountries }),
    [country, ready, setCountry, enabledCountries, allCountries]
  );

  return (
    <CountryContext.Provider value={contextValue}>
      {children}
    </CountryContext.Provider>
  );
}

export function useCountry() {
  const ctx = useContext(CountryContext);
  if (!ctx) throw new Error("useCountry must be used within CountryProvider");
  return ctx;
}
