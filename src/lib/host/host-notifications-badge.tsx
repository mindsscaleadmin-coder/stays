"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { resolveHostId } from "@/lib/listings/host-listings-utils";
import {
  HOST_NOTIFICATIONS_SYNC_EVENT,
  loadHostNotifications,
} from "@/lib/host/host-notifications-data";
import { HOST_BOOKINGS_SYNC_EVENT, loadHostBookings } from "@/lib/host/host-booking-data";
import { fetchServerHostBookings } from "@/lib/host/use-host-bookings";
import {
  HOST_OVERVIEW_ANNOUNCEMENT_EVENTS,
  countHostOverviewAnnouncements,
} from "@/lib/host/host-overview-announcement-count";

function countBadgeItems(hostId: string | undefined, hostName?: string) {
  const unread = hostId
    ? loadHostNotifications(hostId).alerts.filter((alert) => !alert.read).length
    : 0;
  const announcements = countHostOverviewAnnouncements(hostId, hostName);
  const pending = loadHostBookings().filter((booking) => booking.status === "pending").length;
  return unread + announcements + pending;
}

export function HostNotificationsBadge() {
  const { user } = useAuth();
  const hostId = resolveHostId(user);
  // null until mounted — avoids SSR/client localStorage mismatch (hydration error).
  const [count, setCount] = useState<number | null>(null);

  useLayoutEffect(() => {
    setCount(countBadgeItems(hostId, user?.fullName));
  }, [hostId, user?.fullName]);

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      let pending = loadHostBookings().filter((booking) => booking.status === "pending").length;
      try {
        const rows = await fetchServerHostBookings(hostId);
        pending = (rows ?? []).filter((booking) => booking.status === "pending").length;
      } catch {
        // keep local counts
      }
      const unread = hostId
        ? loadHostNotifications(hostId).alerts.filter((alert) => !alert.read).length
        : 0;
      const announcements = countHostOverviewAnnouncements(hostId, user?.fullName);
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

  if (count === null || count <= 0) return null;

  return (
    <span
      className="inline-flex items-center justify-center min-w-[1.25rem] shrink-0 bg-red-500 text-white text-[10px] font-bold leading-none px-1.5 py-0.5 rounded-full"
      aria-label={`${count} notification${count === 1 ? "" : "s"}`}
    >
      {count > 9 ? "9+" : count}
    </span>
  );
}
