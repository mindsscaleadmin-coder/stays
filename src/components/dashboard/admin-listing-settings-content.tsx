"use client";

import { useMemo, useState } from "react";
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
import { useAdminTaxonomy } from "@/components/providers/admin-taxonomy-provider";
import {
  getListingFeatureIcon,
  LISTING_FEATURE_ICON_OPTIONS,
  MAX_LISTING_FEATURE_ICONS,
} from "@/lib/listings/listing-feature-icons";
import { normalizeListingTaxonomyScope } from "@/lib/admin/listing-settings-scope";
import { isFilterEnabled } from "@/lib/admin/taxonomy-types";
import { cn } from "@/lib/utils";

const selectClass =
  "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500";

function TaxonomyScopeSelects({
  parentId,
  categoryId,
  subcategoryId,
  onChange,
  compact,
}: {
  parentId?: string;
  categoryId?: string;
  subcategoryId?: string;
  onChange: (next: {
    parentId?: string;
    categoryId?: string;
    subcategoryId?: string;
  }) => void;
  compact?: boolean;
}) {
  const { data } = useAdminTaxonomy();
  const parents = useMemo(
    () => data.parents.filter((p) => isFilterEnabled(p)),
    [data.parents]
  );
  const categories = useMemo(
    () =>
      data.categories.filter(
        (c) => isFilterEnabled(c) && (!parentId || c.parentId === parentId)
      ),
    [data.categories, parentId]
  );
  const subcategories = useMemo(
    () =>
      data.subcategories.filter(
        (s) =>
          isFilterEnabled(s) &&
          (!parentId || s.parentId === parentId) &&
          (!categoryId || s.categoryId === categoryId)
      ),
    [data.subcategories, parentId, categoryId]
  );

  function setParent(value: string) {
    onChange(
      normalizeListingTaxonomyScope({
        parentId: value || undefined,
        categoryId: undefined,
        subcategoryId: undefined,
      })
    );
  }

  function setCategory(value: string) {
    onChange(
      normalizeListingTaxonomyScope({
        parentId,
        categoryId: value || undefined,
        subcategoryId: undefined,
      })
    );
  }

  function setSubcategory(value: string) {
    onChange(
      normalizeListingTaxonomyScope({
        parentId,
        categoryId,
        subcategoryId: value || undefined,
      })
    );
  }

  return (
    <div
      className={cn(
        "grid gap-2 min-w-0",
        compact ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-1 sm:grid-cols-3"
      )}
    >
      <select
        value={parentId ?? ""}
        onChange={(e) => setParent(e.target.value)}
        className={selectClass}
        aria-label="Parent category scope"
      >
        <option value="">All parents</option>
        {parents.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      <select
        value={categoryId ?? ""}
        onChange={(e) => setCategory(e.target.value)}
        disabled={!parentId}
        className={cn(selectClass, "disabled:bg-gray-50 disabled:text-gray-400")}
        aria-label="Category scope"
      >
        <option value="">{parentId ? "All categories" : "Select parent first"}</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <select
        value={subcategoryId ?? ""}
        onChange={(e) => setSubcategory(e.target.value)}
        disabled={!categoryId}
        className={cn(selectClass, "disabled:bg-gray-50 disabled:text-gray-400")}
        aria-label="Sub category scope"
      >
        <option value="">
          {categoryId ? "All subcategories" : "Select category first"}
        </option>
        {subcategories.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
    </div>
  );
}

function scopeBadge(
  item: { parentId?: string; categoryId?: string; subcategoryId?: string },
  names: {
    parent?: string;
    category?: string;
    subcategory?: string;
  }
): string {
  if (!item.parentId) return "All taxonomy";
  const parts = [names.parent ?? item.parentId];
  if (item.categoryId) parts.push(names.category ?? item.categoryId);
  if (item.subcategoryId) parts.push(names.subcategory ?? item.subcategoryId);
  return parts.join(" → ");
}

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
  const { data } = useAdminTaxonomy();
  const [message, setMessage] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newIconLabel, setNewIconLabel] = useState("");
  const [newIconKey, setNewIconKey] = useState<string>("mountain");
  const [newIconScope, setNewIconScope] = useState<{
    parentId?: string;
    categoryId?: string;
    subcategoryId?: string;
  }>({});
  const [newHighlightScope, setNewHighlightScope] = useState<{
    parentId?: string;
    categoryId?: string;
    subcategoryId?: string;
  }>({});

  const parentName = useMemo(
    () => new Map(data.parents.map((p) => [p.id, p.name])),
    [data.parents]
  );
  const categoryName = useMemo(
    () => new Map(data.categories.map((c) => [c.id, c.name])),
    [data.categories]
  );
  const subcategoryName = useMemo(
    () => new Map(data.subcategories.map((s) => [s.id, s.name])),
    [data.subcategories]
  );

  function flash(text: string) {
    setMessage(text);
    setTimeout(() => setMessage(""), 2500);
  }

  function handleAddHighlight(e: React.FormEvent) {
    e.preventDefault();
    const label = newLabel.trim();
    if (!label) return;
    const scope = normalizeListingTaxonomyScope(newHighlightScope);
    addHighlight({
      label,
      enabled: true,
      ...scope,
    });
    setNewLabel("");
    setNewHighlightScope({});
    flash("Highlight added.");
  }

  function handleAddFeatureIcon(e: React.FormEvent) {
    e.preventDefault();
    const label = newIconLabel.trim();
    if (!label) return;
    const scope = normalizeListingTaxonomyScope(newIconScope);
    addFeatureIcon({
      label,
      iconKey: newIconKey,
      enabled: true,
      ...scope,
    });
    setNewIconLabel("");
    setNewIconKey("mountain");
    setNewIconScope({});
    flash("Feature icon added.");
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 font-display">Listing</h2>
        <p className="text-gray-500 text-sm mt-1">
          Manage feature icons and property highlights hosts can select on the listing form.
          Scope each option to a parent, category, and/or subcategory — leave blank for all.
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
          the icon row above Property highlights on the public listing page. Scoped icons only
          show when the listing matches that taxonomy.
        </p>

        <div className="space-y-2">
          {settings.featureIcons.map((item, index) => {
            const Icon = getListingFeatureIcon(item.iconKey);
            const badge = scopeBadge(item, {
              parent: item.parentId ? parentName.get(item.parentId) : undefined,
              category: item.categoryId ? categoryName.get(item.categoryId) : undefined,
              subcategory: item.subcategoryId
                ? subcategoryName.get(item.subcategoryId)
                : undefined,
            });
            return (
              <div
                key={item.id}
                className="flex flex-col gap-3 border border-gray-100 rounded-xl p-3 bg-gray-50/50"
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
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
                      className={selectClass}
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

                <div className="space-y-1.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                    Scope · {badge}
                  </p>
                  <TaxonomyScopeSelects
                    parentId={item.parentId}
                    categoryId={item.categoryId}
                    subcategoryId={item.subcategoryId}
                    onChange={(next) =>
                      updateFeatureIcon(item.id, {
                        parentId: next.parentId,
                        categoryId: next.categoryId,
                        subcategoryId: next.subcategoryId,
                      })
                    }
                    compact
                  />
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
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-gray-600">Taxonomy scope (optional)</p>
            <TaxonomyScopeSelects
              parentId={newIconScope.parentId}
              categoryId={newIconScope.categoryId}
              subcategoryId={newIconScope.subcategoryId}
              onChange={setNewIconScope}
            />
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
          selected. Scope them the same way as feature icons.
        </p>

        <div className="space-y-2">
          {settings.highlights.map((item, index) => {
            const badge = scopeBadge(item, {
              parent: item.parentId ? parentName.get(item.parentId) : undefined,
              category: item.categoryId ? categoryName.get(item.categoryId) : undefined,
              subcategory: item.subcategoryId
                ? subcategoryName.get(item.subcategoryId)
                : undefined,
            });
            return (
              <div
                key={item.id}
                className="flex flex-col gap-3 border border-gray-100 rounded-xl p-3 bg-gray-50/50"
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
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

                <div className="space-y-1.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                    Scope · {badge}
                  </p>
                  <TaxonomyScopeSelects
                    parentId={item.parentId}
                    categoryId={item.categoryId}
                    subcategoryId={item.subcategoryId}
                    onChange={(next) =>
                      updateHighlight(item.id, {
                        parentId: next.parentId,
                        categoryId: next.categoryId,
                        subcategoryId: next.subcategoryId,
                      })
                    }
                    compact
                  />
                </div>
              </div>
            );
          })}
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
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-gray-600">Taxonomy scope (optional)</p>
            <TaxonomyScopeSelects
              parentId={newHighlightScope.parentId}
              categoryId={newHighlightScope.categoryId}
              subcategoryId={newHighlightScope.subcategoryId}
              onChange={setNewHighlightScope}
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
