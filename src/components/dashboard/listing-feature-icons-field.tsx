"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronRight,
  LayoutGrid,
  Search,
  X,
} from "lucide-react";
import { useListingSettings } from "@/components/providers/listing-settings-provider";
import {
  getListingFeatureIcon,
  MAX_LISTING_FEATURE_ICONS,
} from "@/lib/listings/listing-feature-icons";
import {
  resolveListingSettingsForTaxonomy,
  type ListingTaxonomyScope,
} from "@/lib/admin/listing-settings-scope";
import { cn } from "@/lib/utils";

export function ListingFeatureIconsField({
  selectedIds,
  onChange,
  taxonomy,
}: {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  taxonomy?: ListingTaxonomyScope;
}) {
  const { enabledFeatureIcons, ready } = useListingSettings();
  const [open, setOpen] = useState(false);
  const [draftIds, setDraftIds] = useState<string[]>(selectedIds);
  const [query, setQuery] = useState("");
  const [limitMsg, setLimitMsg] = useState("");

  const scopedIcons = useMemo(
    () =>
      resolveListingSettingsForTaxonomy(enabledFeatureIcons, taxonomy ?? {}),
    [enabledFeatureIcons, taxonomy]
  );

  const scopedIdSet = useMemo(
    () => new Set(scopedIcons.map((f) => f.id)),
    [scopedIcons]
  );

  const selectedIdsRef = useRef(selectedIds);
  selectedIdsRef.current = selectedIds;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    const current = selectedIdsRef.current;
    const next = current.filter((id) => scopedIdSet.has(id));
    if (next.length !== current.length) {
      onChangeRef.current(next);
    }
  }, [scopedIdSet]);

  useEffect(() => {
    if (open) {
      setDraftIds(selectedIds.filter((id) => scopedIdSet.has(id)));
      setQuery("");
      setLimitMsg("");
    }
  }, [open, selectedIds, scopedIdSet]);

  const selectedItems = useMemo(
    () => scopedIcons.filter((f) => selectedIds.includes(f.id)),
    [scopedIcons, selectedIds]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return scopedIcons;
    return scopedIcons.filter(
      (f) =>
        f.label.toLowerCase().includes(q) ||
        f.iconKey.toLowerCase().includes(q)
    );
  }, [scopedIcons, query]);

  function toggleDraft(id: string) {
    setLimitMsg("");
    if (draftIds.includes(id)) {
      setDraftIds((prev) => prev.filter((x) => x !== id));
      return;
    }
    if (draftIds.length >= MAX_LISTING_FEATURE_ICONS) {
      setLimitMsg(`You can select up to ${MAX_LISTING_FEATURE_ICONS} icons only.`);
      return;
    }
    setDraftIds((prev) => [...prev, id]);
  }

  function apply() {
    onChange(draftIds);
    setOpen(false);
  }

  if (!ready) {
    return (
      <div className="pt-2.5 border-t border-gray-100">
        <p className="text-sm text-gray-400">Loading feature icons…</p>
      </div>
    );
  }

  if (scopedIcons.length === 0) {
    return (
      <div className="pt-2.5 border-t border-gray-100">
        <h4 className="text-sm font-semibold text-gray-900 mb-2">Feature icons</h4>
        <p className="text-sm text-gray-400">
          {taxonomy?.parentId
            ? "No feature icons for this parent / category / subcategory yet."
            : "No icons configured yet. Ask an admin to add options under Settings → Listing."}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="pt-2.5 border-t border-gray-100">
        <div className="flex items-center gap-2 mb-2">
          <LayoutGrid className="w-4 h-4 text-green-600" />
          <h4 className="text-sm font-semibold text-gray-900">Feature icons</h4>
        </div>
        <p className="text-xs text-gray-500 mb-3">
          Pick up to {MAX_LISTING_FEATURE_ICONS} icons shown above Property highlights on your
          listing page.
        </p>

        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full text-start rounded-xl border border-gray-200 bg-gradient-to-br from-white to-gray-50/80 hover:border-green-300 hover:shadow-sm transition-all p-4 group"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-green-50 border border-green-100 flex items-center justify-center shrink-0">
                <LayoutGrid className="w-5 h-5 text-green-700" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900">
                  {selectedItems.length > 0
                    ? `${selectedItems.length}/${MAX_LISTING_FEATURE_ICONS} icons selected`
                    : "Select feature icons"}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Mountain view, pool, BBQ, seating — max {MAX_LISTING_FEATURE_ICONS}
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400 shrink-0 mt-1 group-hover:text-green-700 transition-colors" />
          </div>

          {selectedItems.length > 0 && (
            <div className="mt-3 grid grid-cols-4 gap-2">
              {selectedItems.map((item) => {
                const Icon = getListingFeatureIcon(item.iconKey);
                return (
                  <div
                    key={item.id}
                    className="flex flex-col items-center gap-1 text-center min-w-0"
                  >
                    <div className="w-11 h-11 rounded-xl bg-green-50 border border-green-100 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-green-700" />
                    </div>
                    <span className="text-[10px] text-gray-600 font-medium truncate w-full">
                      {item.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/45 backdrop-blur-[1px]"
            aria-label="Close icon picker"
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="feature-icons-picker-title"
            className="relative bg-white w-full sm:max-w-lg shadow-2xl max-h-[88vh] flex flex-col rounded-t-2xl sm:rounded-2xl border border-gray-100"
          >
            <div className="flex items-start justify-between gap-3 px-5 py-4 border-b shrink-0 bg-gradient-to-r from-green-50/80 to-white">
              <div>
                <h2
                  id="feature-icons-picker-title"
                  className="font-bold text-gray-900 font-display text-base"
                >
                  Feature icons
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Select up to {MAX_LISTING_FEATURE_ICONS} — shown on your listing overview
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-2 rounded-lg hover:bg-white/80 text-gray-500 shrink-0"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-5 py-3 border-b bg-white shrink-0">
              <div className="relative">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search icons…"
                  className="w-full border border-gray-200 rounded-xl ps-9 pe-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500"
                />
              </div>
              <div className="flex items-center justify-between mt-2.5 text-xs">
                <span className="text-gray-500">
                  <span className="font-semibold text-gray-800">{draftIds.length}</span> /{" "}
                  {MAX_LISTING_FEATURE_ICONS} selected
                </span>
                {draftIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setDraftIds([]);
                      setLimitMsg("");
                    }}
                    className="font-semibold text-gray-500 hover:text-red-600 transition-colors"
                  >
                    Clear all
                  </button>
                )}
              </div>
              {limitMsg && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1.5 mt-2">
                  {limitMsg}
                </p>
              )}
            </div>

            <div className="overflow-y-auto flex-1 p-4">
              {filtered.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">No icons match your search.</p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {filtered.map((item) => {
                    const selected = draftIds.includes(item.id);
                    const disabled =
                      !selected && draftIds.length >= MAX_LISTING_FEATURE_ICONS;
                    const Icon = getListingFeatureIcon(item.iconKey);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => toggleDraft(item.id)}
                        disabled={disabled}
                        className={cn(
                          "flex flex-col items-center gap-2 rounded-xl border p-3.5 transition-all text-center",
                          selected
                            ? "border-green-500 bg-green-50/70 shadow-sm ring-1 ring-green-500/20"
                            : disabled
                              ? "border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed"
                              : "border-gray-200 bg-white hover:border-green-300 hover:bg-gray-50"
                        )}
                      >
                        <div className="relative">
                          <div
                            className={cn(
                              "w-12 h-12 rounded-xl flex items-center justify-center border",
                              selected
                                ? "bg-green-700 border-green-700 text-white"
                                : "bg-green-50 border-green-100 text-green-700"
                            )}
                          >
                            <Icon className="w-6 h-6" />
                          </div>
                          {selected && (
                            <span className="absolute -top-1 -end-1 w-5 h-5 rounded-full bg-green-700 border-2 border-white flex items-center justify-center">
                              <Check className="w-3 h-3 text-white" strokeWidth={3} />
                            </span>
                          )}
                        </div>
                        <span className="text-xs font-medium text-gray-900 leading-snug">
                          {item.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="shrink-0 border-t px-5 py-4 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end bg-gray-50/80 rounded-b-2xl">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 text-gray-700 hover:bg-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={apply}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-sm font-semibold bg-green-700 hover:bg-green-800 text-white transition-colors"
              >
                Apply ({draftIds.length}/{MAX_LISTING_FEATURE_ICONS})
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
