"use client";

import { useMemo } from "react";
import { useCountry } from "@/components/providers/country-provider";
import {
  getSupportContactForCountry,
  loadSupportContactSettings,
  toTelHref,
  toWhatsAppHref,
} from "./support-contact-settings-data";
import { useSupportContactSettings } from "./use-support-contact-settings";

export function useCountrySupportContact() {
  const { country, ready: countryReady } = useCountry();
  const { settings, ready: settingsReady } = useSupportContactSettings();

  const contact = useMemo(() => {
    const resolved = settings ?? loadSupportContactSettings();
    return getSupportContactForCountry(resolved, country.code);
  }, [settings, country.code]);

  return {
    ready: countryReady && settingsReady,
    phone: contact.phone,
    whatsapp: contact.whatsapp,
    hoursLabel: contact.hoursLabel,
    telHref: toTelHref(contact.phone),
    whatsappHref: toWhatsAppHref(contact.whatsapp),
  };
}
