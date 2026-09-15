"use client";

import { Bell } from "lucide-react";
import { usePendingListingBadgeCount } from "@/lib/admin/use-pending-listing-badge";

/**
 * Live notification for admin Listing Control nav.
 * Uses a lightweight pending-count fetch — not the full listings store.
 */
export function ListingControlNavNotice() {
  const pendingCount = usePendingListingBadgeCount();

  if (pendingCount === null || pendingCount <= 0) return null;

  const label = pendingCount > 99 ? "99+" : String(pendingCount);

  return (
    <span
      className="inline-flex items-center gap-1 shrink-0 rounded-full bg-red-500 text-white pl-1 pr-1.5 py-0.5"
      aria-label={`${label} pending listings`}
      title={`${label} listings awaiting review`}
    >
      <Bell className="w-3 h-3" strokeWidth={2.5} aria-hidden />
      <span className="text-[10px] font-bold leading-none tabular-nums">{label}</span>
    </span>
  );
}
