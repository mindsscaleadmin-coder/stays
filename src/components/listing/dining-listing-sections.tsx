"use client";

import Image from "next/image";
import { Link } from "@/i18n/routing";
import {
  Building2,
  Calendar,
  Clock,
  DollarSign,
  Download,
  ExternalLink,
  MapPin,
  Users,
  UtensilsCrossed,
} from "lucide-react";
import type { HostPublicProfile } from "@/lib/host/host-profile-types";
import type { Stay } from "@/lib/mock/data";
import type { DiningFilterGroups } from "@/lib/listings/dining-filter-display";
import {
  formatAveragePriceRange,
  formatDayHoursSummary,
  formatPriceLevel,
  getDayPeriods,
  hasDiningMenu,
  isMealPeriodActive,
  MEAL_PERIODS,
  resolveTodayHours,
  WEEKDAYS,
  type DiningDetails,
} from "@/lib/listings/dining-details-types";

export function DiningQuickInfoBar({
  filterGroups,
  diningDetails,
  venueDetails,
  money,
}: {
  filterGroups: DiningFilterGroups;
  diningDetails?: DiningDetails;
  venueDetails?: { seatedCapacity?: number; minimumBookingDuration?: string };
  money: (amount: number) => string;
}) {
  const cuisine =
    diningDetails?.primaryCuisine ||
    filterGroups.diningCuisine?.slice(0, 2).join(", ");
  const priceLevel = formatPriceLevel(diningDetails?.priceLevel);
  const averagePrice = formatAveragePriceRange(diningDetails, money);
  const duration = venueDetails?.minimumBookingDuration?.trim();
  const seating = [
    ...(diningDetails?.seatingOptions ?? []).slice(0, 2),
    ...(filterGroups.diningSetting ?? []).slice(0, 2),
  ]
    .filter((item, index, list) => list.indexOf(item) === index)
    .join(" · ");
  const service = filterGroups.diningMeal?.slice(0, 2).join(" & ");

  const items = [
    cuisine ? { icon: UtensilsCrossed, label: "Cuisine", value: cuisine } : null,
    priceLevel ? { icon: DollarSign, label: "Price", value: priceLevel } : null,
    averagePrice ? { icon: DollarSign, label: "Average", value: averagePrice } : null,
    venueDetails?.seatedCapacity
      ? {
          icon: Users,
          label: "Capacity",
          value: `${venueDetails.seatedCapacity} guests`,
        }
      : null,
    service ? { icon: Clock, label: "Service", value: service } : null,
    duration ? { icon: Clock, label: "Service window", value: duration } : null,
    {
      icon: Calendar,
      label: "Reservation",
      value: diningDetails?.reservationRequired ? "Required" : "Through our platform",
    },
    seating ? { icon: MapPin, label: "Seating", value: seating } : null,
  ].filter((item): item is { icon: typeof UtensilsCrossed; label: string; value: string } =>
    Boolean(item)
  );

  if (items.length === 0) return null;

  return (
    <div className="mt-4 rounded-2xl border border-gray-200/80 bg-white px-4 py-4 shadow-sm shadow-gray-100/70 sm:px-6">
      <div className="flex gap-3 overflow-x-auto sm:overflow-visible">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex min-w-[8.5rem] flex-1 shrink-0 items-start gap-3 rounded-xl bg-gray-50 px-3 py-2.5 sm:min-w-0"
          >
            <item.icon className="mt-0.5 h-4 w-4 shrink-0 text-green-800" />
            <div className="min-w-0">
              <p className="text-3xs font-bold uppercase tracking-wide text-gray-500">{item.label}</p>
              <p className="text-sm font-semibold text-gray-900">{item.value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DiningCuisineSection({
  filterGroups,
  diningDetails,
}: {
  filterGroups: DiningFilterGroups;
  diningDetails?: DiningDetails;
}) {
  const cuisines = [
    ...(diningDetails?.primaryCuisine ? [diningDetails.primaryCuisine] : []),
    ...(filterGroups.diningCuisine ?? []).filter(
      (item) => item !== diningDetails?.primaryCuisine
    ),
  ];
  const dietary = filterGroups.diningDietary ?? [];
  const meals = filterGroups.diningMeal ?? [];
  const foodStyles = [
    ...(diningDetails?.foodStyles ?? []),
    ...(filterGroups.diningFoodStyle ?? []),
  ].filter((item, index, list) => list.indexOf(item) === index);

  if (cuisines.length === 0 && dietary.length === 0 && meals.length === 0 && foodStyles.length === 0) {
    return null;
  }

  return (
    <section id="event-cuisine" className="mt-8 scroll-mt-28">
      <h2 className="mb-3 font-display text-heading-sm font-extrabold text-gray-950">Cuisine</h2>
      {cuisines.length > 0 ? (
        <div className="mb-4">
          <p className="mb-2 text-sm font-semibold text-gray-800">Cuisine types</p>
          <div className="flex flex-wrap gap-2">
            {cuisines.map((item) => (
              <span
                key={item}
                className="rounded-full bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-900 ring-1 ring-inset ring-green-200/70"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      ) : null}
      {diningDetails?.signatureCuisine ? (
        <div className="mb-4">
          <p className="mb-2 text-sm font-semibold text-gray-800">Signature cuisine</p>
          <p className="text-sm text-gray-700">{diningDetails.signatureCuisine}</p>
        </div>
      ) : null}
      {foodStyles.length > 0 ? (
        <div className="mb-4">
          <p className="mb-2 text-sm font-semibold text-gray-800">Food style</p>
          <div className="flex flex-wrap gap-2">
            {foodStyles.map((item) => (
              <span
                key={item}
                className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700 ring-1 ring-inset ring-gray-200/80"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      ) : null}
      {meals.length > 0 ? (
        <div className="mb-4">
          <p className="mb-2 text-sm font-semibold text-gray-800">Meal service</p>
          <div className="flex flex-wrap gap-2">
            {meals.map((item) => (
              <span
                key={item}
                className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700 ring-1 ring-inset ring-gray-200/80"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      ) : null}
      {dietary.length > 0 ? (
        <div>
          <p className="mb-2 text-sm font-semibold text-gray-800">Dietary options</p>
          <div className="flex flex-wrap gap-2">
            {dietary.map((item) => (
              <span
                key={item}
                className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-900 ring-1 ring-inset ring-amber-200/80"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

export function DiningOpeningHoursSection({ diningDetails }: { diningDetails?: DiningDetails }) {
  const hours = diningDetails?.openingHours ?? [];
  if (hours.length === 0) return null;

  const today = resolveTodayHours(diningDetails);
  const todayLabel = WEEKDAYS.find((day) => day.key === today?.day)?.label ?? "Today";

  return (
    <section id="event-hours" className="mt-8 scroll-mt-28">
      <h2 className="mb-3 font-display text-heading-sm font-extrabold text-gray-950">
        Opening hours
      </h2>
      {today ? (
        <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3">
          <p className="text-xs font-bold uppercase tracking-wide text-green-800">Today</p>
          <p className="mt-1 text-sm font-semibold text-gray-900">{formatDayHoursSummary(today)}</p>
          <p className="text-xs text-gray-500">{todayLabel}</p>
        </div>
      ) : null}
      <div className="overflow-hidden rounded-xl border border-gray-200">
        <table className="w-full text-sm">
          <tbody>
            {WEEKDAYS.map((day) => {
              const row = hours.find((item) => item.day === day.key);
              if (!row) return null;
              const periods = getDayPeriods(row).filter(isMealPeriodActive);
              return (
                <tr key={day.key} className="border-t border-gray-100 first:border-t-0 align-top">
                  <td className="px-4 py-2.5 font-medium text-gray-800 whitespace-nowrap">
                    {day.label}
                  </td>
                  <td className="px-4 py-2.5 text-gray-600">
                    {row.closed ? (
                      "Closed"
                    ) : periods.length > 0 ? (
                      <div className="space-y-1">
                        {periods.map((period) => {
                          const label =
                            MEAL_PERIODS.find((item) => item.key === period.meal)?.label ??
                            period.meal;
                          const times = [period.open, period.close].filter(Boolean).join(" – ");
                          return (
                            <p key={period.meal}>
                              <span className="font-medium text-gray-800">{label}</span>
                              <span className="text-gray-500"> · {times || "Hours on request"}</span>
                            </p>
                          );
                        })}
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function DiningMenuSection({
  diningDetails,
  money,
}: {
  diningDetails?: DiningDetails;
  money: (amount: number) => string;
}) {
  if (!hasDiningMenu(diningDetails)) return null;

  const menuUrl = diningDetails?.menuUrl?.trim();
  const sections = diningDetails?.menuSections ?? [];
  const featuredDishes = diningDetails?.featuredDishes ?? [];

  return (
    <section id="event-menu" className="mt-8 scroll-mt-28">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-heading-sm font-extrabold text-gray-950">Menu</h2>
          <p className="mt-1 text-sm text-gray-500">Browse dishes and indicative prices.</p>
        </div>
        {menuUrl ? (
          <div className="flex flex-wrap gap-2">
            <a
              href={menuUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:border-gray-300"
            >
              <ExternalLink className="h-4 w-4" />
              View menu
            </a>
            <a
              href={menuUrl}
              download
              className="inline-flex items-center gap-1.5 rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-sm font-semibold text-green-900 hover:border-green-300"
            >
              <Download className="h-4 w-4" />
              Download
            </a>
          </div>
        ) : null}
      </div>

      {featuredDishes.length > 0 ? (
        <div className="mb-5 space-y-3">
          <h3 className="font-display text-base font-bold text-gray-950">Featured dishes</h3>
          {featuredDishes.map((item) => (
            <div
              key={item.name}
              className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900">{item.name}</p>
                    {item.isSignature ? (
                      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-2xs font-bold uppercase tracking-wide text-amber-900 ring-1 ring-inset ring-amber-200/80">
                        Signature
                      </span>
                    ) : null}
                  </div>
                  {item.description ? (
                    <p className="mt-0.5 text-xs leading-5 text-gray-500">{item.description}</p>
                  ) : null}
                  {(item.dietaryTags ?? []).length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {(item.dietaryTags ?? []).map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-gray-100 px-2 py-0.5 text-2xs font-semibold text-gray-600"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
                {item.price != null && item.price > 0 ? (
                  <p className="shrink-0 text-sm font-bold text-gray-900 tabular-nums">
                    {money(item.price)}
                  </p>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {sections.length > 0 ? (
        <div className="space-y-5">
          {sections.map((section) => (
            <div key={section.name} className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
              <h3 className="font-display text-base font-bold text-gray-950">{section.name}</h3>
              <div className="mt-3 divide-y divide-gray-100">
                {section.items.map((item) => (
                  <div
                    key={`${section.name}-${item.name}`}
                    className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{item.name}</p>
                      {item.description ? (
                        <p className="mt-0.5 text-xs leading-5 text-gray-500">{item.description}</p>
                      ) : null}
                    </div>
                    {item.price != null && item.price > 0 ? (
                      <p className="shrink-0 text-sm font-bold text-gray-900 tabular-nums">
                        {money(item.price)}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : menuUrl ? (
        <p className="text-sm text-gray-500">Full menu available via the link above.</p>
      ) : null}
    </section>
  );
}

export function DiningExperienceSection({
  filterGroups,
  subcategory,
  suitableFor,
}: {
  filterGroups: DiningFilterGroups;
  subcategory?: string;
  suitableFor?: string[];
}) {
  const atmosphere = [
    ...(subcategory ? [subcategory] : []),
    ...(filterGroups.diningAtmosphere ?? []),
  ].filter((item, index, list) => list.indexOf(item) === index);
  const audience = suitableFor ?? [];

  if (atmosphere.length === 0 && audience.length === 0) return null;

  return (
    <section id="event-experience" className="mt-8 scroll-mt-28">
      <h2 className="mb-3 font-display text-heading-sm font-extrabold text-gray-950">
        Dining experience
      </h2>
      {atmosphere.length > 0 ? (
        <div className="mb-4">
          <p className="mb-2 text-sm font-semibold text-gray-800">Atmosphere</p>
          <div className="flex flex-wrap gap-2">
            {atmosphere.map((item) => (
              <span
                key={item}
                className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700 ring-1 ring-inset ring-gray-200/80"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      ) : null}
      {audience.length > 0 ? (
        <div>
          <p className="mb-2 text-sm font-semibold text-gray-800">Perfect for</p>
          <div className="flex flex-wrap gap-2">
            {audience.map((item) => (
              <span
                key={item}
                className="rounded-full bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-900 ring-1 ring-inset ring-green-200/70"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

export function DiningPricingSection({
  diningDetails,
  money,
}: {
  diningDetails?: DiningDetails;
  money: (amount: number) => string;
}) {
  const averagePrice = formatAveragePriceRange(diningDetails, money);
  const priceLevel = formatPriceLevel(diningDetails?.priceLevel);
  const depositAmount =
    diningDetails?.depositRequired && diningDetails.depositAmount
      ? money(diningDetails.depositAmount)
      : "";
  const minimumSpend =
    diningDetails?.minimumSpend && diningDetails.minimumSpend > 0
      ? `${money(diningDetails.minimumSpend)} ${
          diningDetails.minimumSpendUnit === "per_table" ? "per table" : "per person"
        }`
      : "";

  if (!averagePrice && !priceLevel && !depositAmount && !minimumSpend) return null;

  return (
    <section className="mt-8">
      <h2 className="mb-3 font-display text-heading-sm font-extrabold text-gray-950">Pricing</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {priceLevel ? (
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Price level</p>
            <p className="mt-1 text-lg font-bold text-gray-950 tabular-nums">{priceLevel}</p>
          </div>
        ) : null}
        {averagePrice ? (
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Average spend</p>
            <p className="mt-1 text-sm font-semibold text-gray-900">{averagePrice}</p>
          </div>
        ) : null}
        {minimumSpend ? (
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Minimum spend</p>
            <p className="mt-1 text-sm font-semibold text-gray-900">{minimumSpend}</p>
          </div>
        ) : null}
        {depositAmount ? (
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Deposit</p>
            <p className="mt-1 text-sm font-semibold text-gray-900">{depositAmount}</p>
            {diningDetails?.depositConditions ? (
              <p className="mt-1 text-xs text-gray-500">{diningDetails.depositConditions}</p>
            ) : null}
          </div>
        ) : null}
      </div>
      <p className="mt-3 text-xs text-gray-500">
        Prices are indicative only. Reservations are free on our platform — guests pay the venue directly.
      </p>
    </section>
  );
}

export function DiningLocationNotes({ diningDetails }: { diningDetails?: DiningDetails }) {
  const gettingHere = diningDetails?.gettingHere?.trim();
  const locationNotes = diningDetails?.locationNotes?.trim();
  const landmark = diningDetails?.landmark?.trim();
  const parkingOption = diningDetails?.parkingOption?.trim();

  if (!gettingHere && !locationNotes && !landmark && !parkingOption) return null;

  return (
    <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 p-4 space-y-3">
      <h3 className="text-sm font-bold text-gray-900">Getting here</h3>
      {landmark ? <p className="text-sm text-gray-700"><span className="font-semibold">Landmark:</span> {landmark}</p> : null}
      {parkingOption ? <p className="text-sm text-gray-700"><span className="font-semibold">Parking:</span> {parkingOption}</p> : null}
      {gettingHere ? <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">{gettingHere}</p> : null}
      {locationNotes ? <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">{locationNotes}</p> : null}
    </div>
  );
}

export function getDiningStructuredPolicies(
  diningDetails?: DiningDetails
): { title: string; desc: string }[] {
  return [
    diningDetails?.reservationRequired != null
      ? {
          title: "Reservation",
          desc: diningDetails.reservationRequired
            ? "Reservation required"
            : "Walk-ins accepted",
        }
      : null,
    diningDetails?.reservationPolicy
      ? { title: "Reservation policy", desc: diningDetails.reservationPolicy }
      : null,
    diningDetails?.cancellationPolicyType
      ? { title: "Cancellation", desc: diningDetails.cancellationPolicyType }
      : null,
    diningDetails?.cancellationPolicy
      ? { title: "Cancellation details", desc: diningDetails.cancellationPolicy }
      : null,
    diningDetails?.dressCodeType
      ? { title: "Dress code", desc: diningDetails.dressCodeType }
      : null,
    diningDetails?.dressCode ? { title: "Dress code details", desc: diningDetails.dressCode } : null,
    diningDetails?.childrenPolicyType
      ? { title: "Children", desc: diningDetails.childrenPolicyType }
      : null,
    diningDetails?.noShowPolicy ? { title: "No-show policy", desc: diningDetails.noShowPolicy } : null,
    diningDetails?.childrenPolicy
      ? { title: "Children policy", desc: diningDetails.childrenPolicy }
      : null,
    diningDetails?.petPolicy ? { title: "Pet policy", desc: diningDetails.petPolicy } : null,
    diningDetails?.lateArrivalPolicy
      ? { title: "Late arrival", desc: diningDetails.lateArrivalPolicy }
      : null,
    diningDetails?.smokingPolicy
      ? { title: "Smoking policy", desc: diningDetails.smokingPolicy }
      : null,
    diningDetails?.outsideFoodPolicy
      ? { title: "Outside food", desc: diningDetails.outsideFoodPolicy }
      : null,
    diningDetails?.tableTimeLimit
      ? { title: "Table time limit", desc: diningDetails.tableTimeLimit }
      : null,
    diningDetails?.groupPolicy ? { title: "Group policy", desc: diningDetails.groupPolicy } : null,
    diningDetails?.specialOccasionPolicy
      ? { title: "Special occasions", desc: diningDetails.specialOccasionPolicy }
      : null,
  ].filter((item): item is { title: string; desc: string } => Boolean(item));
}

export function DiningStructuredPolicies({
  diningDetails,
}: {
  diningDetails?: DiningDetails;
}) {
  const policies = getDiningStructuredPolicies(diningDetails);

  if (policies.length === 0) return null;

  return (
    <div className="mb-4 grid gap-3 sm:grid-cols-2">
      {policies.map((policy) => (
        <div key={policy.title} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
          <h3 className="font-display text-sm font-bold text-gray-900">{policy.title}</h3>
          <p className="mt-1 text-xs leading-5 text-gray-500 whitespace-pre-wrap">{policy.desc}</p>
        </div>
      ))}
    </div>
  );
}

export function DiningPlatformReservationSection({
  onRequestReservation,
}: {
  onRequestReservation?: () => void;
}) {
  return (
    <section id="event-contact" className="mt-8 scroll-mt-28">
      <h2 className="mb-3 font-display text-heading-sm font-extrabold text-gray-950">
        How to reserve
      </h2>
      <div className="rounded-2xl border border-green-200 bg-green-50/60 p-5">
        <ol className="space-y-3 text-sm text-gray-700">
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-800 text-xs font-bold text-white">
              1
            </span>
            <span>Check availability and send a free reservation request through our platform.</span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-800 text-xs font-bold text-white">
              2
            </span>
            <span>The restaurant confirms your table is available.</span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-800 text-xs font-bold text-white">
              3
            </span>
            <span>Contact details are shared so you can finalise your booking directly.</span>
          </li>
        </ol>
        {onRequestReservation ? (
          <button
            type="button"
            onClick={onRequestReservation}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-green-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-900"
          >
            <Calendar className="h-4 w-4" />
            Check availability
          </button>
        ) : null}
      </div>
    </section>
  );
}

export function DiningHostSection({
  profile,
  hostLabel,
}: {
  profile: HostPublicProfile | null;
  hostLabel: string;
}) {
  const displayName = profile?.displayName?.trim() || hostLabel;
  const companyName = profile?.companyName?.trim();
  const bio = profile?.bio?.trim();

  return (
    <section id="event-host" className="mt-8 scroll-mt-28">
      <h2 className="mb-3 font-display text-heading-sm font-extrabold text-gray-950">
        Hosted by
      </h2>
      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-800">
            <Building2 className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="font-display text-base font-bold text-gray-950">{displayName}</p>
            {companyName && companyName !== displayName ? (
              <p className="text-sm text-gray-600">{companyName}</p>
            ) : null}
            <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-green-800">
              <span className="rounded-full bg-green-50 px-2 py-0.5 ring-1 ring-inset ring-green-200/70">
                Verified listing
              </span>
            </p>
            {bio ? <p className="mt-3 text-sm leading-relaxed text-gray-600">{bio}</p> : null}
            <p className="mt-2 text-xs text-gray-500">Responds through our platform</p>
          </div>
        </div>
      </div>
    </section>
  );
}

export function DiningSameHostSection({
  listings,
  currentId,
}: {
  listings: Pick<Stay, "id" | "name" | "category" | "subcategory" | "img">[];
  currentId: string;
}) {
  const related = listings.filter((item) => item.id !== currentId).slice(0, 6);
  if (related.length === 0) return null;

  return (
    <section className="mt-8 scroll-mt-28">
      <h2 className="mb-3 font-display text-heading-sm font-extrabold text-gray-950">
        More dining at this host
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {related.map((item) => (
          <Link
            key={item.id}
            href={`/listing/${item.id}`}
            className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 hover:border-green-200 hover:shadow-sm transition-all"
          >
            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-gray-100">
              {item.img ? (
                <Image
                  src={item.img}
                  alt=""
                  width={56}
                  height={56}
                  unoptimized
                  className="h-full w-full object-cover"
                />
              ) : null}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-gray-900">{item.name}</p>
              <p className="truncate text-xs text-gray-500">
                {item.subcategory || item.category || "Dining"}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
