"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/routing";
import {
  Globe2,
  Loader2,
  MapPin,
  Shield,
  SlidersHorizontal,
  ToggleLeft,
  Wallet,
} from "lucide-react";
import { AdminDashboardShell } from "./admin-dashboard-shell";
import { useAdminPlatformConfig } from "@/lib/admin/use-admin-platform-config";
import type {
  CancellationStrictnessId,
  HostFeatureKey,
} from "@/lib/admin/platform-config-types";
import { cn } from "@/lib/utils";

type TabId = "global" | "features" | "security";

const TABS: { id: TabId; label: string }[] = [
  { id: "global", label: "Global settings" },
  { id: "features", label: "Feature toggles" },
  { id: "security", label: "Security" },
];

const inputClass =
  "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-green-500";

const HOST_FEATURE_LABELS: Record<HostFeatureKey, string> = {
  instantBooking: "Instant booking (host opt-in)",
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

  // Integrations live under Settings → API keys (avoid duplicate UIs)
  useEffect(() => {
    if (tabParam === "integrations") {
      router.replace("/admin/settings/api");
    }
  }, [tabParam, router]);

  const activeTab: TabId = TABS.some((t) => t.id === tabParam) ? (tabParam as TabId) : "global";

  const { ready, config, patch } = useAdminPlatformConfig();
  const [message, setMessage] = useState("");
  const [ipInput, setIpInput] = useState("");

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
      <AdminDashboardShell>
        <div className="flex items-center justify-center min-h-[320px]">
          <Loader2 className="w-8 h-8 animate-spin text-green-600" />
        </div>
      </AdminDashboardShell>
    );
  }

  return (
    <AdminDashboardShell>
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 font-display">Platform Configuration</h2>
          <p className="text-gray-500 text-sm mt-1">
            Global settings, feature toggles, and admin security — synced with hosts and bookings.
            API keys and third-party credentials are under{" "}
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

        {activeTab === "global" && (
          <div className="space-y-6">
            <section className="bg-white rounded-2xl border p-5 space-y-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Wallet className="w-4 h-4 text-green-700" /> Currency
              </h3>
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
                  {["AED", "SAR", "OMR", "QAR", "USD", "EUR"].map((code) => {
                    const active = config.global.supportedCurrencies.includes(code);
                    return (
                      <button
                        key={code}
                        type="button"
                        onClick={() => {
                          patch((prev) => {
                            const set = new Set(prev.global.supportedCurrencies);
                            if (set.has(code)) set.delete(code);
                            else set.add(code);
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
                            : "border-gray-200 text-gray-600"
                        )}
                      >
                        {code}
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>

            <section className="bg-white rounded-2xl border p-5 space-y-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Globe2 className="w-4 h-4 text-green-700" /> Supported languages
              </h3>
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
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-green-700" /> Service areas / regions
              </h3>
              <p className="text-xs text-gray-500">
                Controls where farm stays are offered — synced with listing geography and search.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
                <ToggleLeft className="w-4 h-4 text-green-700" /> Platform-wide booking
              </h3>
              <label className="flex items-center justify-between gap-3 border border-gray-100 rounded-xl px-4 py-3 cursor-pointer">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Instant booking (platform-wide)</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    When off, hosts cannot enable instant book and listings won&apos;t show instant confirmation.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={config.features.instantBookingPlatformWide}
                  onChange={(e) => {
                    patch((prev) => ({
                      ...prev,
                      features: {
                        ...prev.features,
                        instantBookingPlatformWide: e.target.checked,
                      },
                    }));
                    flash(
                      e.target.checked
                        ? "Instant booking enabled platform-wide."
                        : "Instant booking disabled platform-wide."
                    );
                  }}
                  className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                />
              </label>
            </section>

            <section className="bg-white rounded-2xl border p-5 space-y-3">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-green-700" /> Host feature toggles
              </h3>
              <p className="text-xs text-gray-500">
                Master switches — when off, hosts cannot use that capability regardless of their own settings.
              </p>
              {(Object.keys(HOST_FEATURE_LABELS) as HostFeatureKey[]).map((key) => (
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
                      flash(`${HOST_FEATURE_LABELS[key]} ${e.target.checked ? "enabled" : "disabled"}.`);
                    }}
                    className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                </label>
              ))}
            </section>

            <section className="bg-white rounded-2xl border p-5 space-y-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Shield className="w-4 h-4 text-green-700" /> Host bounds (Super Admin)
              </h3>
              <p className="text-xs text-gray-500">
                Set floors and ceilings hosts (and commission overrides) cannot cross.
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
                            maxCancellationStrictness: e.target
                              .value as CancellationStrictnessId,
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
                    Minimum nightly price (0 = no floor)
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
              <label className="flex items-center justify-between gap-3 border border-gray-100 rounded-xl px-4 py-3 cursor-pointer">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Require 2FA for admin panel</p>
                  <p className="text-xs text-gray-500">All admin, sub-admin, and support staff must use two-factor auth.</p>
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
          Last saved {new Date(config.updatedAt).toLocaleString("en-GB")}
        </p>
      </div>
    </AdminDashboardShell>
  );
}
