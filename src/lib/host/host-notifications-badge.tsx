"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { resolveHostId } from "@/lib/listings/host-listings-utils";
import {
  HOST_NOTIFICATIONS_SYNC_EVENT,
  loadHostNotifications,
} from "@/lib/host/host-notifications-data";
import { HOST_BOOKINGS_SYNC_EVENT } from "@/lib/host/host-booking-data";
import {
  HOST_OVERVIEW_ANNOUNCEMENT_EVENTS,
  countHostOverviewAnnouncements,
} from "@/lib/host/host-overview-announcement-count";

export function HostNotificationsBadge() {
  const { user } = useAuth();
  const hostId = resolveHostId(user);
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      const unread = hostId
        ? loadHostNotifications(hostId).alerts.filter((alert) => !alert.read).length
        : 0;
      const announcements = countHostOverviewAnnouncements(hostId, user?.fullName);
      let pending = 0;
      try {
        const params = new URLSearchParams({ role: "host" });
        if (hostId) params.set("hostId", hostId);
        const res = await fetch(`/api/bookings?${params.toString()}`, { cache: "no-store" });
        if (res.ok) {
          const data = (await res.json()) as { bookings?: { status?: string }[] };
          pending = (data.bookings ?? []).filter((booking) => booking.status === "pending").length;
        }
      } catch {
        // keep local counts
      }
      if (!cancelled) setCount(unread + announcements + pending);
    }

    void refresh();
    const events = [
      ...HOST_OVERVIEW_ANNOUNCEMENT_EVENTS,
      HOST_NOTIFICATIONS_SYNC_EVENT,
      HOST_BOOKINGS_SYNC_EVENT,
    ];
    for (const eventName of events) {
      window.addEventListener(eventName, refresh);
    }
    return () => {
      cancelled = true;
      for (const eventName of events) {
        window.removeEventListener(eventName, refresh);
      }
    };
  }, [hostId, user?.fullName]);

  if (count <= 0) return null;

  return (
    <span
      className="inline-flex items-center justify-center min-w-[1.25rem] shrink-0 bg-red-500 text-white text-[10px] font-bold leading-none px-1.5 py-0.5 rounded-full"
      aria-label={`${count} notification${count === 1 ? "" : "s"}`}
    >
      {count > 9 ? "9+" : count}
    </span>
  );
}
