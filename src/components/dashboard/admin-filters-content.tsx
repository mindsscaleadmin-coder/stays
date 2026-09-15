"use client";

import dynamic from "next/dynamic";

const AdminFilterPanel = dynamic(
  () => import("./admin-filter-panel").then((mod) => mod.AdminFilterPanel),
  {
    ssr: false,
    loading: () => (
      <div className="bg-white rounded-2xl border shadow-sm p-8 text-sm text-gray-400">
        Loading filter panel…
      </div>
    ),
  }
);

const AdminExtraFiltersPanel = dynamic(
  () => import("./admin-filter-panel").then((mod) => mod.AdminExtraFiltersPanel),
  { ssr: false }
);

const AdminFeatureFiltersPanel = dynamic(
  () => import("./admin-filter-panel").then((mod) => mod.AdminFeatureFiltersPanel),
  { ssr: false }
);

export interface AdminFiltersContentProps {
  tabParam: string | null;
  countryFromUrl: string;
  stateFromUrl: string;
  districtFromUrl: string;
  onNavigate: (href: string) => void;
}

export function AdminFiltersContent({
  tabParam,
  countryFromUrl,
  stateFromUrl,
  districtFromUrl,
  onNavigate,
}: AdminFiltersContentProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 font-display">Filter</h2>
        <p className="text-gray-500 text-sm mt-1">
          Pick a tab (Country opens by default), then add items with the single form under the list.
          Use Active to show or hide options. Cities live under a district (Country → State →
          District → City). Add them on the City tab after picking a district — do not use Add tab
          for geography.
        </p>
      </div>

      <AdminFilterPanel
        tabParam={tabParam}
        countryFromUrl={countryFromUrl}
        stateFromUrl={stateFromUrl}
        districtFromUrl={districtFromUrl}
        onNavigate={onNavigate}
      />
      <AdminExtraFiltersPanel />
      <AdminFeatureFiltersPanel />
    </div>
  );
}
