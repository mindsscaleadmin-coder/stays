"use client";

import { Plus, Trash2 } from "lucide-react";
import { emptyListingAd } from "@/lib/admin/listing-ads-data";
import { useListingAds } from "@/lib/admin/use-listing-ads";

const fieldClass =
  "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500";

export function AdminListingAdsSection() {
  const { ready, settings, updateAd, addAd, removeAd } = useListingAds();

  if (!ready || !settings) {
    return <p className="text-sm text-gray-400">Loading ads…</p>;
  }

  return (
    <section className="bg-white rounded-2xl border shadow-sm p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-display font-semibold text-gray-900">Listings sidebar</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            Ads shown on the search results column. Tall fills the sponsored card; short
            fills the smaller slot.
          </p>
        </div>
        <button
          type="button"
          onClick={() => addAd(emptyListingAd())}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-green-800 border border-green-200 hover:bg-green-50 px-3 py-1.5 rounded-lg"
        >
          <Plus className="w-4 h-4" /> Add ad
        </button>
      </div>

      {settings.ads.length === 0 ? (
        <p className="text-sm text-gray-500">No ads yet. Add one to show on listings.</p>
      ) : (
        <ul className="space-y-4">
          {settings.ads.map((ad) => (
            <li
              key={ad.id}
              className="border border-gray-100 rounded-xl p-4 bg-gray-50/50 space-y-3"
            >
              <div className="flex flex-wrap items-center gap-3">
                <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={ad.enabled}
                    onChange={(e) => updateAd(ad.id, { enabled: e.target.checked })}
                    className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                  On
                </label>
                <select
                  value={ad.placement}
                  onChange={(e) =>
                    updateAd(ad.id, {
                      placement: e.target.value === "short" ? "short" : "tall",
                    })
                  }
                  className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm bg-white"
                >
                  <option value="tall">Tall (sponsored)</option>
                  <option value="short">Short</option>
                </select>
                <button
                  type="button"
                  onClick={() => removeAd(ad.id)}
                  className="ms-auto inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-800"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Remove
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs font-medium text-gray-600 mb-1 block">Eyebrow</span>
                  <input
                    value={ad.eyebrow}
                    onChange={(e) => updateAd(ad.id, { eyebrow: e.target.value })}
                    className={fieldClass}
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-gray-600 mb-1 block">Title</span>
                  <input
                    value={ad.title}
                    onChange={(e) => updateAd(ad.id, { title: e.target.value })}
                    className={fieldClass}
                  />
                </label>
              </div>
              <label className="block">
                <span className="text-xs font-medium text-gray-600 mb-1 block">Body</span>
                <textarea
                  value={ad.body}
                  onChange={(e) => updateAd(ad.id, { body: e.target.value })}
                  rows={2}
                  className={`${fieldClass} resize-y`}
                />
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs font-medium text-gray-600 mb-1 block">
                    Button label
                  </span>
                  <input
                    value={ad.ctaLabel}
                    onChange={(e) => updateAd(ad.id, { ctaLabel: e.target.value })}
                    className={fieldClass}
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-gray-600 mb-1 block">
                    Button link
                  </span>
                  <input
                    value={ad.ctaHref}
                    onChange={(e) => updateAd(ad.id, { ctaHref: e.target.value })}
                    className={fieldClass}
                  />
                </label>
              </div>
              <label className="block">
                <span className="text-xs font-medium text-gray-600 mb-1 block">
                  Image URL (optional)
                </span>
                <input
                  value={ad.imageUrl}
                  onChange={(e) => updateAd(ad.id, { imageUrl: e.target.value })}
                  placeholder="https://…"
                  className={fieldClass}
                />
              </label>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
