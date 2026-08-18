"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAdminTaxonomy } from "@/components/providers/admin-taxonomy-provider";
import { toPlatformCountry } from "@/lib/admin/country-utils";
import { DEFAULT_COUNTRY, type Country } from "@/lib/mock/countries";

const STORAGE_KEY = "farm-stays-selected-country";

interface CountryContextValue {
  country: Country;
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

function writeStoredCode(code: string) {
  try {
    localStorage.setItem(STORAGE_KEY, code);
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

  const [country, setCountryState] = useState<Country>(
    () => enabledCountries[0] ?? DEFAULT_COUNTRY
  );
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = readStoredCode();
    const fromStore = stored
      ? enabledCountries.find((c) => c.code === stored)
      : undefined;
    if (fromStore) setCountryState(fromStore);
    else if (enabledCountries[0]) setCountryState(enabledCountries[0]);
    setHydrated(true);
  }, [enabledCountries]);

  useEffect(() => {
    if (!hydrated) return;
    const match = enabledCountries.find((c) => c.code === country.code);
    if (!match) {
      const next = enabledCountries[0] ?? DEFAULT_COUNTRY;
      setCountryState(next);
      writeStoredCode(next.code);
      return;
    }
    setCountryState((prev) =>
      prev.code === match.code &&
      prev.enabled === match.enabled &&
      prev.currency === match.currency &&
      prev.name === match.name
        ? prev
        : match
    );
  }, [enabledCountries, country.code, hydrated]);

  const setCountry = (code: string) => {
    const found = enabledCountries.find((c) => c.code === code);
    if (!found) return;
    setCountryState(found);
    writeStoredCode(found.code);
  };

  return (
    <CountryContext.Provider
      value={{ country, setCountry, enabledCountries, allCountries }}
    >
      {children}
    </CountryContext.Provider>
  );
}

export function useCountry() {
  const ctx = useContext(CountryContext);
  if (!ctx) throw new Error("useCountry must be used within CountryProvider");
  return ctx;
}
