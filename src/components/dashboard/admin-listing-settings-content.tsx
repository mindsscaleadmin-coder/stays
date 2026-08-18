"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  List,
  Plus,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { useListingSettings } from "@/components/providers/listing-settings-provider";
import {
  getListingFeatureIcon,
  LISTING_FEATURE_ICON_OPTIONS,
  MAX_LISTING_FEATURE_ICONS,
} from "@/lib/listings/listing-feature-icons";
export function AdminListingSettingsContent() {
  const {
    settings,
    addHighlight,
    updateHighlight,
    removeHighlight,
    reorderHighlight,
    resetHighlights,
    addFeatureIcon,
    updateFeatureIcon,
    removeFeatureIcon,
    reorderFeatureIcon,
    resetFeatureIcons,
  } = useListingSettings();
  const [message, setMessage] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newIconLabel, setNewIconLabel] = useState("");
  const [newIconKey, setNewIconKey] = useState<string>("mountain");

  function flash(text: string) {
    setMessage(text);
    setTimeout(() => setMessage(""), 2500);
  }

  function handleAddHighlight(e: React.FormEvent) {
    e.preventDefault();
    const label = newLabel.trim();
    if (!label) return;
    addHighlight({
      label,
      enabled: true,
    });
    setNewLabel("");
    flash("Highlight added.");
  }

  function handleAddFeatureIcon(e: React.FormEvent) {
    e.preventDefault();
    const label = newIconLabel.trim();
    if (!label) return;
    addFeatureIcon({
      label,
      iconKey: newIconKey,
      enabled: true,
    });
    setNewIconLabel("");
    setNewIconKey("mountain");
    flash("Feature icon added.");
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 font-display">Listing</h2>
        <p className="text-gray-500 text-sm mt-1">
          Manage feature icons and property highlights hosts can select on the listing form.
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
            <LayoutGrid className="w-4 h-4 text-green-700" />
            <h3 className="font-semibold text-gray-900">Feature icons</h3>
          </div>
          <button
            type="button"
            onClick={() => {
              resetFeatureIcons();
              flash("Restored default feature icons.");
            }}
            className="inline-flex items-center gap-1.5 text-xs border border-gray-200 hover:border-gray-300 text-gray-600 px-3 py-1.5 rounded-lg font-medium"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset defaults
          </button>
        </div>

        <p className="text-sm text-gray-500">
          Hosts pick up to {MAX_LISTING_FEATURE_ICONS} icons on the listing form. They appear in
          the icon row above Property highlights on the public listing page.
        </p>

        <div className="space-y-2">
          {settings.featureIcons.map((item, index) => {
            const Icon = getListingFeatureIcon(item.iconKey);
            return (
              <div
                key={item.id}
                className="flex flex-col sm:flex-row sm:items-center gap-3 border border-gray-100 rounded-xl p-3 bg-gray-50/50"
              >
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => reorderFeatureIcon(item.id, "up")}
                    className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-500 hover:text-gray-800 disabled:opacity-30"
                    aria-label="Move up"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    disabled={index === settings.featureIcons.length - 1}
                    onClick={() => reorderFeatureIcon(item.id, "down")}
                    className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-500 hover:text-gray-800 disabled:opacity-30"
                    aria-label="Move down"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  <div className="w-10 h-10 rounded-xl bg-green-50 border border-green-100 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-green-700" />
                  </div>
                </div>

                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2 min-w-0">
                  <input
                    value={item.label}
                    onChange={(e) => updateFeatureIcon(item.id, { label: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Label"
                  />
                  <select
                    value={item.iconKey}
                    onChange={(e) => updateFeatureIcon(item.id, { iconKey: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    {LISTING_FEATURE_ICON_OPTIONS.map((opt) => (
                      <option key={opt.key} value={opt.key}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <label className="inline-flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={item.enabled}
                      onChange={(e) =>
                        updateFeatureIcon(item.id, { enabled: e.target.checked })
                      }
                      className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                    />
                    Enabled
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      removeFeatureIcon(item.id);
                      flash("Feature icon removed.");
                    }}
                    className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"
                    aria-label="Remove icon"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <form onSubmit={handleAddFeatureIcon} className="border-t pt-4 space-y-3">
          <h4 className="text-sm font-semibold text-gray-900">Add feature icon</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              value={newIconLabel}
              onChange={(e) => setNewIconLabel(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="e.g. Mountain View"
              required
            />
            <select
              value={newIconKey}
              onChange={(e) => setNewIconKey(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              {LISTING_FEATURE_ICON_OPTIONS.map((opt) => (
                <option key={opt.key} value={opt.key}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 bg-green-700 hover:bg-green-800 text-white text-sm font-semibold px-4 py-2 rounded-lg"
          >
            <Plus className="w-4 h-4" />
            Add icon
          </button>
        </form>
      </section>

      <section className="bg-white rounded-2xl border shadow-sm p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <List className="w-4 h-4 text-green-700" />
            <h3 className="font-semibold text-gray-900">Property highlights</h3>
          </div>
          <button
            type="button"
            onClick={() => {
              resetHighlights();
              flash("Restored default highlights.");
            }}
            className="inline-flex items-center gap-1.5 text-xs border border-gray-200 hover:border-gray-300 text-gray-600 px-3 py-1.5 rounded-lg font-medium"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset defaults
          </button>
        </div>

        <p className="text-sm text-gray-500">
          These options appear on the host listing form and on the public listing page when
          selected.
        </p>

        <div className="space-y-2">
          {settings.highlights.map((item, index) => (
            <div
              key={item.id}
              className="flex flex-col sm:flex-row sm:items-center gap-3 border border-gray-100 rounded-xl p-3 bg-gray-50/50"
            >
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() => reorderHighlight(item.id, "up")}
                  className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-500 hover:text-gray-800 disabled:opacity-30"
                  aria-label="Move up"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  disabled={index === settings.highlights.length - 1}
                  onClick={() => reorderHighlight(item.id, "down")}
                  className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-500 hover:text-gray-800 disabled:opacity-30"
                  aria-label="Move down"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 min-w-0">
                <input
                  value={item.label}
                  onChange={(e) => updateHighlight(item.id, { label: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Highlight"
                />
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <label className="inline-flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={item.enabled}
                    onChange={(e) => updateHighlight(item.id, { enabled: e.target.checked })}
                    className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                  Enabled
                </label>
                <button
                  type="button"
                  onClick={() => {
                    removeHighlight(item.id);
                    flash("Highlight removed.");
                  }}
                  className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"
                  aria-label="Remove highlight"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={handleAddHighlight} className="border-t pt-4 space-y-3">
          <h4 className="text-sm font-semibold text-gray-900">Add highlight</h4>
          <div>
            <input
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="e.g. Private swimming pool with Jacuzzi"
              required
            />
          </div>
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 bg-green-700 hover:bg-green-800 text-white text-sm font-semibold px-4 py-2 rounded-lg"
          >
            <Plus className="w-4 h-4" />
            Add highlight
          </button>
        </form>
      </section>
    </div>
  );
}
