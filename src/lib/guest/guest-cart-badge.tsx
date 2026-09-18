"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { ProfileAlertDot } from "@/components/ui/profile-alert-dot";
import {
  BOOKING_CART_SYNC_EVENT,
  getCartCount,
} from "@/lib/guest/booking-cart";
import { useCartProfileNotice } from "@/lib/guest/use-guest-profile-notices";

export function useCartCount() {
  const [count, setCount] = useState<number | null>(null);

  useLayoutEffect(() => {
    setCount(getCartCount());
  }, []);

  useEffect(() => {
    function refresh() {
      setCount(getCartCount());
    }
    refresh();
    window.addEventListener(BOOKING_CART_SYNC_EVENT, refresh);
    function onStorage(e: StorageEvent) {
      if (e.key === "farm-stays-booking-cart") refresh();
    }
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(BOOKING_CART_SYNC_EVENT, refresh);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return count;
}

export function GuestCartBadge() {
  const count = useCartCount();

  if (count === null || count <= 0) return null;

  return (
    <span
      className="inline-flex items-center justify-center min-w-[1.25rem] shrink-0 bg-green-700 text-white text-[10px] font-bold leading-none px-1.5 py-0.5 rounded-full"
      aria-label={`${count} in cart`}
    >
      {count > 9 ? "9+" : count}
    </span>
  );
}

export function GuestCartProfileDot() {
  const { visible, pulseKey } = useCartProfileNotice();

  if (!visible) return null;

  return (
    <ProfileAlertDot
      position="bottom"
      pingClassName="bg-green-600"
      dotClassName="bg-green-700"
      pulseKey={pulseKey}
      label="Added to cart"
    />
  );
}
