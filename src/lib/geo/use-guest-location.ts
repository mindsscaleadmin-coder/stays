"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useCountry } from "@/components/providers/country-provider";
import {
  clearStoredGuestLocation,
  countryCodeFromCoords,
  guestLocationFromCoords,
  guestLocationFromCountryCode,
  loadStoredGuestLocation,
  saveGuestLocation,
  type GuestLocation,
} from "@/lib/geo/guest-location";

interface UseGuestLocationResult {
  location: GuestLocation | null;
  /** True while waiting for geolocation / first resolve */
  loading: boolean;
  /** Geolocation was denied or unavailable — using country fallback */
  usingFallback: boolean;
  /** Browser PermissionStatus state when available */
  permission: PermissionState | "unsupported" | "unknown";
  /** Re-request device location (shows browser prompt when possible) */
  requestLocation: () => void;
  refresh: () => void;
}

export function useGuestLocation(): UseGuestLocationResult {
  const { country, setCountry, enabledCountries } = useCountry();
  const [location, setLocation] = useState<GuestLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [usingFallback, setUsingFallback] = useState(false);
  const [permission, setPermission] = useState<
    PermissionState | "unsupported" | "unknown"
  >("unknown");
  /** Skip reacting to country changes we just applied from GPS */
  const geoSyncRef = useRef(false);
  const countryCodeRef = useRef(country.code);
  countryCodeRef.current = country.code;

  const applyFallback = useCallback(
    (code?: string) => {
      const fallback = guestLocationFromCountryCode(code ?? countryCodeRef.current);
      setLocation(fallback);
      saveGuestLocation(fallback);
      setUsingFallback(true);
      setLoading(false);
    },
    []
  );

  const applyGeolocation = useCallback(
    (lat: number, lng: number) => {
      const next = guestLocationFromCoords(lat, lng, "geolocation");
      setLocation(next);
      saveGuestLocation(next);
      setUsingFallback(false);
      setLoading(false);
      setPermission("granted");

      const detected = countryCodeFromCoords(lat, lng);
      const enabled = enabledCountries.some((c) => c.code === detected);
      const multiMarket = enabledCountries.length > 1;
      if (multiMarket && enabled && detected !== countryCodeRef.current) {
        geoSyncRef.current = true;
        setCountry(detected);
      }
    },
    [enabledCountries, setCountry]
  );

  const requestLocation = useCallback(() => {
    setLoading(true);

    if (typeof window === "undefined" || !navigator.geolocation) {
      setPermission("unsupported");
      applyFallback();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        applyGeolocation(pos.coords.latitude, pos.coords.longitude);
      },
      () => {
        setPermission("denied");
        applyFallback();
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 1000 * 60 * 10 }
    );
  }, [applyFallback, applyGeolocation]);

  const resolve = useCallback(() => {
    setLoading(true);

    const stored = loadStoredGuestLocation();
    if (stored?.source === "geolocation") {
      setLocation(stored);
      setUsingFallback(false);
      setLoading(false);
      setPermission("granted");
      const detected = countryCodeFromCoords(stored.lat, stored.lng);
      const multiMarket = enabledCountries.length > 1;
      if (
        multiMarket &&
        enabledCountries.some((c) => c.code === detected) &&
        detected !== countryCodeRef.current
      ) {
        geoSyncRef.current = true;
        setCountry(detected);
      }
      return;
    }

    requestLocation();
  }, [enabledCountries, requestLocation, setCountry]);

  // Initial resolve + permission listener
  useEffect(() => {
    resolve();

    let status: PermissionStatus | null = null;
    if (typeof navigator !== "undefined" && navigator.permissions?.query) {
      navigator.permissions
        .query({ name: "geolocation" })
        .then((result) => {
          status = result;
          setPermission(result.state);
          result.onchange = () => setPermission(result.state);
        })
        .catch(() => {
          setPermission("unknown");
        });
    }

    return () => {
      if (status) status.onchange = null;
    };
    // intentionally once on mount — country-driven updates handled below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When the guest manually switches country, move “near you” to that market
  useEffect(() => {
    if (geoSyncRef.current) {
      geoSyncRef.current = false;
      return;
    }

    const stored = loadStoredGuestLocation();
    if (stored?.source === "geolocation") {
      const detected = countryCodeFromCoords(stored.lat, stored.lng);
      if (detected === country.code) {
        setLocation(stored);
        setUsingFallback(false);
        setLoading(false);
        return;
      }
      clearStoredGuestLocation();
    }
    applyFallback(country.code);
  }, [country.code, applyFallback]);

  return {
    location,
    loading,
    usingFallback,
    permission,
    requestLocation,
    refresh: requestLocation,
  };
}
