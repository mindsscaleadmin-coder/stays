"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type DiningFormTier = "required" | "recommended" | "optional";

const TIER_STYLES: Record<DiningFormTier, string> = {
  required: "bg-red-50 text-red-800 ring-red-200/80",
  recommended: "bg-amber-50 text-amber-900 ring-amber-200/80",
  optional: "bg-gray-100 text-gray-600 ring-gray-200/80",
};

const TIER_LABELS: Record<DiningFormTier, string> = {
  required: "Required",
  recommended: "Recommended",
  optional: "Optional",
};

export function DiningFormTierBadge({ tier }: { tier: DiningFormTier }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-2xs font-bold uppercase tracking-wide ring-1 ring-inset",
        TIER_STYLES[tier]
      )}
    >
      {TIER_LABELS[tier]}
    </span>
  );
}

export function DiningFormSection({
  number,
  title,
  tier,
  description,
  children,
  className,
}: {
  number?: number;
  title: string;
  tier?: DiningFormTier;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-4", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {number != null ? (
              <span className="text-xs font-bold text-gray-400 tabular-nums">{number}.</span>
            ) : null}
            <h3 className="font-display text-base font-bold text-gray-900">{title}</h3>
            {tier ? <DiningFormTierBadge tier={tier} /> : null}
          </div>
          {description ? <p className="mt-1 text-xs text-gray-500 max-w-3xl">{description}</p> : null}
        </div>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

export function DiningFormCard({
  title,
  description,
  children,
  className,
}: {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-gray-200 bg-gray-50/40 p-4 space-y-4",
        className
      )}
    >
      {title ? (
        <div>
          <p className="font-display text-sm font-semibold text-gray-900">{title}</p>
          {description ? <p className="text-xs text-gray-500 mt-0.5">{description}</p> : null}
        </div>
      ) : null}
      {children}
    </div>
  );
}

export function DiningChipSelect({
  options,
  value,
  onChange,
  multiple = true,
}: {
  options: readonly string[];
  value: string[];
  onChange: (next: string[]) => void;
  multiple?: boolean;
}) {
  function toggle(option: string) {
    if (multiple) {
      onChange(
        value.includes(option) ? value.filter((item) => item !== option) : [...value, option]
      );
      return;
    }
    onChange(value.includes(option) ? [] : [option]);
  }

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const active = value.includes(option);
        return (
          <button
            key={option}
            type="button"
            onClick={() => toggle(option)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
              active
                ? "border-green-700 bg-green-50 text-green-900"
                : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
            )}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}

export function DiningYesNoField({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div>
      <p className="text-sm font-medium text-gray-700 mb-2">{label}</p>
      <div className="flex flex-wrap gap-2">
        {[
          { label: "Yes", active: value === true },
          { label: "No", active: value === false },
        ].map((option) => (
          <button
            key={option.label}
            type="button"
            onClick={() => onChange(option.label === "Yes")}
            className={cn(
              "rounded-lg border px-3 py-2 text-sm font-semibold transition-colors",
              option.active
                ? "border-green-700 bg-green-50 text-green-900"
                : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
