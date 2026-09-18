"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, Maximize2, Minimize2 } from "lucide-react";
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
  title,
  tier,
  description,
  children,
  className,
}: {
  title: string;
  tier?: DiningFormTier;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("pt-8 pb-8 border-b border-gray-200 last:border-b-0", className)}>
      <div className="mb-5">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-display text-base font-bold text-gray-900">{title}</h3>
          {tier ? <DiningFormTierBadge tier={tier} /> : null}
        </div>
        {description ? <p className="mt-1 text-xs text-gray-500 max-w-3xl">{description}</p> : null}
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
    <div className={cn("space-y-4", className)}>
      {title ? (
        <div>
          <p className="text-sm font-semibold text-gray-900">{title}</p>
          {description ? <p className="text-xs text-gray-500 mt-0.5">{description}</p> : null}
        </div>
      ) : null}
      {children}
    </div>
  );
}

export function DiningCollapsibleCard({
  summary,
  summaryDetail,
  defaultExpanded = false,
  expandLabel = "Expand",
  collapseLabel = "Minimize",
  children,
  className,
}: {
  summary: string;
  summaryDetail?: ReactNode;
  defaultExpanded?: boolean;
  expandLabel?: string;
  collapseLabel?: string;
  children: ReactNode;
  className?: string;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-gray-100">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900">{summary}</p>
          {summaryDetail ? (
            <div className="mt-1 text-xs text-gray-500">{summaryDetail}</div>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => setExpanded((open) => !open)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-800 hover:text-green-900 shrink-0"
        >
          {expanded ? (
            <>
              <Minimize2 className="w-3.5 h-3.5" />
              {collapseLabel}
            </>
          ) : (
            <>
              <Maximize2 className="w-3.5 h-3.5" />
              {expandLabel}
            </>
          )}
          <ChevronDown
            className={cn("w-3.5 h-3.5 transition-transform", expanded && "rotate-180")}
          />
        </button>
      </div>
      {expanded ? <div className="space-y-4">{children}</div> : null}
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
