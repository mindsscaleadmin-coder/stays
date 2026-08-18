"use client";

import { useState, useRef, useEffect } from "react";
import { Link } from "@/i18n/routing";
import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";

/** Link columns for all mega-menu items (same layout as Properties). */
export const MEGA_DATA: Record<
  string,
  Record<string, { label: string;}[]>
> = {
  Stays: {
    "Farm Stay": [
      { label: "Farm House", to: "/listings?parent=Stays&q=farm" },
      { label: "Cottage", to: "/listings?parent=Stays&q=cottage" },
      { label: "Luxury Farm", to: "/listings?parent=Stays&q=luxury" },
      { label: "Glamping", to: "/listings?parent=Stays&q=glamping" },
      { label: "Desert Farm", to: "/listings?parent=Stays&q=desert" },
      { label: "Mountain Farm", to: "/listings?parent=Stays&q=mountain" },
    ],
    "Home Stay": [
      { label: "Heritage Home Stay", to: "/listings?parent=Stays&q=heritage" },
      { label: "Village Home Stay", to: "/listings?parent=Stays&q=village" },
      { label: "Beachside Home Stay", to: "/listings?parent=Stays&q=beach" },
    ],
    "Quick Links": [
      { label: "All Stays", to: "/listings?parent=Stays" },
      { label: "Trending", to: "/listings?filter=trending" },
      { label: "Best Rated", to: "/listings?filter=top" },
    ],
  },
  Destinations: {
    UAE: [
      { label: "Al Ain", to: "/listings?q=Al+Ain" },
      { label: "Dubai", to: "/listings?q=Dubai" },
      { label: "Abu Dhabi", to: "/listings?q=Abu+Dhabi" },
      { label: "Fujairah", to: "/listings?q=Fujairah" },
      { label: "Ras Al Khaimah", to: "/listings?q=Ras+Al+Khaimah" },
      { label: "Hatta", to: "/listings?q=Hatta" },
    ],
  },
  Venues: {
    "Event Venues": [
      { label: "Wedding Venues", to: "/listings?parent=Venues&q=wedding" },
      { label: "Party Lawns", to: "/listings?parent=Venues&q=party" },
      { label: "Corporate Retreats", to: "/listings?parent=Venues&q=corporate" },
      { label: "Private Events", to: "/listings?parent=Venues&q=private" },
    ],
    Outdoor: [
      { label: "Farmhouse Gatherings", to: "/listings?parent=Venues&q=farmhouse" },
      { label: "Outdoor Lawns", to: "/listings?parent=Venues&q=lawn" },
      { label: "Desert Venues", to: "/listings?parent=Venues&q=desert" },
      { label: "Banquet Halls", to: "/listings?parent=Venues&q=banquet" },
    ],
    "Quick Links": [
      { label: "All Venues", to: "/listings?parent=Venues" },
      { label: "Featured Venues", to: "/listings?parent=Venues&filter=trending" },
    ],
  },
  Experiences: {
    "Farm & Nature": [
      { label: "Farm Tour", to: "/listings?parent=Experiences&q=farm+tour" },
      { label: "Fruit Picking", to: "/listings?parent=Experiences&q=fruit" },
      { label: "Camel Riding", to: "/listings?parent=Experiences&q=camel" },
      { label: "BBQ Experience", to: "/listings?parent=Experiences&q=bbq" },
    ],
  },
};

const NAV_ORDER = ["Stays", "Destinations", "Venues", "Experiences"] as const;

export function MegaMenu() {
  const t = useTranslations("nav");
  const [active, setActive] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const navKeys: Record<string, string> = {
    Stays: t("properties"),
    Destinations: t("destinations"),
    Venues: t("venues"),
    Experiences: t("experiences"),
  };

  const open = (k: string) => {
    if (timer.current) clearTimeout(timer.current);
    setActive(k);
  };
  const close = () => {
    timer.current = setTimeout(() => setActive(null), 150);
  };

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  const linkMenu = active ? MEGA_DATA[active] : null;
  const groupCount = linkMenu ? Object.keys(linkMenu).length : 0;
  const viewAllHref =
    active === "Venues"
      ? "/listings?parent=Venues"
      : active === "Destinations"
        ? "/destinations"
        : active === "Experiences"
          ? "/listings?parent=Experiences"
          : "/listings?parent=Stays";
  const viewAllLabel = `View all ${navKeys[active ?? ""]?.toLowerCase() ?? ""} →`;

  const columnsClass =
    groupCount <= 1
      ? "grid-cols-1 max-w-xs"
      : groupCount === 2
        ? "grid-cols-2"
        : groupCount === 3
          ? "grid-cols-3"
          : "grid-cols-4";

  return (
    <div className="relative" onMouseLeave={close}>
      <nav className="hidden lg:flex items-center">
        {NAV_ORDER.map((key) => (
          <button
            key={key}
            type="button"
            onMouseEnter={() => open(key)}
            className={`flex items-center gap-0.5 px-2.5 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
              active === key
                ? "text-green-700 bg-green-50"
                : "text-gray-600 hover:text-green-700"
            }`}
          >
            {navKeys[key] ?? key}
            <ChevronDown
              className={`w-3 h-3 transition-transform ${active === key ? "rotate-180" : ""}`}
            />
          </button>
        ))}
      </nav>

      {active && linkMenu ? (
        <div
          onMouseEnter={() => open(active)}
          className="absolute top-full left-1/2 -translate-x-1/2 pt-1 z-[80]"
          style={{ width: "min(720px, 92vw)" }}
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
            <div className="flex">
              <div className="w-1.5 bg-green-700 shrink-0" />
              <div className="flex-1 p-5 sm:p-6">
                <div className="flex items-center justify-between gap-4 mb-4 pb-3 border-b border-gray-100">
                  <span className="font-bold text-gray-900 font-display text-sm">
                    {navKeys[active] ?? active}
                  </span>
                  <Link
                    href={viewAllHref}
                    onClick={() => setActive(null)}
                    className="text-xs text-green-600 font-semibold hover:underline shrink-0"
                  >
                    {viewAllLabel}
                  </Link>
                </div>

                <div className={`grid ${columnsClass} gap-x-10 gap-y-6 items-start`}>
                  {Object.entries(linkMenu).map(([group, items]) => (
                    <div key={group} className="min-w-0">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2.5 leading-none">
                        {group}
                      </p>
                      <ul className="space-y-1">
                        {items.map(({ label, to }) => (
                          <li key={label}>
                            <Link
                              href={to}
                              onClick={() => setActive(null)}
                              className="text-sm text-gray-600 hover:text-green-700 transition-colors block py-0.5 leading-snug"
                            >
                              {label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
