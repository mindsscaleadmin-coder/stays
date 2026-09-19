"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  CheckCircle,
  ChevronRight,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { useListingSettings } from "@/components/providers/listing-settings-provider";
import {
  hasListingTaxonomySelection,
  normalizeListingTaxonomyScope,
  resolveListingSettingsForTaxonomy,
  type ListingTaxonomyScope,
} from "@/lib/admin/listing-settings-scope";
import { cn } from "@/lib/utils";

export function ListingHighlightsField({
  selectedIds,
  onChange,
  taxonomy,
}: {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  taxonomy?: ListingTaxonomyScope;
}) {
  const { enabledHighlights, ready } = useListingSettings();
  const [open, setOpen] = useState(false);
  const [draftIds, setDraftIds] = useState<string[]>(selectedIds);
  const [query, setQuery] = useState("");

  const taxonomyScope = useMemo(
    () => normalizeListingTaxonomyScope(taxonomy ?? {}),
    [taxonomy]
  );

  const scopedHighlights = useMemo(
    () => resolveListingSettingsForTaxonomy(enabledHighlights, taxonomyScope),
    [enabledHighlights, taxonomyScope]
  );

  const scopedIdSet = useMemo(
    () => new Set(scopedHighlights.map((h) => h.id)),
    [scopedHighlights]
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
    }
  }, [open, selectedIds, scopedIdSet]);

  const selectedItems = useMemo(
    () => scopedHighlights.filter((h) => selectedIds.includes(h.id)),
    [scopedHighlights, selectedIds]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return scopedHighlights;
    return scopedHighlights.filter((h) => h.label.toLowerCase().includes(q));
  }, [scopedHighlights, query]);

  function toggleDraft(id: string) {
    setDraftIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function apply() {
    onChange(draftIds);
    setOpen(false);
  }

  function clearDraft() {
    setDraftIds([]);
  }

  if (!ready) return null;

  if (!hasListingTaxonomySelection(taxonomyScope)) {
    return (
      <div className="pt-2.5 border-t border-gray-100">
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle className="w-4 h-4 text-green-600" />
          <h4 className="text-sm font-semibold text-gray-900">Property highlights</h4>
        </div>
        <p className="text-xs text-gray-500">
          Select a parent category and category above to see highlight options from Admin → Settings
          → Listing.
        </p>
      </div>
    );
  }

  if (scopedHighlights.length === 0) {
    return (
      <div className="pt-2.5 border-t border-gray-100">
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle className="w-4 h-4 text-green-600" />
          <h4 className="text-sm font-semibold text-gray-900">Property highlights</h4>
        </div>
        <p className="text-xs text-gray-500">
          No property highlights are configured for this category yet. Add them in Admin → Settings →
          Listing.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="pt-2.5 border-t border-gray-100">
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle className="w-4 h-4 text-green-600" />
          <h4 className="text-sm font-semibold text-gray-900">Property highlights</h4>
        </div>
        <p className="text-xs text-gray-500 mb-3">
          Choose what guests see on your listing page. Options come from Admin → Settings →
          Listing.
        </p>

        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full text-start rounded-xl border border-gray-200 bg-gradient-to-br from-white to-gray-50/80 hover:border-green-300 hover:shadow-sm transition-all p-4 group"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-green-50 border border-green-100 flex items-center justify-center shrink-0 group-hover:bg-green-100/80 transition-colors">
                <Sparkles className="w-5 h-5 text-green-700" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900">
                  {selectedItems.length > 0
                    ? `${selectedItems.length} highlight${selectedItems.length === 1 ? "" : "s"} selected`
                    : "Select property highlights"}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {selectedItems.length > 0
                    ? "Tap to review or change your selection"
                    : "Open the picker and choose from admin options"}
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400 shrink-0 mt-1 group-hover:text-green-700 transition-colors" />
          </div>

          {selectedItems.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {selectedItems.slice(0, 4).map((item) => (
                <span
                  key={item.id}
                  className="inline-flex items-center gap-1 max-w-full truncate text-[11px] font-medium bg-green-50 text-green-800 border border-green-100 px-2 py-0.5 rounded-full"
                >
                  <Check className="w-3 h-3 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </span>
              ))}
              {selectedItems.length > 4 && (
                <span className="text-[11px] font-medium text-gray-500 px-2 py-0.5">
                  +{selectedItems.length - 4} more
                </span>
              )}
            </div>
          )}
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/45 backdrop-blur-[1px]"
            aria-label="Close highlights picker"
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="highlights-picker-title"
            className="relative bg-white w-full sm:max-w-lg shadow-2xl max-h-[88vh] flex flex-col rounded-t-2xl sm:rounded-2xl border border-gray-100"
          >
            <div className="flex items-start justify-between gap-3 px-5 py-4 border-b shrink-0 bg-gradient-to-r from-green-50/80 to-white">
              <div>
                <h2
                  id="highlights-picker-title"
                  className="font-bold text-gray-900 font-display text-base"
                >
                  Property highlights
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Select all that apply — shown on your public listing page
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
                  placeholder="Search highlights…"
                  className="w-full border border-gray-200 rounded-xl ps-9 pe-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500"
                />
              </div>
              <div className="flex items-center justify-between mt-2.5 text-xs">
                <span className="text-gray-500">
                  <span className="font-semibold text-gray-800">{draftIds.length}</span> of{" "}
                  {scopedHighlights.length} selected
                </span>
                {draftIds.length > 0 && (
                  <button
                    type="button"
                    onClick={clearDraft}
                    className="font-semibold text-gray-500 hover:text-red-600 transition-colors"
                  >
                    Clear all
                  </button>
                )}
              </div>
            </div>

            <div className="overflow-y-auto flex-1 p-4 space-y-2">
              {filtered.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">No highlights match your search.</p>
              ) : (
                filtered.map((item) => {
                  const selected = draftIds.includes(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => toggleDraft(item.id)}
                      className={cn(
                        "w-full flex items-start gap-3 text-start rounded-xl border p-3.5 transition-all",
                        selected
                          ? "border-green-500 bg-green-50/70 shadow-sm ring-1 ring-green-500/20"
                          : "border-gray-200 bg-white hover:border-green-300 hover:bg-gray-50"
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors",
                          selected
                            ? "bg-green-700 border-green-700 text-white"
                            : "border-gray-300 bg-white"
                        )}
                      >
                        {selected && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-gray-900 leading-snug">
                          {item.label}
                        </span>
                      </span>
                    </button>
                  );
                })
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
                Apply selection
                {draftIds.length > 0 ? ` (${draftIds.length})` : ""}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
