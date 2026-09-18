"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { DEFAULT_OPERATIONAL_SETTINGS } from "@/lib/host/operational-settings-data";
import type {
  OperationalSettings,
  OperationalSettingsInput,
  OperationalTimezoneMeta,
} from "@/lib/host/operational-settings-types";
import { DEFAULT_OPERATIONAL_TIMEZONE } from "@/lib/host/operational-timezone";
import { resolveHostId } from "@/lib/listings/host-listings-utils";

const STORAGE_KEY = "farm-stays-host-operational-settings";

function loadLocal(hostId: string): OperationalSettings | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const store = JSON.parse(raw) as Record<string, OperationalSettings>;
    return store[hostId] ?? null;
  } catch {
    return null;
  }
}

function saveLocal(hostId: string, settings: OperationalSettings) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const store = raw ? (JSON.parse(raw) as Record<string, OperationalSettings>) : {};
    store[hostId] = settings;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // ignore
  }
}

export function useHostOperationalSettings() {
  const { user } = useAuth();
  const hostId = resolveHostId(user);
  const [settings, setSettings] = useState<OperationalSettings>(DEFAULT_OPERATIONAL_SETTINGS);
  const [timezoneMeta, setTimezoneMeta] = useState<OperationalTimezoneMeta>({
    timezone: DEFAULT_OPERATIONAL_TIMEZONE,
    countryName: null,
    iso2: null,
    derivedFromCountry: false,
  });
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    if (!hostId) {
      setSettings(DEFAULT_OPERATIONAL_SETTINGS);
      setReady(true);
      return;
    }

    try {
      const res = await fetch(`/api/hosts/${encodeURIComponent(hostId)}/operational-settings`);
      if (res.ok) {
        const data = (await res.json()) as {
          settings?: OperationalSettings;
          timezoneMeta?: OperationalTimezoneMeta;
        };
        if (data.settings) {
          setSettings(data.settings);
          if (data.timezoneMeta) setTimezoneMeta(data.timezoneMeta);
          saveLocal(hostId, data.settings);
          setReady(true);
          return;
        }
      }
    } catch {
      // fall through to local
    }

    const local = loadLocal(hostId);
    setSettings(local ?? DEFAULT_OPERATIONAL_SETTINGS);
    setReady(true);
  }, [hostId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const save = useCallback(
    async (input: OperationalSettingsInput) => {
      if (!hostId) throw new Error("Sign in as a host to save settings.");
      setSaving(true);
      setError("");
      try {
        const res = await fetch(`/api/hosts/${encodeURIComponent(hostId)}/operational-settings`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });
        const data = (await res.json().catch(() => ({}))) as {
          settings?: OperationalSettings;
          timezoneMeta?: OperationalTimezoneMeta;
          error?: string;
        };
        if (!res.ok) {
          throw new Error(data.error || "Could not save settings");
        }
        const next = data.settings ?? { ...settings, ...input };
        setSettings(next);
        if (data.timezoneMeta) setTimezoneMeta(data.timezoneMeta);
        saveLocal(hostId, next);
        return next;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Could not save settings";
        setError(message);
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [hostId, settings]
  );

  return { settings, timezoneMeta, ready, saving, error, save, refresh };
}
