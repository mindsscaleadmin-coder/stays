"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useAdminTaxonomy } from "@/components/providers/admin-taxonomy-provider";
import { toPlatformCountry } from "@/lib/admin/country-utils";
import { DEFAULT_COUNTRY, getCountry, type Country } from "@/lib/mock/countries";

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

function readStoredName(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(STORAGE_NAME_KEY);
  } catch {
    return null;
  }
}

function readStoredFlag(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(STORAGE_FLAG_KEY);
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

function writeStoredCountry(country: Country) {
  writeStoredCode(country.code);
  try {
    localStorage.setItem(STORAGE_NAME_KEY, country.name);
    localStorage.setItem(STORAGE_FLAG_KEY, country.flag);
  } catch {
    // ignore
  }
}

function bootstrapCountry(code: string, name: string, flag = ""): Country {
  const known = getCountry(code);
  return {
    code,
    name,
    flag: flag || (known.code === code ? known.flag : ""),
    currency: known.code === code ? known.currency : "AED",
    currencySymbol: known.code === code ? known.currencySymbol : "د.إ",
    exchangeRateToAED: known.code === code ? known.exchangeRateToAED : 1,
    dialCode: known.code === code ? known.dialCode : "",
    enabled: true,
    comingSoon: false,
  };
}

function resolveStoredCountry(enabledCountries: Country[]): Country | null {
  const stored = readStoredCode();
  if (!stored) return null;

  const fromList = enabledCountries.find((c) => c.code === stored);
  if (fromList) return fromList;

  const storedName = readStoredName();
  const storedFlag = readStoredFlag();
  if (storedName) {
    return bootstrapCountry(stored, storedName, storedFlag ?? "");
  }

  const known = getCountry(stored);
  if (known.code === stored) return known;

  return null;
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

  const defaultCountry = enabledCountries[0] ?? DEFAULT_COUNTRY;
  const [country, setCountryState] = useState<Country>(defaultCountry);
  const [ready, setReady] = useState(false);
  const hydratedRef = useRef(false);

  useEffect(() => {
    if (enabledCountries.length === 0) return;

    const stored = readStoredCode();
    const fromStore = stored
      ? enabledCountries.find((c) => c.code === stored)
      : undefined;

    setCountryState((prev) => {
      const resolved =
        fromStore ?? resolveStoredCountry(enabledCountries) ?? defaultCountry;
      if (
        prev.code === resolved.code &&
        prev.enabled === resolved.enabled &&
        prev.currency === resolved.currency &&
        prev.name === resolved.name &&
        prev.flag === resolved.flag
      ) {
        return prev;
      }
      if (fromStore) writeStoredCountry(fromStore);
      else if (resolved.code !== defaultCountry.code || !stored) writeStoredCountry(resolved);
      return resolved;
    });

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
