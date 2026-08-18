"use client";

import Image from "next/image";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { DESTINATIONS } from "@/lib/mock/data";

export function DestinationsPageContent() {
  const t = useTranslations("destinationsPage");

  return (
    <div className="bg-white min-h-[60vh]">
      <div className="max-w-7xl mx-auto px-4 py-8 sm:py-10">
        <header className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 font-display">
            {t("title")}
          </h1>
          <p className="text-gray-500 text-sm mt-1">{t("subtitle")}</p>
        </header>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
          {DESTINATIONS.map((dest) => (
            <Link
              key={dest.name}
              href={`/listings?q=${encodeURIComponent(dest.name)}`}
              className="group"
            >
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
                  <div className="text-white text-base sm:text-lg font-bold">{dest.name}</div>
                  <div className="text-gray-300 text-xs">
                    {dest.stays} stays · {dest.country}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
