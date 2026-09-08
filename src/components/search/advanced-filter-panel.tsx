"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { ExtraFilter, FeatureFilter, ParentCategory } from "@/lib/admin/taxonomy-types";
import { extraFilterMatchesParent } from "@/lib/admin/extra-filter-scope";
import { cn } from "@/lib/utils";

const VISIBLE_PILL_COUNT = 5;

function FilterPill({
  label,
  selected,
  onClick,
  variant = "default",
  compact = false,
}: {
  label: string;
  selected?: boolean;
  onClick: () => void;
  variant?: "default" | "link";
  compact?: boolean;
}) {
  if (variant === "link") {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "rounded-full border border-gray-300 bg-white font-medium text-blue-600 hover:border-blue-400 transition-colors",
          compact ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm"
        )}
      >
        {label}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border font-medium transition-colors",
        compact ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm",
        selected
          ? "border-gray-900 bg-gray-900 text-white"
          : "border-gray-300 bg-white text-gray-900 hover:border-gray-400"
      )}
    >
      {label}
    </button>
  );
}

function FilterSection({
  title,
  items,
  selectedIds,
  onToggle,
  viewMoreLabel,
  compact = false,
}: {
  title: string;
  items: { id: string; name: string }[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  viewMoreLabel: string;
  compact?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? items : items.slice(0, VISIBLE_PILL_COUNT);
  const hasMore = items.length > VISIBLE_PILL_COUNT;

  if (items.length === 0) return null;

  return (
    <section
      className={cn(
        "border-b border-gray-200 last:border-b-0",
        compact ? "px-4 py-3.5" : "px-5 py-5"
      )}
    >
      <h3
        className={cn(
          "font-semibold text-gray-900",
          compact ? "text-sm mb-3" : "text-base mb-4"
        )}
      >
        {title}
      </h3>
      <div className={cn("flex flex-wrap", compact ? "gap-2" : "gap-2.5")}>
        {visible.map((item) => (
          <FilterPill
            key={item.id}
            label={item.name}
            selected={selectedIds.includes(item.id)}
            onClick={() => onToggle(item.id)}
            compact={compact}
          />
        ))}
        {hasMore && !expanded && (
          <FilterPill
            label={viewMoreLabel}
            variant="link"
            onClick={() => setExpanded(true)}
            compact={compact}
          />
        )}
      </div>
    </section>
  );
}

export function AdvancedFilterPanel({
  tabs,
  extraFilters,
  featureFilters = [],
  parents = [],
  parentCategoryId = "",
  selectedIds,
  onChange,
  onApply,
  onClear,
  className,
  showFooter = true,
  compact = false,
}: {
  tabs: { id: string; label: string }[];
  extraFilters: ExtraFilter[];
  featureFilters?: FeatureFilter[];
  parents?: ParentCategory[];
  parentCategoryId?: string;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  onApply: () => void;
  onClear: () => void;
  className?: string;
  showFooter?: boolean;
  compact?: boolean;
}) {
  const t = useTranslations("home.search");

  function toggle(id: string) {
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((x) => x !== id)
        : [...selectedIds, id]
    );
  }

  const featureSections = useMemo(() => {
    const scopedParents = parentCategoryId
      ? parents.filter((p) => p.id === parentCategoryId)
      : parents;

    return scopedParents
      .map((parent) => ({
        parent,
        items: featureFilters.filter((ff) => ff.parentId === parent.id),
      }))
      .filter((section) => section.items.length > 0);
  }, [featureFilters, parentCategoryId, parents]);

  const hasFilters = tabs.length > 0 || featureSections.length > 0;

  return (
    <div className={cn("bg-white flex flex-col", className)}>
      <div className="flex-1 overflow-y-auto">
        {!hasFilters ? (
          <p className="px-5 py-6 text-sm text-gray-400">{t("noAdvancedFilters")}</p>
        ) : (
          <>
            {tabs.map((tab) => (
              <FilterSection
                key={tab.id}
                title={tab.label}
                items={extraFilters.filter(
                  (ef) =>
                    ef.type === tab.id &&
                    extraFilterMatchesParent(ef, parentCategoryId || null)
                )}
                selectedIds={selectedIds}
                onToggle={toggle}
                viewMoreLabel={t("viewMore")}
                compact={compact}
              />
            ))}
            {featureSections.map(({ parent, items }) => (
              <FilterSection
                key={`feature-${parent.id}`}
                title={parentCategoryId ? t("featureFilters") : `${parent.name} · ${t("featureFilters")}`}
                items={items}
                selectedIds={selectedIds}
                onToggle={toggle}
                viewMoreLabel={t("viewMore")}
                compact={compact}
              />
            ))}
          </>
        )}
      </div>

      {showFooter && (
        <div
          className={cn(
            "flex gap-2.5 bg-white border-t border-gray-200 shrink-0",
            compact ? "px-4 py-3" : "px-5 py-4 gap-3"
          )}
        >
          <button
            type="button"
            onClick={onClear}
            className={cn(
              "flex-1 rounded-lg border border-gray-300 bg-white font-semibold text-gray-900 hover:bg-gray-50 transition-colors",
              compact ? "px-3 py-2.5 text-xs" : "px-4 py-3 text-sm"
            )}
          >
            {t("clearFilters")}
          </button>
          <button
            type="button"
            onClick={onApply}
            className={cn(
              "flex-[1.4] rounded-lg bg-gray-900 font-semibold text-white hover:bg-gray-800 transition-colors",
              compact ? "px-3 py-2.5 text-xs" : "px-4 py-3 text-sm"
            )}
          >
            {t("applyFilters")}
          </button>
        </div>
      )}
    </div>
  );
}
