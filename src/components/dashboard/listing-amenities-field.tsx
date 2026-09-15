"use client";

import { Sparkles } from "lucide-react";
import { useListingTags } from "@/components/providers/listing-tags-provider";
import { cn } from "@/lib/utils";

export function ListingAmenitiesField({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const { amenityOptions } = useListingTags();

  function toggle(name: string) {
    onChange(
      selected.includes(name) ? selected.filter((item) => item !== name) : [...selected, name]
    );
  }

  return (
    <div className="space-y-3 border border-gray-100 rounded-xl p-4 bg-gray-50/60">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-green-700 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-gray-900">Amenities</p>
          <p className="text-xs text-gray-500">
            Select what guests can expect — shown on the listing page.
          </p>
        </div>
      </div>
      {amenityOptions.length === 0 ? (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
          No amenity options configured yet. An admin can add them under Settings.
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {amenityOptions.map((name) => (
            <label
              key={name}
              className={cn(
                "flex items-center gap-2 text-sm px-3 py-2 rounded-xl border cursor-pointer transition-colors",
                selected.includes(name)
                  ? "border-green-500 bg-green-50 text-green-900"
                  : "border-gray-200 bg-white text-gray-700 hover:border-green-200"
              )}
            >
              <input
                type="checkbox"
                checked={selected.includes(name)}
                onChange={() => toggle(name)}
                className="rounded border-gray-300 text-green-600 focus:ring-green-500"
              />
              {name}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
