"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { ProfileAlertDot } from "@/components/ui/profile-alert-dot";
import { useFavoritesProfileNotice } from "@/lib/guest/use-guest-profile-notices";
import {
  FAVORITES_KEY,
  FAVORITES_SYNC_EVENT,
  getFavoriteCount,
} from "@/lib/mock/guest-data";

export function useFavoriteCount() {
  const [count, setCount] = useState<number | null>(null);

  useLayoutEffect(() => {
    setCount(getFavoriteCount());
  }, []);

  useEffect(() => {
    function refresh() {
      setCount(getFavoriteCount());
    }
    refresh();
    window.addEventListener(FAVORITES_SYNC_EVENT, refresh);
    function onStorage(e: StorageEvent) {
      if (e.key === FAVORITES_KEY) refresh();
    }
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(FAVORITES_SYNC_EVENT, refresh);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return count;
}

export function GuestFavoritesBadge() {
  const count = useFavoriteCount();

  if (count === null || count <= 0) return null;

  return (
    <span
      className="inline-flex items-center justify-center min-w-[1.25rem] shrink-0 bg-red-500 text-white text-[10px] font-bold leading-none px-1.5 py-0.5 rounded-full"
      aria-label={`${count} saved ${count === 1 ? "stay" : "stays"}`}
    >
      {count > 9 ? "9+" : count}
    </span>
  );
}

export function GuestFavoritesProfileDot() {
  const { visible, pulseKey } = useFavoritesProfileNotice();

  if (!visible) return null;

  return (
    <ProfileAlertDot
      position="top"
      pingClassName="bg-red-500"
      dotClassName="bg-red-500"
      pulseKey={pulseKey}
      label="Stay saved"
    />
  );
}
