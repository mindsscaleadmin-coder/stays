"use client";

import { Loader2 } from "lucide-react";
import {
  COUNTRY_MARKET_STATUS_LABELS,
  type CountryMarketStatus,
  getCountryMarketStatus,
} from "@/lib/admin/country-market-status";
import { cn } from "@/lib/utils";

const STATUS_ORDER: CountryMarketStatus[] = ["live", "coming_soon", "hidden"];

const STATUS_BADGE_CLASS: Record<CountryMarketStatus, string> = {
  live: "bg-green-100 text-green-800",
  coming_soon: "bg-amber-100 text-amber-700",
  hidden: "bg-gray-100 text-gray-500",
};

export function CountryMarketStatusBadge({
  status,
}: {
  status: CountryMarketStatus;
}) {
  return (
    <span
      className={cn(
        "text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide",
        STATUS_BADGE_CLASS[status]
      )}
    >
      {COUNTRY_MARKET_STATUS_LABELS[status]}
    </span>
  );
}

export function CountryMarketStatusToggle({
  enabled,
  comingSoon,
  disabled,
  saving,
  onChange,
  className,
}: {
  enabled?: boolean;
  comingSoon?: boolean;
  disabled?: boolean;
  saving?: boolean;
  onChange: (status: CountryMarketStatus) => void;
  className?: string;
}) {
  const current = getCountryMarketStatus({ enabled, comingSoon });

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-lg border border-gray-200 bg-gray-50/80 p-0.5",
        className
      )}
      role="group"
      aria-label="Market visibility"
    >
      {STATUS_ORDER.map((status) => {
        const active = current === status;
        return (
          <button
            key={status}
            type="button"
            disabled={disabled || saving || active}
            onClick={() => onChange(status)}
            className={cn(
              "relative min-w-[4.25rem] rounded-md px-2 py-1.5 text-[10px] font-semibold transition-colors",
              active
                ? "bg-white text-green-800 shadow-sm ring-1 ring-gray-200/80"
                : "text-gray-500 hover:text-gray-800 hover:bg-white/60",
              (disabled || saving) && "opacity-60 cursor-not-allowed"
            )}
            aria-pressed={active}
            title={COUNTRY_MARKET_STATUS_LABELS[status]}
          >
            <span className={cn(saving && active && "opacity-0")}>
              {status === "live" ? "Live" : status === "coming_soon" ? "Soon" : "Off"}
            </span>
            {saving && active && (
              <Loader2 className="absolute inset-0 m-auto h-3.5 w-3.5 animate-spin text-green-700" />
            )}
          </button>
        );
      })}
    </div>
  );
}
