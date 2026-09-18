"use client";

import { Bell } from "lucide-react";
import { usePendingRefundBadgeCount } from "@/lib/admin/use-pending-refund-badge";

/** Live badge for admin Financial nav — refunds awaiting approval. */
export function PendingRefundNavNotice() {
  const pendingCount = usePendingRefundBadgeCount();

  if (pendingCount === null || pendingCount <= 0) return null;

  const label = pendingCount > 99 ? "99+" : String(pendingCount);

  return (
    <span
      className="inline-flex items-center gap-1 shrink-0 rounded-full bg-amber-500 text-white pl-1 pr-1.5 py-0.5"
      aria-label={`${label} pending refunds`}
      title={`${label} refund${pendingCount === 1 ? "" : "s"} awaiting approval`}
    >
      <Bell className="w-3 h-3" strokeWidth={2.5} aria-hidden />
      <span className="text-[10px] font-bold leading-none tabular-nums">{label}</span>
    </span>
  );
}
