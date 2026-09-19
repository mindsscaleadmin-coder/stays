"use client";

import { useEffect, useMemo, useState } from "react";
import { Phone, RotateCcw } from "lucide-react";
import { useAdminTaxonomy } from "@/components/providers/admin-taxonomy-provider";
import { useSupportContactSettings } from "@/lib/admin/use-support-contact-settings";
import {
  DEFAULT_SUPPORT_CONTACT_SETTINGS,
  mergeSupportContactSettings,
  saveSupportContactSettings,
} from "@/lib/admin/support-contact-settings-data";
import { cn } from "@/lib/utils";

export function AdminSupportContactSettingsContent() {
  const { data: taxonomy } = useAdminTaxonomy();
  const { ready, settings, setDefaultHoursLabel, updateContact, ensureContact, save } =
    useSupportContactSettings();
  const [message, setMessage] = useState("");

  const countries = useMemo(
    () =>
      taxonomy.countries
        .filter((country) => country.code)
        .sort((a, b) => (a.name || a.code || "").localeCompare(b.name || b.code || "")),
    [taxonomy.countries]
  );

  useEffect(() => {
    for (const country of countries) {
      if (country.code) ensureContact(country.code);
    }
  }, [countries, ensureContact]);

  if (!ready || !settings) {
    return <p className="text-sm text-gray-400">Loading…</p>;
  }

  function flash(text: string) {
    setMessage(text);
    setTimeout(() => setMessage(""), 2500);
  }

  function getContact(countryCode: string) {
    const code = countryCode.trim().toUpperCase();
    const current = settings!;
    return (
      current.contacts.find((contact) => contact.countryCode === code) ?? {
        countryCode: code,
        phone: "",
        whatsapp: "",
        hoursLabel: current.defaultHoursLabel,
        enabled: true,
      }
    );
  }

  function resetDefaults() {
    const next = mergeSupportContactSettings(DEFAULT_SUPPORT_CONTACT_SETTINGS);
    saveSupportContactSettings(next);
    save(next);
    flash("Reset to defaults.");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Support contact</h1>
          <p className="mt-1 text-sm text-gray-500">
            Set the help phone and WhatsApp numbers shown on listing pages, footer, and contact
            page for each country.
          </p>
        </div>
        <button
          type="button"
          onClick={resetDefaults}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <RotateCcw className="h-4 w-4" />
          Reset defaults
        </button>
      </div>

      {message ? (
        <p className="rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
          {message}
        </p>
      ) : null}

      <section className="rounded-2xl border bg-white p-5 shadow-sm space-y-4">
        <div>
          <label className="text-sm font-medium text-gray-700">Default hours label</label>
          <p className="mt-1 text-xs text-gray-500">
            Used when a country does not have its own hours text.
          </p>
          <input
            value={settings.defaultHoursLabel}
            onChange={(e) => setDefaultHoursLabel(e.target.value)}
            className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <Phone className="h-4 w-4 text-green-600" />
          <h2 className="font-semibold text-gray-900">Country contact numbers</h2>
        </div>

        <ul className="space-y-3">
          {countries.map((country) => {
            const code = (country.code || "").toUpperCase();
            const contact = getContact(code);
            return (
              <li
                key={country.id}
                className={cn(
                  "rounded-xl border p-4 space-y-3",
                  contact.enabled ? "border-gray-100 bg-gray-50/60" : "border-gray-100 bg-white"
                )}
              >
                <div className="flex flex-wrap items-center gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900">
                      {country.flag ? `${country.flag} ` : ""}
                      {country.name}
                    </p>
                    <p className="text-xs text-gray-500">{code}</p>
                  </div>
                  <label className="ms-auto inline-flex items-center gap-2 text-sm text-gray-600">
                    <input
                      type="checkbox"
                      checked={contact.enabled}
                      onChange={(e) => updateContact(code, { enabled: e.target.checked })}
                      className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                    />
                    Show on site
                  </label>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600">Phone number</label>
                    <input
                      value={contact.phone}
                      onChange={(e) => updateContact(code, { phone: e.target.value })}
                      placeholder={`${country.dialCode || "+91"} …`}
                      className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600">WhatsApp number</label>
                    <input
                      value={contact.whatsapp}
                      onChange={(e) => updateContact(code, { whatsapp: e.target.value })}
                      placeholder={contact.phone || `${country.dialCode || "+971"} …`}
                      className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                    <p className="mt-1 text-[11px] text-gray-400">
                      Leave blank to use the phone number for WhatsApp.
                    </p>
                  </div>
                  <div className="sm:col-span-2 lg:col-span-1">
                    <label className="text-xs font-medium text-gray-600">Hours label</label>
                    <input
                      value={contact.hoursLabel}
                      onChange={(e) => updateContact(code, { hoursLabel: e.target.value })}
                      placeholder={settings.defaultHoursLabel}
                      className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
