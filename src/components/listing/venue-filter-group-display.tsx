"use client";

import {
  Building2,
  CalendarHeart,
  Car,
  CloudSun,
  Shield,
  Sun,
  UtensilsCrossed,
} from "lucide-react";
import { amenityIcon } from "@/lib/listings/amenity-icon";

export type VenueFilterGroupDisplay = {
  id?: string;
  label: string;
  items: string[];
};

function groupVariant(group: VenueFilterGroupDisplay) {
  const key = `${group.id ?? ""} ${group.label}`.trim().toLowerCase();
  if (key.includes("suitable")) return "suitableFor";
  if (key.includes("venue amenities") || group.id === "venueAmenities") return "venueAmenities";
  if (key.includes("indoor") || group.id === "indoorOutdoor") return "indoorOutdoor";
  if (key.includes("facility")) return "venueFacility";
  if (key.includes("parking")) return "venueParking";
  if (key.includes("catering")) return "venueCatering";
  if (key.includes("rule")) return "venueRule";
  return "default";
}

function SuitableForItems({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span
          key={item}
          className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-900 ring-1 ring-inset ring-violet-200/80"
        >
          <CalendarHeart className="h-3.5 w-3.5 shrink-0" />
          {item}
        </span>
      ))}
    </div>
  );
}

function VenueAmenityItems({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => {
        const Icon = amenityIcon(item);
        return (
          <span
            key={item}
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50/70 px-3 py-1.5 text-xs font-semibold text-emerald-900"
          >
            <Icon className="h-3.5 w-3.5 shrink-0 text-emerald-700" />
            {item}
          </span>
        );
      })}
    </div>
  );
}

function IndoorOutdoorItems({ items }: { items: string[] }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {items.map((item) => {
        const lower = item.toLowerCase();
        const Icon =
          lower.includes("outdoor") && !lower.includes("indoor")
            ? Sun
            : lower.includes("indoor") && !lower.includes("outdoor")
              ? Building2
              : CloudSun;
        return (
          <div
            key={item}
            className="flex items-center justify-center gap-2 rounded-xl border-2 border-green-200/80 bg-gradient-to-br from-green-50 to-white px-4 py-3 text-sm font-bold text-green-900"
          >
            <Icon className="h-4 w-4 shrink-0 text-green-700" />
            {item}
          </div>
        );
      })}
    </div>
  );
}

function FacilityItems({ items }: { items: string[] }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {items.map((item) => {
        const Icon = amenityIcon(item);
        return (
          <div
            key={item}
            className="flex items-center gap-2 rounded-lg border border-gray-100 bg-gray-50/80 px-3 py-2.5 text-xs font-medium text-gray-800"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white ring-1 ring-gray-100">
              <Icon className="h-3.5 w-3.5 text-green-700" />
            </span>
            <span className="min-w-0 leading-snug">{item}</span>
          </div>
        );
      })}
    </div>
  );
}

function ParkingItems({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span
          key={item}
          className="inline-flex items-center gap-1.5 rounded-lg bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-900 ring-1 ring-inset ring-sky-200/80"
        >
          <Car className="h-3.5 w-3.5 shrink-0 text-sky-700" />
          {item}
        </span>
      ))}
    </div>
  );
}

function CateringItems({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span
          key={item}
          className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-950 ring-1 ring-inset ring-amber-200/80"
        >
          <UtensilsCrossed className="h-3.5 w-3.5 shrink-0 text-amber-800" />
          {item}
        </span>
      ))}
    </div>
  );
}

function RulesItems({ items }: { items: string[] }) {
  return (
    <ul className="overflow-hidden rounded-xl border border-rose-100 bg-rose-50/30">
      {items.map((item, index) => (
        <li
          key={item}
          className={`flex items-start gap-2.5 px-3.5 py-2.5 text-sm text-gray-700 ${
            index > 0 ? "border-t border-rose-100/80" : ""
          }`}
        >
          <Shield className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
          <span className="font-medium">{item}</span>
        </li>
      ))}
    </ul>
  );
}

function DefaultItems({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => {
        const Icon = amenityIcon(item);
        return (
          <span
            key={item}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700"
          >
            <Icon className="h-3.5 w-3.5 shrink-0 text-green-700" />
            {item}
          </span>
        );
      })}
    </div>
  );
}

export function VenueFilterGroupItems({ group }: { group: VenueFilterGroupDisplay }) {
  const variant = groupVariant(group);

  if (variant === "suitableFor") return <SuitableForItems items={group.items} />;
  if (variant === "venueAmenities") return <VenueAmenityItems items={group.items} />;
  if (variant === "indoorOutdoor") return <IndoorOutdoorItems items={group.items} />;
  if (variant === "venueFacility") return <FacilityItems items={group.items} />;
  if (variant === "venueParking") return <ParkingItems items={group.items} />;
  if (variant === "venueCatering") return <CateringItems items={group.items} />;
  if (variant === "venueRule") return <RulesItems items={group.items} />;
  return <DefaultItems items={group.items} />;
}

export function VenueFilterGroupBlock({ group }: { group: VenueFilterGroupDisplay }) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-600">{group.label}</p>
      <div className="mt-2">
        <VenueFilterGroupItems group={group} />
      </div>
    </div>
  );
}
