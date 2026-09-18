"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { resolveHostId } from "@/lib/listings/host-listings-utils";
import {
  HOST_OVERVIEW_ANNOUNCEMENT_EVENTS,
  countHostOverviewAnnouncements,
} from "@/lib/host/host-overview-announcement-count";

export function HostOverviewAnnouncementBadge() {
  const { user } = useAuth();
  const hostId = resolveHostId(user);
  const [count, setCount] = useState(0);

  useEffect(() => {
    async function refresh() {
      setCount(await countHostOverviewAnnouncements(hostId, user?.fullName));
    }
    void refresh();
    for (const eventName of HOST_OVERVIEW_ANNOUNCEMENT_EVENTS) {
      window.addEventListener(eventName, refresh);
    }
    function onStorage(e: StorageEvent) {
      if (
        e.key === "farm-stays-content-policy" ||
        e.key === "farm-stays-host-notifications" ||
        e.key === "farm-stays-host-dismissed-announcements" ||
        e.key === "farm-stays-listing-submissions"
      ) {
        refresh();
      }
    }
    window.addEventListener("storage", onStorage);
    return () => {
      for (const eventName of HOST_OVERVIEW_ANNOUNCEMENT_EVENTS) {
        window.removeEventListener(eventName, refresh);
      }
      window.removeEventListener("storage", onStorage);
    };
  }, [hostId, user?.fullName]);

  if (count <= 0) return null;

  return (
    <span
      className="inline-flex items-center justify-center min-w-[1.25rem] shrink-0 bg-red-500 text-white text-[10px] font-bold leading-none px-1.5 py-0.5 rounded-full"
      aria-label={`${count} announcement${count === 1 ? "" : "s"}`}
    >
      {count > 9 ? "9+" : count}
    </span>
  );
}
