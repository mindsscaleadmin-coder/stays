"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Minus, Plus, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { useAdminTaxonomy } from "@/components/providers/admin-taxonomy-provider";
import { useCountry } from "@/components/providers/country-provider";
import { filterActiveCountries } from "@/lib/admin/country-utils";
import {
  DateRangePicker,
  formatDateRangeLabel,
} from "@/components/search/date-range-picker";
import {
  searchDestinations,
  type DestinationHit,
} from "@/lib/search/destination-hits";
import { cn } from "@/lib/utils";

const MAX_GUESTS = 16;
const MAX_INFANTS = 5;

type OpenPanel = "where" | "when" | "who" | null;

function GuestStepper({
  label,
  hint,
  value,
  onMinus,
  onPlus,
  minusDisabled,
  plusDisabled,
}: {
  label: string;
  hint: string;
  value: number;
  onMinus: () => void;
  onPlus: () => void;
  minusDisabled: boolean;
  plusDisabled: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-semibold text-gray-900">{label}</p>
        <p className="text-xs text-gray-500">{hint}</p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <button
          type="button"
          onClick={onMinus}
          disabled={minusDisabled}
          className="w-8 h-8 rounded-full border border-gray-300 text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed hover:border-gray-500"
          aria-label={`Fewer ${label}`}
        >
          <Minus className="w-3.5 h-3.5 mx-auto" />
        </button>
        <span className="w-5 text-center text-sm font-semibold tabular-nums">{value}</span>
        <button
          type="button"
          onClick={onPlus}
          disabled={plusDisabled}
          className="w-8 h-8 rounded-full border border-gray-300 text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed hover:border-gray-500"
          aria-label={`More ${label}`}
        >
          <Plus className="w-3.5 h-3.5 mx-auto" />
        </button>
      </div>
    </div>
  );
}

function resolveCountryId(
  countries: { id: string; name: string; code?: string }[],
  header: { code: string; name: string }
): string {
  const code = header.code.toUpperCase();
  const byCode = countries.find((c) => (c.code ?? "").toUpperCase() === code);
  if (byCode) return byCode.id;
  const name = header.name.trim().toLowerCase();
  return countries.find((c) => c.name.toLowerCase() === name)?.id ?? countries[0]?.id ?? "";
}

export function HeroSearchBar({ resultsPath = "/listings" }: { resultsPath?: string }) {
  const t = useTranslations("home.search");
  const router = useRouter();
  const { data } = useAdminTaxonomy();
  const { country: headerCountry, setCountry: setHeaderCountry } = useCountry();
  const rootRef = useRef<HTMLDivElement>(null);
  const whereInputRef = useRef<HTMLInputElement>(null);

  const [openPanel, setOpenPanel] = useState<OpenPanel>(null);
  const [whereQuery, setWhereQuery] = useState("");
  const [stateId, setStateId] = useState("");
  const [districtId, setDistrictId] = useState("");
  const [cityId, setCityId] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [adults, setAdults] = useState(0);
  const [children, setChildren] = useState(0);
  const [infants, setInfants] = useState(0);
  const [minDate] = useState(() => new Date().toISOString().split("T")[0]);

  const countries = useMemo(() => filterActiveCountries(data.countries), [data.countries]);
  const countryId = resolveCountryId(countries, headerCountry);

  const selectedLabel = useMemo(() => {
    if (cityId) {
      const city = (data.cities ?? []).find((c) => c.id === cityId);
      if (city) return city.name;
    }
    if (districtId) {
      const district = data.districts.find((d) => d.id === districtId);
      if (district) return district.name;
    }
    if (stateId) {
      const state = data.states.find((s) => s.id === stateId);
      if (state) return state.name;
    }
    return "";
  }, [cityId, data.cities, data.districts, data.states, districtId, stateId]);

  const hits = useMemo(
    () =>
      searchDestinations(countryId, whereQuery, {
        states: data.states,
        districts: data.districts,
        cities: data.cities,
      }),
    [countryId, data.cities, data.districts, data.states, whereQuery]
  );

  const dateLabel = formatDateRangeLabel(checkIn, checkOut);
  const payingGuests = adults + children;
  const guestLabel = useMemo(() => {
    const parts: string[] = [];
    if (payingGuests > 0) {
      parts.push(
        payingGuests === 1 ? t("guestOne") : t("guestMany", { count: payingGuests })
      );
    }
    if (infants > 0) {
      parts.push(infants === 1 ? t("infantOne") : t("infantMany", { count: infants }));
    }
    return parts.join(", ");
  }, [infants, payingGuests, t]);

  useEffect(() => {
    if (openPanel !== "where") return;
    whereInputRef.current?.focus();
  }, [openPanel]);

  useEffect(() => {
    if (!openPanel) return;
    function onPointer(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpenPanel(null);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpenPanel(null);
    }
    window.addEventListener("mousedown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [openPanel]);

  function pickDestination(hit: DestinationHit) {
    setStateId(hit.stateId);
    setDistrictId(hit.districtId ?? "");
    setCityId(hit.cityId ?? "");
    setWhereQuery("");
    setOpenPanel("when");
  }

  function handleSearch() {
    const params = new URLSearchParams();
    const country = data.countries.find((c) => c.id === countryId);
    const state = data.states.find((s) => s.id === stateId)?.name;
    const district = data.districts.find((d) => d.id === districtId)?.name;
    const city = (data.cities ?? []).find((c) => c.id === cityId)?.name;

    if (country?.name) params.set("country", country.name);
    if (state) params.set("state", state);
    if (district) params.set("district", district);
    if (city) params.set("city", city);
    if (checkIn) params.set("checkIn", checkIn);
    if (checkOut) params.set("checkOut", checkOut);
    if (payingGuests > 0) params.set("guests", String(payingGuests));
    if (adults > 0) params.set("adults", String(adults));
    if (children > 0) params.set("children", String(children));
    if (infants > 0) params.set("infants", String(infants));

    if (country?.code) setHeaderCountry(country.code.toUpperCase());
    setOpenPanel(null);

    const qs = params.toString();
    router.push(qs ? `${resultsPath}?${qs}` : resultsPath);
  }

  const cellClass = (panel: OpenPanel) =>
    cn(
      "relative flex-1 min-w-0 text-start px-6 py-3.5 rounded-xl transition-colors",
      openPanel === panel ? "bg-white shadow-md" : "hover:bg-gray-100"
    );

  return (
    <div ref={rootRef} className="w-full">
      <div
        className={cn(
          "flex flex-col sm:flex-row sm:items-center shadow-2xl border border-black/5 rounded-2xl",
          openPanel ? "bg-gray-100" : "bg-white"
        )}
      >
        <div className={cellClass("where")}>
          <div
            role="button"
            tabIndex={0}
            className="w-full text-start"
            onClick={() => setOpenPanel("where")}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") setOpenPanel("where");
            }}
            aria-expanded={openPanel === "where"}
          >
            <span className="block text-xs font-bold text-gray-900">{t("where")}</span>
            {openPanel === "where" ? (
              <input
                ref={whereInputRef}
                value={whereQuery}
                onChange={(e) => {
                  setWhereQuery(e.target.value);
                  if (e.target.value) {
                    setStateId("");
                    setDistrictId("");
                    setCityId("");
                  }
                }}
                onClick={(e) => e.stopPropagation()}
                placeholder={t("wherePlaceholder")}
                className="mt-0.5 w-full bg-transparent text-sm text-gray-700 placeholder:text-gray-400 outline-none"
                aria-label={t("wherePlaceholder")}
                autoComplete="off"
              />
            ) : (
              <span
                className={cn(
                  "block text-sm truncate",
                  selectedLabel ? "text-gray-800 font-medium" : "text-gray-400"
                )}
              >
                {selectedLabel || t("wherePlaceholder")}
              </span>
            )}
          </div>

          {openPanel === "where" && (
            <div className="absolute start-0 top-[calc(100%+0.75rem)] z-50 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-gray-200 bg-white shadow-xl overflow-hidden">
              <ul className="max-h-72 overflow-y-auto py-2">
                {hits.length === 0 ? (
                  <li className="px-4 py-3 text-sm text-gray-500">{t("whereEmpty")}</li>
                ) : (
                  hits.map((hit) => (
                    <li key={hit.key}>
                      <button
                        type="button"
                        onClick={() => pickDestination(hit)}
                        className="w-full text-start px-4 py-2.5 hover:bg-gray-50"
                      >
                        <span className="block text-sm font-medium text-gray-900">{hit.name}</span>
                        <span className="block text-xs text-gray-500">{hit.subtitle}</span>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </div>
          )}
        </div>

        <div className="hidden sm:block w-px h-8 bg-gray-200 shrink-0" />

        <div className={cellClass("when")}>
          <button
            type="button"
            className="w-full text-start"
            onClick={() => setOpenPanel(openPanel === "when" ? null : "when")}
            aria-expanded={openPanel === "when"}
          >
            <span className="block text-xs font-bold text-gray-900">{t("when")}</span>
            <span
              className={cn(
                "block text-sm truncate",
                dateLabel ? "text-gray-800 font-medium" : "text-gray-400"
              )}
            >
              {dateLabel || t("whenPlaceholder")}
            </span>
          </button>
          <DateRangePicker
            chrome="none"
            open={openPanel === "when"}
            onOpenChange={(next) => setOpenPanel(next ? "when" : null)}
            checkIn={checkIn}
            checkOut={checkOut}
            minDate={minDate}
            onCheckInChange={setCheckIn}
            onCheckOutChange={setCheckOut}
          />
        </div>

        <div className="hidden sm:block w-px h-8 bg-gray-200 shrink-0" />

        <div className={cn(cellClass("who"), "sm:pe-2 flex items-center gap-2")}>
          <button
            type="button"
            className="flex-1 min-w-0 text-start"
            onClick={() => setOpenPanel(openPanel === "who" ? null : "who")}
            aria-expanded={openPanel === "who"}
          >
            <span className="block text-xs font-bold text-gray-900">{t("who")}</span>
            <span
              className={cn(
                "block text-sm truncate",
                guestLabel ? "text-gray-800 font-medium" : "text-gray-400"
              )}
            >
              {guestLabel || t("whoPlaceholder")}
            </span>
          </button>

          <button
            type="button"
            onClick={handleSearch}
            aria-label={t("button")}
            className="shrink-0 w-12 h-12 rounded-full bg-green-700 hover:bg-green-800 text-white flex items-center justify-center shadow-md"
          >
            <Search className="w-5 h-5" />
          </button>

          {openPanel === "who" && (
            <div className="absolute end-0 top-[calc(100%+0.75rem)] z-50 w-[min(20rem,calc(100vw-2rem))] rounded-2xl border border-gray-200 bg-white shadow-xl p-5 space-y-4">
              <GuestStepper
                label={t("adults")}
                hint={t("adultsHint")}
                value={adults}
                onMinus={() => setAdults((n) => Math.max(children > 0 || infants > 0 ? 1 : 0, n - 1))}
                onPlus={() => setAdults((n) => Math.min(MAX_GUESTS - children, n + 1))}
                minusDisabled={adults <= 0 || (adults <= 1 && (children > 0 || infants > 0))}
                plusDisabled={payingGuests >= MAX_GUESTS}
              />
              <GuestStepper
                label={t("children")}
                hint={t("childrenHint")}
                value={children}
                onMinus={() => setChildren((n) => Math.max(0, n - 1))}
                onPlus={() => {
                  setChildren((n) => Math.min(MAX_GUESTS - adults, n + 1));
                  if (adults === 0) setAdults(1);
                }}
                minusDisabled={children <= 0}
                plusDisabled={payingGuests >= MAX_GUESTS}
              />
              <GuestStepper
                label={t("infants")}
                hint={t("infantsHint")}
                value={infants}
                onMinus={() => setInfants((n) => Math.max(0, n - 1))}
                onPlus={() => {
                  setInfants((n) => Math.min(MAX_INFANTS, n + 1));
                  if (adults === 0) setAdults(1);
                }}
                minusDisabled={infants <= 0}
                plusDisabled={infants >= MAX_INFANTS}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
