"use client";

import { Suspense } from "react";
import { AdminExtraFiltersPanel, AdminFeatureFiltersPanel, AdminFilterPanel } from "./admin-filter-panel";

export function AdminFiltersContent() {
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

      <Suspense fallback={<div className="bg-white rounded-2xl border shadow-sm p-8 text-sm text-gray-400">Loading filters…</div>}>
        <AdminFilterPanel />
      </Suspense>
      <AdminExtraFiltersPanel />
      <AdminFeatureFiltersPanel />
    </div>
  );
}
