import { ClipboardList } from "lucide-react";
import { OpsSectionCard } from "@/components/dashboard/booking-ops/ops-section-card";
import { buildBookingActivityTimeline } from "@/lib/host/booking-activity-utils";
import type { BookingAuditEntry, HostBookingRecord } from "@/lib/host/host-booking-types";

function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function OpsActivityTimeline({
  booking,
  entries: entriesOverride,
  description = "Booking history and operational updates.",
}: {
  booking?: HostBookingRecord;
  entries?: BookingAuditEntry[];
  description?: string;
}) {
  const entries = entriesOverride ?? (booking ? buildBookingActivityTimeline(booking) : []);

  return (
    <OpsSectionCard title="Activity">
      <div className="flex items-center gap-2 mb-3 text-gray-500">
        <ClipboardList className="w-4 h-4 text-green-700" />
        <p className="text-xs">{description}</p>
      </div>
      {entries.length === 0 ? (
        <p className="text-sm text-gray-400">No activity recorded yet.</p>
      ) : (
        <ol className="relative border-s border-gray-200 ms-2 space-y-4">
          {entries.map((entry) => (
            <li key={entry.id} className="ms-4">
              <span
                className="absolute -start-1.5 mt-1.5 w-3 h-3 rounded-full bg-green-600 border-2 border-white"
                aria-hidden
              />
              <div className="rounded-xl border border-gray-100 bg-gray-50/80 px-3.5 py-2.5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-gray-900">{entry.action}</p>
                  <time className="text-[11px] text-gray-400 shrink-0">{formatWhen(entry.at)}</time>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  {entry.actor}
                  {entry.detail ? ` · ${entry.detail}` : ""}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </OpsSectionCard>
  );
}
