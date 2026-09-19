"use client";

import { useMemo } from "react";
import { buildSiteGraphJsonLd } from "@/lib/admin/seo-settings-data";
import { useCountrySeo } from "@/lib/admin/use-country-seo";
import { getSiteUrl } from "@/lib/seo/site";

export function OrganizationJsonLd() {
  const { ready, seo } = useCountrySeo();
  const jsonLd = useMemo(() => {
    if (!ready) return null;
    return buildSiteGraphJsonLd(seo, getSiteUrl());
  }, [ready, seo]);

  if (!jsonLd) return null;

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
