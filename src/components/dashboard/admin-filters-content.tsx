"use client";

import { Link } from "@/i18n/routing";
import { AdminExtraFiltersPanel, AdminFeatureFiltersPanel, AdminFilterPanel } from "./admin-filter-panel";

export function AdminFiltersContent() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 font-display">Filter</h2>
        <p className="text-gray-500 text-sm mt-1">
          Pick a tab (Country opens by default), then add items with the single form under the list.
          Use Active to show or hide options. Countries also sync from{" "}
          <Link href="/admin/countries" className="text-green-700 font-medium hover:underline">
            Countries
          </Link>
          .
        </p>
      </div>

      <AdminFilterPanel />
      <AdminExtraFiltersPanel />
      <AdminFeatureFiltersPanel />
    </div>
  );
}
