"use client";

import {
  AlertCircle,
  BellRing,
  CheckCircle2,
  Compass,
  Flame,
  HeartPulse,
  ShieldCheck,
  Tractor,
  Waves,
} from "lucide-react";
import type { ListingSafetyItem } from "@/lib/listings/submission-types";
import { cn } from "@/lib/utils";

export const DEFAULT_SAFETY_CHECKLIST: ListingSafetyItem[] = [
  {
    id: "safe-fire",
    question: "Are fire extinguishers inspected, charged, and accessible on the property?",
    reminder: "Mount extinguishers in high-risk zones (kitchen, near fireplaces, BBQ areas, cottages). Verify pressure gauges and annual inspection dates.",
    checked: false,
    label: "Fire extinguishers accessible",
    description: "Extinguishers in kitchen, main building, and cottages.",
  },
  {
    id: "safe-aid",
    question: "Is a fully stocked first aid kit readily accessible to guests and staff?",
    reminder: "Ensure kit has unexpired antiseptic, sterile bandages, burn gel, allergy medication, and emergency contact numbers for the nearest doctor or hospital.",
    checked: false,
    label: "First aid kit on site",
    description: "Stocked kit with expiry dates checked monthly.",
  },
  {
    id: "safe-exits",
    question: "Are emergency exits, evacuation routes, and backup torches clearly marked?",
    reminder: "Keep all escape pathways and doors completely unobstructed. Provide illuminated signage and backup emergency torches for power outages.",
    checked: false,
    label: "Emergency exits marked",
    description: "Clear signage, illuminated paths, and emergency lighting.",
  },
  {
    id: "safe-pool",
    question: "Are swimming pools, open ponds, or water bodies secured with safety rules?",
    reminder: "Post depth markers and 'No Diving' rules. Have accessible lifebuoys/flotation rings and secure perimeter fencing for child safety.",
    checked: false,
    label: "Pool & water safety rules posted",
    description: "Depth markers, no-diving signs, and flotation equipment available.",
  },
  {
    id: "safe-farm-hazards",
    question: "Are agricultural machinery, chemical stores, and animal enclosures safely secured?",
    reminder: "Store fuels, fertilizers, and sharp farm equipment in locked sheds. Ensure clear fencing separates guest leisure zones from working farm operations.",
    checked: false,
    label: "Farm machinery & hazards demarcated",
    description: "Agricultural equipment and chemicals locked away from guest zones.",
  },
  {
    id: "safe-detectors",
    question: "Are smoke and carbon monoxide detectors installed and tested in indoor spaces?",
    reminder: "Install alarms in enclosed guest bedrooms and living quarters with gas or wood heating. Test battery levels periodically.",
    checked: false,
    label: "Smoke & carbon monoxide detectors installed",
    description: "Functional alarms in enclosed sleeping and living areas.",
  },
];

/**
 * Ensures all standard safety questions exist even if an older draft
 * only has a subset of items or partial data.
 */
export function hydrateListingSafetyChecklist(
  stored?: ListingSafetyItem[]
): ListingSafetyItem[] {
  if (!stored || stored.length === 0) {
    return DEFAULT_SAFETY_CHECKLIST.map((item) => ({ ...item }));
  }

  const storedMap = new Map<string, ListingSafetyItem>();
  for (const item of stored) {
    storedMap.set(item.id, item);
  }

  // Preserve defaults with updated answers
  const merged: ListingSafetyItem[] = DEFAULT_SAFETY_CHECKLIST.map((def) => {
    const found = storedMap.get(def.id);
    if (!found) return { ...def };
    return {
      ...def,
      checked: Boolean(found.checked),
      // allow custom overridden wording if present
      question: found.question || def.question,
      reminder: found.reminder || def.reminder,
      label: found.label || def.label,
      description: found.description || def.description,
    };
  });

  // Also retain any custom items created outside the defaults
  for (const item of stored) {
    if (!DEFAULT_SAFETY_CHECKLIST.some((d) => d.id === item.id)) {
      merged.push({ ...item });
    }
  }

  return merged;
}

const SAFETY_ICONS: Record<string, typeof Flame> = {
  "safe-fire": Flame,
  "safe-aid": HeartPulse,
  "safe-exits": Compass,
  "safe-pool": Waves,
  "safe-farm-hazards": Tractor,
  "safe-detectors": BellRing,
};

interface ListingSafetySectionProps {
  items: ListingSafetyItem[];
  onChange: (next: ListingSafetyItem[]) => void;
}

export function ListingSafetySection({ items, onChange }: ListingSafetySectionProps) {
  const toggleItem = (id: string) => {
    onChange(
      items.map((item) =>
        item.id === id ? { ...item, checked: !item.checked } : item
      )
    );
  };

  const markAll = (checked: boolean) => {
    onChange(items.map((item) => ({ ...item, checked })));
  };

  const completedCount = items.filter((i) => i.checked).length;
  const allCompleted = completedCount === items.length && items.length > 0;
  const progressPct = items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-green-100 text-green-700">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-display text-base font-bold text-gray-900">
              Property Safety & Compliance
            </h3>
          </div>
          <p className="text-xs text-gray-500 mt-1 max-w-xl">
            Answer the safety questions below for this specific property. Review the reminders, and when a safety measure is ready and verified on-site, tick the column to confirm it.
          </p>
        </div>

        <div className="flex items-center gap-2.5 sm:self-center shrink-0">
          <div className="text-right">
            <span
              className={cn(
                "inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border",
                allCompleted
                  ? "bg-green-50 text-green-700 border-green-200"
                  : completedCount > 0
                  ? "bg-blue-50 text-blue-700 border-blue-200"
                  : "bg-gray-100 text-gray-600 border-gray-200"
              )}
            >
              {allCompleted ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
              ) : null}
              {completedCount} of {items.length} verified
            </span>
          </div>

          <button
            type="button"
            onClick={() => markAll(!allCompleted)}
            className="text-xs font-medium text-green-700 hover:text-green-800 underline underline-offset-2 px-1"
          >
            {allCompleted ? "Uncheck all" : "Mark all ready"}
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
        <div
          className="bg-green-600 h-full transition-all duration-300"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Questions & Reminders Checklist */}
      <div className="space-y-3">
        {items.map((item, index) => {
          const Icon = SAFETY_ICONS[item.id] || ShieldCheck;
          return (
            <div
              key={item.id}
              className={cn(
                "group rounded-xl border p-4 transition-all",
                item.checked
                  ? "bg-green-50/40 border-green-200"
                  : "bg-white border-gray-200 hover:border-gray-300"
              )}
            >
              <div className="flex items-start gap-3 sm:gap-4">
                {/* Tick Column */}
                <div className="pt-0.5 shrink-0 flex flex-col items-center">
                  <label
                    htmlFor={`safety-check-${item.id}`}
                    className="cursor-pointer flex items-center justify-center"
                    title="Tick to mark as verified and ready"
                  >
                    <input
                      id={`safety-check-${item.id}`}
                      type="checkbox"
                      checked={item.checked}
                      onChange={() => toggleItem(item.id)}
                      className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500 focus:ring-offset-0 cursor-pointer"
                    />
                  </label>
                  <span className="text-[10px] text-gray-400 font-mono mt-1 hidden sm:block">
                    #{index + 1}
                  </span>
                </div>

                {/* Question & Reminder Details */}
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <label
                      htmlFor={`safety-check-${item.id}`}
                      className="cursor-pointer"
                    >
                      <h4 className="text-sm font-semibold text-gray-900 group-hover:text-green-900 leading-snug flex items-start gap-2">
                        <Icon className="w-4 h-4 text-green-700 shrink-0 mt-0.5" aria-hidden="true" />
                        <span>{item.question}</span>
                      </h4>
                    </label>

                    {item.checked ? (
                      <span className="shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold text-green-700 bg-green-100/80 px-2 py-0.5 rounded-md">
                        <CheckCircle2 className="w-3 h-3 text-green-600" />
                        Ready on-site
                      </span>
                    ) : (
                      <span className="shrink-0 text-[11px] text-gray-400 bg-gray-50 px-2 py-0.5 rounded-md border border-gray-100">
                        Not verified yet
                      </span>
                    )}
                  </div>

                  {/* Safety Guidance Reminder */}
                  <div className="rounded-lg bg-amber-50/70 border border-amber-200/60 p-2.5 flex items-start gap-2 text-xs text-amber-900">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="leading-relaxed">
                      <span className="font-semibold text-amber-950">Safety reminder: </span>
                      {item.reminder}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
