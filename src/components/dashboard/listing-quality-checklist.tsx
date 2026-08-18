"use client";

import { CheckCircle2, Circle, AlertTriangle } from "lucide-react";
import type { QualityCheckItem } from "@/lib/listings/listing-quality-validation";
import { cn } from "@/lib/utils";

export function ListingQualityChecklist({
  items,
  className,
}: {
  items: QualityCheckItem[];
  className?: string;
}) {
  if (items.length === 0) return null;

  const pending = items.filter((i) => i.required && !i.passed).length;

  return (
    <div
      className={cn(
        "rounded-xl border p-4",
        pending > 0 ? "border-amber-200 bg-amber-50/60" : "border-green-200 bg-green-50/60",
        className
      )}
    >
      <div className="flex items-start gap-2 mb-3">
        {pending > 0 ? (
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        ) : (
          <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
        )}
        <div>
          <p className="text-sm font-semibold text-gray-900">Platform quality requirements</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {pending > 0
              ? `${pending} requirement${pending === 1 ? "" : "s"} still needed before you can continue.`
              : "All required quality checks passed."}
          </p>
        </div>
      </div>
      <ul className="space-y-1.5">
        {items.map((item) => (
          <li key={item.id} className="flex items-center gap-2 text-xs text-gray-700">
            {item.passed ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-green-600 shrink-0" />
            ) : (
              <Circle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            )}
            <span className={cn(item.passed ? "text-gray-700" : "font-medium text-gray-900")}>
              {item.label}
            </span>
            {item.detail && (
              <span className="text-gray-400 ms-auto tabular-nums">{item.detail}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
