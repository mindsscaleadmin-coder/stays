"use client";

import { useMemo, useState } from "react";
import { Link } from "@/i18n/routing";
import { Loader2, Megaphone, Sparkles, TrendingUp } from "lucide-react";
import { useHostPromotionsSettings } from "@/lib/admin/use-host-promotions-settings";
import { useListingAds } from "@/lib/admin/use-listing-ads";
import { enabledListingAds } from "@/lib/admin/listing-ads-data";
import { formatAmount, cn } from "@/lib/utils";
import type { ListingPromotionKind, ListingPromotionPackage } from "@/lib/host/host-promotions-types";
import { AdminListingAdsSection } from "@/components/dashboard/admin-listing-ads-section";

const fieldClass =
  "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500";

export function AdminPromotionsSettingsContent() {
  const { ready, settings, patch, updatePackage } = useHostPromotionsSettings();
  const { ready: adsReady, settings: adSettings } = useListingAds();
  const [message, setMessage] = useState("");

  function flash(text: string) {
    setMessage(text);
    setTimeout(() => setMessage(""), 3000);
  }

  const summary = useMemo(() => {
    const sidebarAds = adSettings ? enabledListingAds(adSettings) : [];
    const packages = settings?.packages ?? [];
    return {
      sidebarAds: sidebarAds.length,
      trendingOn: packages.filter((p) => p.kind === "trending" && p.enabled).length,
      featuredOn: packages.filter((p) => p.kind === "featured" && p.enabled).length,
      promotionsLive: settings?.promotionsEnabled !== false,
    };
  }, [adSettings, settings]);

  if (!ready || !settings || !adsReady) {
    return (
      <div className="flex items-center justify-center min-h-[320px]">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  const trending = settings.packages.filter((p) => p.kind === "trending");
  const featured = settings.packages.filter((p) => p.kind === "featured");
  const currency = settings.currency;

  function PackageGroup({
    kind,
    title,
    icon: Icon,
    items,
  }: {
    kind: ListingPromotionKind;
    title: string;
    icon: typeof TrendingUp;
    items: ListingPromotionPackage[];
  }) {
    return (
      <section className="bg-white rounded-2xl border shadow-sm p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Icon
            className={cn(
              "w-4 h-4",
              kind === "trending" ? "text-amber-500" : "text-green-600"
            )}
          />
          <h3 className="font-semibold text-gray-900">{title}</h3>
        </div>
        <p className="text-xs text-gray-500">
          Hosts pick these under{" "}
          <Link href="/host/promote" className="text-green-700 font-medium hover:underline">
            Host → Promote
          </Link>
          . Prices are in {currency}.
        </p>
        <ul className="space-y-3">
          {items.map((pkg) => (
            <li
              key={pkg.id}
              className="border border-gray-100 rounded-xl p-3 bg-gray-50/50 space-y-3"
            >
              <div className="flex flex-wrap items-center gap-3">
                <label className="inline-flex items-center gap-2 shrink-0">
                  <input
                    type="checkbox"
                    checked={pkg.enabled}
                    onChange={(e) => {
                      updatePackage(pkg.id, { enabled: e.target.checked });
                      flash(`${pkg.label} ${e.target.checked ? "enabled" : "disabled"}.`);
                    }}
                    className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                  <span className="text-xs text-gray-500">On</span>
                </label>
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  {pkg.durationDays} days
                </span>
                <div className="flex items-center gap-1.5 ms-auto">
                  <span className="text-xs text-gray-500">{currency}</span>
                  <input
                    type="number"
                    min={0}
                    value={pkg.priceAed}
                    onChange={(e) =>
                      updatePackage(pkg.id, {
                        priceAed: Math.max(0, Number(e.target.value) || 0),
                      })
                    }
                    onBlur={() => flash(`${pkg.label} price saved.`)}
                    className="w-24 border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>
              <input
                value={pkg.label}
                onChange={(e) => updatePackage(pkg.id, { label: e.target.value })}
                onBlur={() => flash(`${pkg.label} label saved.`)}
                placeholder="Package label"
                className={fieldClass}
              />
              <textarea
                value={pkg.description}
                onChange={(e) => updatePackage(pkg.id, { description: e.target.value })}
                onBlur={() => flash(`${pkg.label} description saved.`)}
                rows={2}
                placeholder="What hosts see under this package"
                className={`${fieldClass} resize-y`}
              />
              <p className="text-[11px] text-gray-400">
                Host checkout shows: {pkg.label} — {currency} {formatAmount(pkg.priceAed)}
                {!pkg.enabled ? " (hidden)" : ""}
              </p>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 font-display">Advertisements</h2>
        <p className="text-gray-500 text-sm mt-1">
          Sidebar ads on search results and paid Trending / Featured packages for hosts. Changes
          sync to the public site and Host → Promote.
        </p>
      </div>

      {message && (
        <div className="bg-green-50 border border-green-200 text-green-800 text-sm rounded-xl px-4 py-3">
          {message}
        </div>
      )}

      <section className="bg-gradient-to-br from-green-50 to-white rounded-2xl border border-green-100 p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-green-800">Live wiring</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
          <div className="bg-white/80 border border-green-100 rounded-xl px-3 py-3">
            <p className="text-[10px] uppercase tracking-wide text-gray-500">Sidebar ads</p>
            <p className="text-sm font-semibold text-gray-900 mt-1">{summary.sidebarAds} live</p>
          </div>
          <div className="bg-white/80 border border-green-100 rounded-xl px-3 py-3">
            <p className="text-[10px] uppercase tracking-wide text-gray-500">Host promote</p>
            <p className="text-sm font-semibold text-gray-900 mt-1">
              {summary.promotionsLive ? "Enabled" : "Off"}
            </p>
          </div>
          <div className="bg-white/80 border border-green-100 rounded-xl px-3 py-3">
            <p className="text-[10px] uppercase tracking-wide text-gray-500">Trending packages</p>
            <p className="text-sm font-semibold text-gray-900 mt-1">{summary.trendingOn} on</p>
          </div>
          <div className="bg-white/80 border border-green-100 rounded-xl px-3 py-3">
            <p className="text-[10px] uppercase tracking-wide text-gray-500">Featured packages</p>
            <p className="text-sm font-semibold text-gray-900 mt-1">{summary.featuredOn} on</p>
          </div>
        </div>
      </section>

      <AdminListingAdsSection onNotice={flash} />

      <section className="bg-white rounded-2xl border shadow-sm p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Megaphone className="w-4 h-4 text-green-700" />
          <h3 className="font-semibold text-gray-900">Host Promote page</h3>
        </div>
        <p className="text-xs text-gray-500">
          Master switch and copy shown on the host checkout page. Package prices use {currency}.
        </p>
        <label className="flex items-center justify-between gap-3 border border-gray-100 rounded-xl px-4 py-3 cursor-pointer">
          <div>
            <p className="text-sm font-semibold text-gray-900">Allow paid promotions</p>
            <p className="text-xs text-gray-500">
              When off, hosts cannot buy Trending or Featured placements.
            </p>
          </div>
          <input
            type="checkbox"
            checked={settings.promotionsEnabled}
            onChange={(e) => {
              patch({ promotionsEnabled: e.target.checked });
              flash(`Host promotions ${e.target.checked ? "enabled" : "disabled"}.`);
            }}
            className="rounded border-gray-300 text-green-600 focus:ring-green-500"
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-gray-600 mb-1 block">Page title</span>
          <input
            value={settings.pageTitle}
            onChange={(e) => patch({ pageTitle: e.target.value })}
            onBlur={() => flash("Promote page title saved.")}
            className={fieldClass}
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-gray-600 mb-1 block">Page subtitle</span>
          <textarea
            value={settings.pageSubtitle}
            onChange={(e) => patch({ pageSubtitle: e.target.value })}
            onBlur={() => flash("Promote page subtitle saved.")}
            rows={2}
            className={`${fieldClass} resize-y`}
          />
        </label>
      </section>

      <PackageGroup
        kind="trending"
        title="Trending packages"
        icon={TrendingUp}
        items={trending}
      />
      <PackageGroup
        kind="featured"
        title="Featured packages"
        icon={Sparkles}
        items={featured}
      />
    </div>
  );
}
