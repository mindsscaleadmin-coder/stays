"use client";

import { Sparkles, TrendingUp } from "lucide-react";
import { useHostPromotionsSettings } from "@/lib/admin/use-host-promotions-settings";
import { formatAmount, cn } from "@/lib/utils";
import type { ListingPromotionKind, ListingPromotionPackage } from "@/lib/host/host-promotions-types";
import { AdminListingAdsSection } from "@/components/dashboard/admin-listing-ads-section";

export function AdminPromotionsSettingsContent() {
  const { ready, settings, updatePackage } = useHostPromotionsSettings();

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
    currency,
  }: {
    kind: ListingPromotionKind;
    title: string;
    icon: typeof TrendingUp;
    items: ListingPromotionPackage[];
    currency: string;
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
                Host checkout shows: {pkg.label} — {currency}{" "}
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
        <h2 className="text-xl font-bold text-gray-900 font-display">Advertisements</h2>
        <p className="text-gray-500 text-sm mt-1">
          Manage listings sidebar ads and paid Trending / Featured packages hosts buy under
          Host → Promote.
        </p>
      </div>

      <AdminListingAdsSection />

      <PackageGroup
        kind="trending"
        title="Trending packages"
        icon={TrendingUp}
        items={trending}
        currency={settings.currency}
      />
      <PackageGroup
        kind="featured"
        title="Featured packages"
        icon={Sparkles}
        items={featured}
        currency={settings.currency}
      />
    </div>
  );
}
