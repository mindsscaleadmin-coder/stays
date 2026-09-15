"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { useAdminTaxonomy } from "@/components/providers/admin-taxonomy-provider";
import { enabledParentTabs } from "@/lib/admin/taxonomy-nav";
import { cn } from "@/lib/utils";

export const ALL_PARENT_TAB_ID = "";

export function HomeCategoryTabs({
  selectedParentId,
  onSelect,
}: {
  selectedParentId: string;
  onSelect: (parentId: string, parentName: string) => void;
}) {
  const t = useTranslations("common");
  const { data } = useAdminTaxonomy();
  const parents = useMemo(() => enabledParentTabs(data), [data]);

  if (parents.length === 0) return null;

  const tabClass = (active: boolean) =>
    cn(
      "px-4 py-2 rounded-full text-sm font-semibold transition-colors border",
      active
        ? "bg-white text-green-900 border-white shadow-sm"
        : "bg-white/10 text-white border-white/30 hover:bg-white/20 hover:border-white/50"
    );

  return (
    <div
      className="flex flex-wrap items-center gap-2 mb-4"
      role="tablist"
      aria-label="Browse by category"
    >
      <button
        type="button"
        role="tab"
        aria-selected={selectedParentId === ALL_PARENT_TAB_ID}
        onClick={() => onSelect(ALL_PARENT_TAB_ID, t("all"))}
        className={tabClass(selectedParentId === ALL_PARENT_TAB_ID)}
      >
        {t("all")}
      </button>
      {parents.map((parent) => {
        const active = parent.id === selectedParentId;
        return (
          <button
            key={parent.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onSelect(parent.id, parent.name)}
            className={tabClass(active)}
          >
            {parent.name}
          </button>
        );
      })}
    </div>
  );
}
