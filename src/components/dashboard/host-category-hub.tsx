"use client";

import { Link } from "@/i18n/routing";
import {
  BedDouble,
  CalendarCheck,
  CalendarDays,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import {
  HOST_CATEGORY_FLOWS,
  type HostCategoryFlow,
} from "@/lib/host/host-category-flows";
import { HostCategoryFlowLegend } from "@/components/dashboard/host-ops-flow-banner";
import { useHostStaffAccess } from "@/lib/host/use-host-staff-access";
import { cn } from "@/lib/utils";

const ICONS: Record<HostCategoryFlow["id"], LucideIcon> = {
  stay: BedDouble,
  experience: CalendarDays,
  event: CalendarCheck,
  dining: UtensilsCrossed,
};

function CategoryCard({ flow }: { flow: HostCategoryFlow }) {
  const Icon = ICONS[flow.id];

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">
            <Icon className="w-4 h-4 text-green-700" strokeWidth={1.75} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-gray-900">{flow.label}</p>
            <HostCategoryFlowLegend kind={flow.kind} />
          </div>
        </div>
      </div>

      <p className="text-xs text-gray-500 leading-relaxed">{flow.guestAction}</p>

      <ol className="text-xs text-gray-600 space-y-1.5">
        <li className="flex gap-2">
          <span className="font-semibold text-gray-400">1.</span>
          <span>{flow.hostStep1}</span>
        </li>
        {flow.hostStep2 ? (
          <li className="flex gap-2">
            <span className="font-semibold text-gray-400">2.</span>
            <span>{flow.hostStep2}</span>
          </li>
        ) : null}
      </ol>

      <div className="flex flex-wrap gap-2 mt-auto pt-1">
        <Link
          href={flow.hostStep1Href}
          className={cn(
            "inline-flex items-center justify-center text-xs font-semibold px-3 py-1.5 rounded-lg",
            flow.kind === "paid"
              ? "bg-green-700 text-white hover:bg-green-800"
              : "bg-amber-600 text-white hover:bg-amber-700"
          )}
        >
          {flow.kind === "paid" ? "Open Bookings" : "Open Enquiries"}
        </Link>
        {flow.hostStep2Href ? (
          <Link
            href={flow.hostStep2Href}
            className="inline-flex items-center justify-center text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
          >
            {flow.kind === "paid" ? "Check-in / out" : "Confirmed in Bookings"}
          </Link>
        ) : null}
      </div>
    </div>
  );
}

export function HostCategoryHub() {
  const { canAccessPath } = useHostStaffAccess();

  const flows = HOST_CATEGORY_FLOWS.filter((flow) =>
    canAccessPath(flow.hostStep1Href.split("?")[0])
  );

  if (flows.length === 0) return null;

  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-sm font-bold text-gray-900">By listing category</h3>
        <p className="text-xs text-gray-500 mt-0.5">
          Stays and Experiences are paid bookings. Events and Dining are enquiry-only — reply in
          Enquiries, then track confirmed dates in Bookings.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        {flows.map((flow) => (
          <CategoryCard key={flow.id} flow={flow} />
        ))}
      </div>
    </section>
  );
}
