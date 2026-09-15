"use client";

import { useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/routing";
import { AdminFiltersContent } from "./admin-filters-content";

export function AdminFiltersUrlSync() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const onNavigate = useCallback((href: string) => {
    router.replace(href);
  }, [router]);

  return (
    <AdminFiltersContent
      tabParam={searchParams.get("tab")}
      countryFromUrl={searchParams.get("country") || ""}
      stateFromUrl={searchParams.get("state") || ""}
      districtFromUrl={searchParams.get("district") || ""}
      onNavigate={onNavigate}
    />
  );
}
