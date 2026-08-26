"use client";

import { useMemo } from "react";
import Image from "next/image";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { useAdminTaxonomy } from "@/components/providers/admin-taxonomy-provider";
import { taxonomyDestinationCards } from "@/lib/admin/taxonomy-nav";
import { usePublicListings } from "@/lib/listings/use-public-listings";

export function DestinationsPageContent() {
  const t = useTranslations("destinationsPage");
  const { data: taxonomy } = useAdminTaxonomy();
  const { listings } = usePublicListings();
  const destinations = useMemo(
    () => taxonomyDestinationCards(taxonomy, 48),
    [taxonomy]
  );

  return (
    <div className="bg-white min-h-[60vh]">
      <div className="max-w-7xl mx-auto px-4 py-8 sm:py-10">
        <header className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 font-display">
            {t("title")}
          </h1>
          <p className="text-gray-500 text-sm mt-1">{t("subtitle")}</p>
        </header>

        {destinations.length === 0 ? (
          <p className="text-sm text-gray-500">
            Add countries, states, or districts in Admin → Settings → Filter to
            show destinations here.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
            {destinations.map((dest) => {
              const stayCount = listings.filter((s) =>
                s.location.toLowerCase().includes(dest.name.toLowerCase())
              ).length;
              return (
                <Link key={dest.id} href={dest.href} className="group">
                  <div className="relative aspect-[4/3] rounded-2xl overflow-hidden mb-2">
                    <Image
                      src={dest.img}
                      alt={dest.name}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-500"
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-3 inset-x-0 text-center px-2">
                      <div className="text-white text-base sm:text-lg font-bold">
                        {dest.name}
                      </div>
                      <div className="text-gray-300 text-xs">
                        {dest.subtitle
                          ? `${stayCount} stays · ${dest.subtitle}`
                          : `${stayCount} stays`}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
