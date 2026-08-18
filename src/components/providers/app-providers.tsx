"use client";

import { AdminTaxonomyProvider } from "@/components/providers/admin-taxonomy-provider";
import { CountryProvider } from "@/components/providers/country-provider";
import { HomePageSettingsProvider } from "@/components/providers/home-page-settings-provider";
import { ListingQualityRulesProvider } from "@/components/providers/listing-quality-rules-provider";
import { ListingSettingsProvider } from "@/components/providers/listing-settings-provider";
import { ListingTagsProvider } from "@/components/providers/listing-tags-provider";
import { ListingsProvider } from "@/lib/listings/use-listing-submissions";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ListingsProvider>
      <AdminTaxonomyProvider>
        <CountryProvider>
          <HomePageSettingsProvider>
            <ListingSettingsProvider>
              <ListingTagsProvider>
                <ListingQualityRulesProvider>{children}</ListingQualityRulesProvider>
              </ListingTagsProvider>
            </ListingSettingsProvider>
          </HomePageSettingsProvider>
        </CountryProvider>
      </AdminTaxonomyProvider>
    </ListingsProvider>
  );
}
