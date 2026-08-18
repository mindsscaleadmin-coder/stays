"use client";

import { useState } from "react";
import { Megaphone, RotateCcw, Sparkles, TrendingUp } from "lucide-react";
import { useHostPromotionsSettings } from "@/lib/admin/use-host-promotions-settings";
import { formatAmount, cn } from "@/lib/utils";
import type { ListingPromotionKind } from "@/lib/host/host-promotions-types";

export function AdminPromotionsSettingsContent() {
  const { ready, settings, patch, updatePackage, resetDefaults } =
    useHostPromotionsSettings();
  const [message, setMessage] = useState("");

  function flash(text: string) {
    setMessage(text);
    setTimeout(() => setMessage(""), 2500);
  }

  if (!ready || !settings) {
    return <p className="text-sm text-gray-400">Loading…</p>;
  }

  const trending = settings.packages.filter((p) => p.kind === "trending");
  const featured = settings.packages.filter((p) => p.kind === "featured");

  function PackageGroup({
    kind,
    title,
    icon: Icon,
    items,
  }: {
    kind: ListingPromotionKind;
    title: string;
    icon: typeof TrendingUp;
    items: typeof settings.packages;
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
                    onChange={(e) =>
                      updatePackage(pkg.id, { enabled: e.target.checked })
                    }
                    className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                  <span className="text-xs text-gray-500">On</span>
                </label>
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  {pkg.durationDays} days
                </span>
                <div className="flex items-center gap-1.5 ms-auto">
                  <span className="text-xs text-gray-500">AED</span>
                  <input
                    type="number"
                    min={0}
                    value={pkg.priceAed}
                    onChange={(e) =>
                      updatePackage(pkg.id, {
                        priceAed: Math.max(0, Number(e.target.value) || 0),
                      })
                    }
                    className="w-24 border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>
              <input
                value={pkg.label}
                onChange={(e) => updatePackage(pkg.id, { label: e.target.value })}
                placeholder="Package label"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <textarea
                value={pkg.description}
                onChange={(e) =>
                  updatePackage(pkg.id, { description: e.target.value })
                }
                rows={2}
                placeholder="What hosts see under this package"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500 resize-y"
              />
              <p className="text-[11px] text-gray-400">
                Host checkout shows: {pkg.label} — {settings.currency}{" "}
                {formatAmount(pkg.priceAed)}
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
        <h2 className="text-xl font-bold text-gray-900 font-display">Promote</h2>
        <p className="text-gray-500 text-sm mt-1">
          Set prices, labels, and copy for paid Trending and Featured placements. Hosts buy
          these under Host → Promote.
        </p>
      </div>

      {message && (
        <div className="bg-green-50 border border-green-200 text-green-800 text-sm rounded-xl px-4 py-3">
          {message}
        </div>
      )}

      <section className="bg-white rounded-2xl border shadow-sm p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-green-700" />
            <h3 className="font-semibold text-gray-900">Promote page</h3>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={settings.promotionsEnabled}
                onChange={(e) => {
                  patch({ promotionsEnabled: e.target.checked });
                  flash(
                    e.target.checked
                      ? "Promotions enabled for hosts."
                      : "Promotions disabled for hosts."
                  );
                }}
                className="rounded border-gray-300 text-green-600 focus:ring-green-500"
              />
              Accept host purchases
            </label>
            <button
              type="button"
              onClick={() => {
                resetDefaults();
                flash("Restored default promote packages.");
              }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 border border-gray-200 hover:border-green-400 px-3 py-1.5 rounded-lg"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset defaults
            </button>
          </div>
        </div>

        {!settings.promotionsEnabled && (
          <p className="text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
            Hosts cannot buy Trending or Featured while this is off.
          </p>
        )}

        <label className="block">
          <span className="text-xs font-medium text-gray-600 mb-1.5 block">Page title</span>
          <input
            value={settings.pageTitle}
            onChange={(e) => patch({ pageTitle: e.target.value })}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-gray-600 mb-1.5 block">
            Page subtitle
          </span>
          <textarea
            value={settings.pageSubtitle}
            onChange={(e) => patch({ pageSubtitle: e.target.value })}
            rows={2}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-y"
          />
        </label>
        <p className="text-xs text-gray-400">
          Currency is fixed to {settings.currency} for promote packages.
        </p>
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
