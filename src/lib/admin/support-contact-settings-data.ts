import { emitSyncEvent } from "@/lib/emit-sync-event";
import type {
  CountrySupportContact,
  SupportContactSettings,
} from "./support-contact-settings-types";

const STORAGE_KEY = "farm-stays-support-contact-settings";
export const SUPPORT_CONTACT_SETTINGS_SYNC_EVENT =
  "farm-stays-support-contact-settings-updated";

export const DEFAULT_SUPPORT_CONTACT_SETTINGS: SupportContactSettings = {
  defaultHoursLabel: "Our team is available 9am–9pm GST",
  contacts: [
    {
      countryCode: "AE",
      phone: "+971 4 123 4567",
      hoursLabel: "Our team is available 9am–9pm GST",
      enabled: true,
    },
    {
      countryCode: "SA",
      phone: "+966 11 123 4567",
      hoursLabel: "Our team is available 9am–9pm AST",
      enabled: true,
    },
  ],
};

function normalizeContact(contact: CountrySupportContact): CountrySupportContact {
  return {
    countryCode: contact.countryCode.trim().toUpperCase(),
    phone: contact.phone.trim(),
    hoursLabel: contact.hoursLabel.trim(),
    enabled: contact.enabled !== false,
  };
}

export function mergeSupportContactSettings(
  raw: Partial<SupportContactSettings> | null
): SupportContactSettings {
  const defaultHoursLabel =
    raw?.defaultHoursLabel?.trim() || DEFAULT_SUPPORT_CONTACT_SETTINGS.defaultHoursLabel;
  const contacts =
    Array.isArray(raw?.contacts) && raw.contacts.length > 0
      ? raw.contacts.map((contact) =>
          normalizeContact({
            countryCode: contact.countryCode ?? "",
            phone: contact.phone ?? "",
            hoursLabel: contact.hoursLabel ?? defaultHoursLabel,
            enabled: contact.enabled !== false,
          })
        )
      : DEFAULT_SUPPORT_CONTACT_SETTINGS.contacts.map((contact) => ({ ...contact }));

  const byCode = new Map(contacts.map((contact) => [contact.countryCode, contact]));
  for (const fallback of DEFAULT_SUPPORT_CONTACT_SETTINGS.contacts) {
    if (!byCode.has(fallback.countryCode)) {
      byCode.set(fallback.countryCode, { ...fallback });
    }
  }

  return {
    defaultHoursLabel,
    contacts: Array.from(byCode.values()).sort((a, b) =>
      a.countryCode.localeCompare(b.countryCode)
    ),
  };
}

export function loadSupportContactSettings(): SupportContactSettings {
  if (typeof window === "undefined") return mergeSupportContactSettings(null);
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return mergeSupportContactSettings(null);
    return mergeSupportContactSettings(JSON.parse(raw) as Partial<SupportContactSettings>);
  } catch {
    return mergeSupportContactSettings(null);
  }
}

export function saveSupportContactSettings(settings: SupportContactSettings): void {
  if (typeof window === "undefined") return;
  const next = mergeSupportContactSettings(settings);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  emitSyncEvent(SUPPORT_CONTACT_SETTINGS_SYNC_EVENT);
}

export function getSupportContactForCountry(
  settings: SupportContactSettings,
  countryCode: string
): { phone: string; hoursLabel: string } {
  const code = countryCode.trim().toUpperCase();
  const entry = settings.contacts.find(
    (contact) => contact.countryCode === code && contact.enabled && contact.phone.trim()
  );
  const fallback =
    settings.contacts.find((contact) => contact.countryCode === "AE" && contact.phone.trim()) ??
    settings.contacts.find((contact) => contact.enabled && contact.phone.trim());

  const phone = entry?.phone.trim() || fallback?.phone.trim() || "+971 4 123 4567";
  const hoursLabel =
    entry?.hoursLabel.trim() || fallback?.hoursLabel.trim() || settings.defaultHoursLabel;

  return { phone, hoursLabel };
}

export function toTelHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}
