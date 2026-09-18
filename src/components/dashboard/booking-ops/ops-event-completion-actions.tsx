"use client";

import { Sparkles } from "lucide-react";
import { OpsSectionCard } from "@/components/dashboard/booking-ops/ops-section-card";
import { canHostMarkEventCompleted } from "@/lib/host/event-completion-utils";
import type { HostBookingRecord } from "@/lib/host/host-booking-types";
import type { HostBookingOpsRecord } from "@/lib/host/host-ops-types";

export function OpsEventCompletionActions({
  booking,
  ops,
  busy,
  onMarkCompleted,
}: {
  booking: HostBookingRecord;
  ops: HostBookingOpsRecord | null;
  busy?: boolean;
  onMarkCompleted: () => void;
}) {
  const canComplete = canHostMarkEventCompleted(booking, ops);
  const completed = Boolean(ops?.completedAt);

  return (
    <OpsSectionCard title="Completion">
      {canComplete ? (
        <button
          type="button"
          disabled={busy}
          onClick={onMarkCompleted}
          className="inline-flex items-center gap-1.5 text-sm bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded-xl font-semibold disabled:opacity-50"
        >
          <Sparkles className="w-4 h-4" />
          Mark as completed
        </button>
      ) : (
        <p className="text-sm text-gray-500">
          {completed
            ? "This enquiry has been marked completed."
            : "Completion is available once the date is confirmed available."}
        </p>
      )}
      {completed && ops?.completedAt ? (
        <p className="text-xs text-gray-500 mt-3">
          Completed {new Date(ops.completedAt).toLocaleString()}
        </p>
      ) : null}
    </OpsSectionCard>
  );
}
