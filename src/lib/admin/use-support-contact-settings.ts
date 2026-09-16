"use client";

import { useCallback, useEffect, useState } from "react";
import {
  SUPPORT_CONTACT_SETTINGS_SYNC_EVENT,
  loadSupportContactSettings,
  mergeSupportContactSettings,
  saveSupportContactSettings,
} from "./support-contact-settings-data";
import {
  fetchSupportContactSettingsFromApi,
  saveSupportContactSettingsToApi,
  shouldUseSharedSupportContactSettings,
} from "./support-contact-settings-api";
import type {
  CountrySupportContact,
  SupportContactSettings,
} from "./support-contact-settings-types";

export function useSupportContactSettings() {
  const [settings, setSettings] = useState<SupportContactSettings | null>(() =>
    loadSupportContactSettings()
  );
  const [ready, setReady] = useState(true);
  const shared = shouldUseSharedSupportContactSettings();

  const refresh = useCallback(async () => {
    if (shared) {
      try {
        setSettings(await fetchSupportContactSettingsFromApi());
      } catch {
        setSettings(loadSupportContactSettings());
      }
    } else {
      setSettings(loadSupportContactSettings());
    }
    setReady(true);
  }, [shared]);

  useEffect(() => {
    void refresh();
    function onStorage(e: StorageEvent) {
      if (e.key === "farm-stays-support-contact-settings") void refresh();
    }
    window.addEventListener(SUPPORT_CONTACT_SETTINGS_SYNC_EVENT, refresh);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(SUPPORT_CONTACT_SETTINGS_SYNC_EVENT, refresh);
      window.removeEventListener("storage", onStorage);
    };
  }, [refresh]);

  const persist = useCallback(
    async (next: SupportContactSettings) => {
      const merged = mergeSupportContactSettings(next);
      if (shared) {
        try {
          const saved = await saveSupportContactSettingsToApi(merged);
          setSettings(saved);
          window.dispatchEvent(new Event(SUPPORT_CONTACT_SETTINGS_SYNC_EVENT));
          return saved;
        } catch {
          saveSupportContactSettings(merged);
          setSettings(merged);
          return merged;
        }
      }
      saveSupportContactSettings(merged);
      setSettings(merged);
      return merged;
    },
    [shared]
  );

  const save = useCallback(
    (next: SupportContactSettings) => {
      void persist(next);
    },
    [persist]
  );

  const setDefaultHoursLabel = useCallback(
    (defaultHoursLabel: string) => {
      if (!settings) return;
      void persist({ ...settings, defaultHoursLabel });
    },
    [persist, settings]
  );

  const updateContact = useCallback(
    (countryCode: string, patch: Partial<CountrySupportContact>) => {
      if (!settings) return;
      const code = countryCode.trim().toUpperCase();
      const contacts = settings.contacts.map((contact) =>
        contact.countryCode === code ? { ...contact, ...patch, countryCode: code } : contact
      );
      if (!contacts.some((contact) => contact.countryCode === code)) {
        contacts.push({
          countryCode: code,
          phone: patch.phone ?? "",
          hoursLabel: patch.hoursLabel ?? settings.defaultHoursLabel,
          enabled: patch.enabled !== false,
        });
      }
      void persist({ ...settings, contacts });
    },
    [persist, settings]
  );

  const ensureContact = useCallback(
    (countryCode: string) => {
      if (!settings) return;
      const code = countryCode.trim().toUpperCase();
      if (settings.contacts.some((contact) => contact.countryCode === code)) return;
      void persist({
        ...settings,
        contacts: [
          ...settings.contacts,
          {
            countryCode: code,
            phone: "",
            hoursLabel: settings.defaultHoursLabel,
            enabled: true,
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
    setDefaultHoursLabel,
    updateContact,
    ensureContact,
  };
}
