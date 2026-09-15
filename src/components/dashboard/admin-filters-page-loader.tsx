"use client";

import dynamic from "next/dynamic";

const AdminFiltersPageClient = dynamic(
  () => import("./admin-filters-page-client"),
  {
    ssr: false,
    loading: () => (
      <div className="bg-white rounded-2xl border shadow-sm p-8 text-sm text-gray-400">
        Loading filters…
      </div>
    ),
  }
);

export function AdminFiltersPageLoader() {
  return <AdminFiltersPageClient />;
}
