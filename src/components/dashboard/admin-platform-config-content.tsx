"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Link, useRouter } from "@/i18n/routing";
import {
  Globe2,
  IndianRupee,
  Loader2,
  MapPin,
  Shield,
  SlidersHorizontal,
  ToggleLeft,
  Wallet,
} from "lucide-react";
import { useAdminPlatformConfig } from "@/lib/admin/use-admin-platform-config";
import { useAdminTaxonomy } from "@/components/providers/admin-taxonomy-provider";
import type {
  CancellationStrictnessId,
  HostFeatureKey,
} from "@/lib/admin/platform-config-types";
import { cn } from "@/lib/utils";

type TabId = "market" | "features" | "security";

const TABS: { id: TabId; label: string }[] = [
  { id: "market", label: "Market & locale" },
  { id: "features", label: "Features & bounds" },
  { id: "security", label: "Security" },
];

const CURRENCY_OPTIONS = ["INR", "USD", "AED", "SAR", "OMR", "QAR", "EUR"] as const;

const inputClass =
  "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-green-500";

const HOST_FEATURE_LABELS: Record<Exclude<HostFeatureKey, "instantBooking">, string> = {
  dynamicPricing: "Dynamic pricing tools",
  hostMessaging: "Guest messaging",
  calendarSync: "External calendar sync",
  coHostInvites: "Co-host invites",
};

const STRICTNESS_OPTIONS: { id: CancellationStrictnessId; label: string }[] = [
  { id: "flexible", label: "Flexible only" },
  { id: "moderate", label: "Up to Moderate" },
  { id: "strict", label: "Up to Strict" },
  { id: "non-refundable", label: "All policies (incl. Non-refundable)" },
];

export function AdminPlatformConfigContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const { data: taxonomy } = useAdminTaxonomy();

  useEffect(() => {
    if (tabParam === "integrations") {
      router.replace("/admin/settings/api");
    }
    if (tabParam === "global") {
      router.replace("/admin/platform?tab=market");
    }
  }, [tabParam, router]);

  const normalizedTab = tabParam === "global" ? "market" : tabParam;
  const activeTab: TabId = TABS.some((t) => t.id === normalizedTab)
    ? (normalizedTab as TabId)
    : "market";

  const { ready, config, patch } = useAdminPlatformConfig();
  const [message, setMessage] = useState("");
  const [ipInput, setIpInput] = useState("");

  const launchSummary = useMemo(() => {
    const enabledCountries = taxonomy.countries.filter((c) => c.enabled !== false);
    const india =
      enabledCountries.find((c) => (c.code ?? "").toUpperCase() === "IN") ??
      enabledCountries.find((c) => c.name.trim().toLowerCase() === "india");
    const indiaId = india?.id;
    const stateCount = indiaId
      ? taxonomy.states.filter((s) => s.countryId === indiaId).length
      : 0;
    const indiaStateIds = new Set(
      indiaId ? taxonomy.states.filter((s) => s.countryId === indiaId).map((s) => s.id) : []
    );
    const districtCount = taxonomy.districts.filter((d) => indiaStateIds.has(d.stateId)).length;
    const enabledRegions = config.global.serviceRegions.filter((r) => r.enabled);

    return {
      enabledCountries,
      india,
      stateCount,
      districtCount,
      enabledRegions,
    };
  }, [config.global.serviceRegions, taxonomy.countries, taxonomy.districts, taxonomy.states]);

  const setTab = useCallback(
    (tab: TabId) => router.replace(`/admin/platform?tab=${tab}`),
    [router]
  );

  function flash(text: string) {
    setMessage(text);
    setTimeout(() => setMessage(""), 3000);
  }

  if (!ready) {
    return (
              <div className="flex items-center justify-center min-h-[320px]">
          <Loader2 className="w-8 h-8 animate-spin text-green-600" />
        </div>
      
    );
  }

  return (
          <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 font-display">Platform Configuration</h2>
          <p className="text-gray-500 text-sm mt-1">
            India launch settings — currency, locale, host capabilities, and admin security. Country
            geo (states & districts) is managed under{" "}
            <Link href="/admin/countries" className="text-green-700 font-medium hover:underline">
              Countries
            </Link>
            . API keys live under{" "}
            <button
              type="button"
              onClick={() => router.push("/admin/settings/api")}
              className="text-green-700 font-medium hover:underline"
            >
              Settings → API keys
            </button>
            .
          </p>
        </div>

        {message && (
          <div className="bg-green-50 border border-green-200 text-green-800 text-sm rounded-xl px-4 py-3">
            {message}
          </div>
        )}

        <section className="bg-gradient-to-br from-green-50 to-white rounded-2xl border border-green-100 p-5 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-green-800">
                Current launch
              </p>
              <h3 className="text-lg font-bold text-gray-900 mt-1 flex items-center gap-2">
                <span>{launchSummary.india?.flag ?? "🇮🇳"}</span>
                {launchSummary.india?.name ?? "India"}
                <span className="text-xs font-semibold bg-green-700 text-white px-2 py-0.5 rounded-full">
                  Live market
                </span>
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {launchSummary.enabledCountries.length === 1
                  ? "Single-country launch — country switcher is hidden on the public site."
                  : `${launchSummary.enabledCountries.length} countries enabled.`}
              </p>
            </div>
            <Link
              href="/admin/countries"
              className="text-xs font-semibold bg-white border border-green-200 text-green-800 px-3 py-2 rounded-lg hover:bg-green-50"
            >
              Manage countries & geo
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white/80 border border-green-100 rounded-xl px-3 py-3">
              <p className="text-[10px] uppercase tracking-wide text-gray-500">Currency</p>
              <p className="text-sm font-semibold text-gray-900 mt-1">
                {launchSummary.india?.currency ?? config.global.defaultCurrency}{" "}
                <span className="text-gray-500 font-normal">
                  ({launchSummary.india?.taxLabel ?? "GST"} {launchSummary.india?.taxPct ?? 18}%)
                </span>
              </p>
            </div>
            <div className="bg-white/80 border border-green-100 rounded-xl px-3 py-3">
              <p className="text-[10px] uppercase tracking-wide text-gray-500">States in catalog</p>
              <p className="text-sm font-semibold text-gray-900 mt-1">{launchSummary.stateCount}</p>
            </div>
            <div className="bg-white/80 border border-green-100 rounded-xl px-3 py-3">
              <p className="text-[10px] uppercase tracking-wide text-gray-500">Districts in catalog</p>
              <p className="text-sm font-semibold text-gray-900 mt-1">
                {launchSummary.districtCount}
              </p>
            </div>
            <div className="bg-white/80 border border-green-100 rounded-xl px-3 py-3">
              <p className="text-[10px] uppercase tracking-wide text-gray-500">Launch states</p>
              <p className="text-sm font-semibold text-gray-900 mt-1">
                {launchSummary.enabledRegions.length} enabled
              </p>
            </div>
          </div>
        </section>

        <div className="flex flex-wrap gap-2 border-b pb-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setTab(tab.id)}
              className={cn(
                "text-sm font-medium px-3 py-2 rounded-t-lg border-b-2 -mb-px transition-colors whitespace-nowrap",
                activeTab === tab.id
                  ? "border-green-700 text-green-800 bg-green-50/80"
                  : "border-transparent text-gray-500 hover:text-gray-800"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "market" && (
          <div className="space-y-6">
            <section className="bg-white rounded-2xl border p-5 space-y-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <IndianRupee className="w-4 h-4 text-green-700" /> Currency
              </h3>
              <p className="text-xs text-gray-500">
                India launch uses INR as the default. USD is optional for future international
                pricing display.
              </p>
              <label className="block max-w-xs">
                <span className="text-xs text-gray-500 mb-1 block">Default platform currency</span>
                <select
                  value={config.global.defaultCurrency}
                  onChange={(e) => {
                    patch((prev) => ({
                      ...prev,
                      global: { ...prev.global, defaultCurrency: e.target.value },
                    }));
                    flash("Default currency updated.");
                  }}
                  className={inputClass}
                >
                  {config.global.supportedCurrencies.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
              <div>
                <p className="text-xs text-gray-500 mb-2">Supported currencies</p>
                <div className="flex flex-wrap gap-2">
                  {CURRENCY_OPTIONS.map((code) => {
                    const active = config.global.supportedCurrencies.includes(code);
                    const isLaunch = code === "INR" || code === "USD";
                    return (
                      <button
                        key={code}
                        type="button"
                        onClick={() => {
                          patch((prev) => {
                            const set = new Set(prev.global.supportedCurrencies);
                            if (set.has(code)) {
                              if (code === prev.global.defaultCurrency && set.size > 1) {
                                flash("Change default currency before removing it.");
                                return prev;
                              }
                              set.delete(code);
                            } else {
                              set.add(code);
                            }
                            return {
                              ...prev,
                              global: {
                                ...prev.global,
                                supportedCurrencies: Array.from(set),
                              },
                            };
                          });
                          flash("Supported currencies updated.");
                        }}
                        className={cn(
                          "text-xs font-semibold px-3 py-1.5 rounded-full border",
                          active
                            ? "bg-green-700 border-green-700 text-white"
                            : "border-gray-200 text-gray-600",
                          isLaunch && !active && "border-green-200 text-green-800"
                        )}
                      >
                        {code}
                        {isLaunch ? " · launch" : ""}
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>

            <section className="bg-white rounded-2xl border p-5 space-y-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Globe2 className="w-4 h-4 text-green-700" /> Languages
              </h3>
              <p className="text-xs text-gray-500">
                English is live for launch. Enable Hindi when translations are ready.
              </p>
              <div className="space-y-2">
                {config.global.supportedLanguages.map((lang, index) => (
                  <label
                    key={lang.code}
                    className="flex items-center justify-between gap-3 border border-gray-100 rounded-xl px-4 py-3"
                  >
                    <span className="text-sm font-medium text-gray-900">
                      {lang.label} ({lang.code})
                    </span>
                    <input
                      type="checkbox"
                      checked={lang.enabled}
                      onChange={(e) => {
                        patch((prev) => {
                          const langs = [...prev.global.supportedLanguages];
                          langs[index] = { ...lang, enabled: e.target.checked };
                          return { ...prev, global: { ...prev.global, supportedLanguages: langs } };
                        });
                        flash(`${lang.label} ${e.target.checked ? "enabled" : "disabled"}.`);
                      }}
                      className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                    />
                  </label>
                ))}
              </div>
            </section>

            <section className="bg-white rounded-2xl border p-5 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-green-700" /> Launch states (India)
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    All {config.global.serviceRegions.length} states & union territories. Toggle
                    which appear in search and listing filters for this launch phase. Full state →
                    district geo comes from{" "}
                    <Link href="/admin/countries" className="text-green-700 font-medium hover:underline">
                      Countries
                    </Link>
                    .
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      patch((prev) => ({
                        ...prev,
                        global: {
                          ...prev.global,
                          serviceRegions: prev.global.serviceRegions.map((region) => ({
                            ...region,
                            enabled: true,
                          })),
                        },
                      }));
                      flash("All states enabled.");
                    }}
                    className="text-xs font-semibold border border-green-200 text-green-800 px-3 py-1.5 rounded-lg hover:bg-green-50"
                  >
                    Enable all
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      patch((prev) => ({
                        ...prev,
                        global: {
                          ...prev.global,
                          serviceRegions: prev.global.serviceRegions.map((region) => ({
                            ...region,
                            enabled: false,
                          })),
                        },
                      }));
                      flash("All states disabled.");
                    }}
                    className="text-xs font-semibold border border-gray-200 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-50"
                  >
                    Disable all
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[420px] overflow-y-auto pr-1">
                {config.global.serviceRegions.map((region, index) => (
                  <label
                    key={region.id}
                    className={cn(
                      "flex items-center justify-between gap-2 border rounded-xl px-4 py-3 cursor-pointer",
                      region.enabled ? "border-green-200 bg-green-50/40" : "border-gray-100"
                    )}
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">{region.label}</p>
                      <p className="text-[10px] text-gray-500">{region.countryCode}</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={region.enabled}
                      onChange={(e) => {
                        patch((prev) => {
                          const regions = [...prev.global.serviceRegions];
                          regions[index] = { ...region, enabled: e.target.checked };
                          return { ...prev, global: { ...prev.global, serviceRegions: regions } };
                        });
                        flash(`${region.label} ${e.target.checked ? "enabled" : "disabled"}.`);
                      }}
                      className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                    />
                  </label>
                ))}
              </div>
            </section>
          </div>
        )}

        {activeTab === "features" && (
          <div className="space-y-6">
            <section className="bg-white rounded-2xl border p-5 space-y-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <ToggleLeft className="w-4 h-4 text-green-700" /> Booking model
              </h3>
              <div className="border border-gray-100 rounded-xl px-4 py-3 bg-gray-50/80">
                <p className="text-sm font-semibold text-gray-900">Instant confirmation</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Guest bookings confirm automatically when dates are available. Hosts manage
                  availability via calendar blocks and listing visibility.
                </p>
              </div>
            </section>

            <section className="bg-white rounded-2xl border p-5 space-y-3">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-green-700" /> Host feature toggles
              </h3>
              <p className="text-xs text-gray-500">
                Master switches — when off, hosts cannot use that capability regardless of their own
                settings.
              </p>
              {(Object.keys(HOST_FEATURE_LABELS) as Array<keyof typeof HOST_FEATURE_LABELS>).map(
                (key) => (
                  <label
                    key={key}
                    className="flex items-center justify-between gap-3 border border-gray-100 rounded-xl px-4 py-3 cursor-pointer"
                  >
                    <span className="text-sm text-gray-800">{HOST_FEATURE_LABELS[key]}</span>
                    <input
                      type="checkbox"
                      checked={config.features.hostFeatures[key]}
                      onChange={(e) => {
                        patch((prev) => ({
                          ...prev,
                          features: {
                            ...prev.features,
                            hostFeatures: {
                              ...prev.features.hostFeatures,
                              [key]: e.target.checked,
                            },
                          },
                        }));
                        flash(
                          `${HOST_FEATURE_LABELS[key]} ${e.target.checked ? "enabled" : "disabled"}.`
                        );
                      }}
                      className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                    />
                  </label>
                )
              )}
            </section>

            <section className="bg-white rounded-2xl border p-5 space-y-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Wallet className="w-4 h-4 text-green-700" /> Host bounds (Super Admin)
              </h3>
              <p className="text-xs text-gray-500">
                Floors and ceilings for commission, pricing, and cancellation rules. Values are in{" "}
                {config.global.defaultCurrency}.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs font-semibold text-gray-500">Commission floor %</span>
                  <input
                    type="number"
                    min={0}
                    max={50}
                    step={0.5}
                    value={config.features.hostBounds.commissionFloorPct}
                    onChange={(e) => {
                      const commissionFloorPct = Math.max(0, Number(e.target.value) || 0);
                      patch((prev) => ({
                        ...prev,
                        features: {
                          ...prev.features,
                          hostBounds: {
                            ...prev.features.hostBounds,
                            commissionFloorPct,
                            commissionCeilingPct: Math.max(
                              commissionFloorPct,
                              prev.features.hostBounds.commissionCeilingPct
                            ),
                          },
                        },
                      }));
                    }}
                    className={cn(inputClass, "mt-1")}
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-gray-500">Commission ceiling %</span>
                  <input
                    type="number"
                    min={0}
                    max={50}
                    step={0.5}
                    value={config.features.hostBounds.commissionCeilingPct}
                    onChange={(e) => {
                      const commissionCeilingPct = Math.max(0, Number(e.target.value) || 0);
                      patch((prev) => ({
                        ...prev,
                        features: {
                          ...prev.features,
                          hostBounds: {
                            ...prev.features.hostBounds,
                            commissionCeilingPct,
                            commissionFloorPct: Math.min(
                              commissionCeilingPct,
                              prev.features.hostBounds.commissionFloorPct
                            ),
                          },
                        },
                      }));
                    }}
                    className={cn(inputClass, "mt-1")}
                  />
                </label>
                <label className="block sm:col-span-2">
                  <span className="text-xs font-semibold text-gray-500">
                    Max cancellation strictness hosts may select
                  </span>
                  <select
                    value={config.features.hostBounds.maxCancellationStrictness}
                    onChange={(e) => {
                      patch((prev) => ({
                        ...prev,
                        features: {
                          ...prev.features,
                          hostBounds: {
                            ...prev.features.hostBounds,
                            maxCancellationStrictness: e.target.value as CancellationStrictnessId,
                          },
                        },
                      }));
                      flash("Cancellation bound updated.");
                    }}
                    className={cn(inputClass, "mt-1")}
                  >
                    {STRICTNESS_OPTIONS.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block sm:col-span-2">
                  <span className="text-xs font-semibold text-gray-500">
                    Minimum nightly price in {config.global.defaultCurrency} (0 = no floor)
                  </span>
                  <input
                    type="number"
                    min={0}
                    value={config.features.hostBounds.minNightlyPrice}
                    onChange={(e) => {
                      patch((prev) => ({
                        ...prev,
                        features: {
                          ...prev.features,
                          hostBounds: {
                            ...prev.features.hostBounds,
                            minNightlyPrice: Math.max(0, Number(e.target.value) || 0),
                          },
                        },
                      }));
                    }}
                    className={cn(inputClass, "mt-1")}
                  />
                </label>
              </div>
              <div className="space-y-2">
                {(
                  [
                    ["allowWeekendPricing", "Allow weekend pricing"],
                    ["allowMonthlyPricing", "Allow monthly pricing"],
                    ["allowSeasonalPricing", "Allow seasonal pricing"],
                    ["allowDiscounts", "Allow discounts"],
                    ["allowExtraCharges", "Allow extra charges"],
                  ] as const
                ).map(([key, label]) => (
                  <label
                    key={key}
                    className="flex items-center justify-between gap-3 border border-gray-100 rounded-xl px-4 py-3 cursor-pointer"
                  >
                    <span className="text-sm text-gray-800">{label}</span>
                    <input
                      type="checkbox"
                      checked={config.features.hostBounds[key]}
                      onChange={(e) => {
                        patch((prev) => ({
                          ...prev,
                          features: {
                            ...prev.features,
                            hostBounds: {
                              ...prev.features.hostBounds,
                              [key]: e.target.checked,
                            },
                          },
                        }));
                        flash(`${label} ${e.target.checked ? "enabled" : "disabled"}.`);
                      }}
                      className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                    />
                  </label>
                ))}
              </div>
            </section>
          </div>
        )}

        {activeTab === "security" && (
          <div className="space-y-6">
            <section className="bg-white rounded-2xl border p-5 space-y-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Shield className="w-4 h-4 text-green-700" /> Admin authentication
              </h3>
              <p className="text-xs text-gray-500">
                Staff emails and passwords are managed under{" "}
                <Link href="/admin/users" className="text-green-700 font-medium hover:underline">
                  Users & Access → Staff access
                </Link>
                .
              </p>
              <label className="flex items-center justify-between gap-3 border border-gray-100 rounded-xl px-4 py-3 cursor-pointer">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Require 2FA for admin panel</p>
                  <p className="text-xs text-gray-500">
                    All admin, sub-admin, and support staff must use two-factor auth.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={config.security.requireAdmin2FA}
                  onChange={(e) => {
                    patch((prev) => ({
                      ...prev,
                      security: { ...prev.security, requireAdmin2FA: e.target.checked },
                    }));
                    flash(`Admin 2FA ${e.target.checked ? "required" : "optional"}.`);
                  }}
                  className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                />
              </label>
              <label className="block max-w-xs">
                <span className="text-xs text-gray-500 mb-1 block">Session timeout (minutes)</span>
                <input
                  type="number"
                  min={5}
                  max={480}
                  value={config.security.sessionTimeoutMinutes}
                  onChange={(e) => {
                    patch((prev) => ({
                      ...prev,
                      security: {
                        ...prev.security,
                        sessionTimeoutMinutes: Number(e.target.value) || 60,
                      },
                    }));
                  }}
                  onBlur={() => flash("Session timeout updated.")}
                  className={inputClass}
                />
              </label>
            </section>

            <section className="bg-white rounded-2xl border p-5 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-semibold text-gray-900">IP whitelisting (admin panel)</h3>
                <label className="inline-flex items-center gap-2 text-xs text-gray-600">
                  <input
                    type="checkbox"
                    checked={config.security.ipWhitelistEnabled}
                    onChange={(e) => {
                      patch((prev) => ({
                        ...prev,
                        security: { ...prev.security, ipWhitelistEnabled: e.target.checked },
                      }));
                      flash(`IP whitelist ${e.target.checked ? "enabled" : "disabled"}.`);
                    }}
                    className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                  Enforce whitelist
                </label>
              </div>
              <div className="flex gap-2">
                <input
                  value={ipInput}
                  onChange={(e) => setIpInput(e.target.value)}
                  placeholder="203.0.113.10"
                  className={inputClass}
                />
                <button
                  type="button"
                  disabled={!ipInput.trim()}
                  onClick={() => {
                    const ip = ipInput.trim();
                    if (config.security.adminIpWhitelist.includes(ip)) return;
                    patch((prev) => ({
                      ...prev,
                      security: {
                        ...prev.security,
                        adminIpWhitelist: [...prev.security.adminIpWhitelist, ip],
                      },
                    }));
                    setIpInput("");
                    flash("IP added to whitelist.");
                  }}
                  className="text-xs font-semibold bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded-lg shrink-0 disabled:opacity-50"
                >
                  Add IP
                </button>
              </div>
              <ul className="space-y-2">
                {config.security.adminIpWhitelist.map((ip) => (
                  <li
                    key={ip}
                    className="flex items-center justify-between gap-2 border border-gray-100 rounded-lg px-3 py-2 text-sm font-mono text-gray-700"
                  >
                    {ip}
                    <button
                      type="button"
                      onClick={() => {
                        patch((prev) => ({
                          ...prev,
                          security: {
                            ...prev.security,
                            adminIpWhitelist: prev.security.adminIpWhitelist.filter((x) => x !== ip),
                          },
                        }));
                        flash("IP removed.");
                      }}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        )}

        <p className="text-[10px] text-gray-400">
          Last saved {new Date(config.updatedAt).toLocaleString("en-IN")}
        </p>
      </div>
    
  );
}
