"use client";

import { Suspense } from "react";
import { AdminFiltersUrlSync } from "./admin-filters-url-sync";

export default function AdminFiltersPageClient() {
  return (
    <Suspense
      fallback={
        <div className="bg-white rounded-2xl border shadow-sm p-8 text-sm text-gray-400">
          Loading filters…
        </div>
      }
    >
      <AdminFiltersUrlSync />
    </Suspense>
  );
}
