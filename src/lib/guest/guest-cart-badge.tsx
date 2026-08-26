"use client";

import { useEffect, useState } from "react";
import {
  BOOKING_CART_SYNC_EVENT,
  getCartCount,
} from "@/lib/guest/booking-cart";

export function GuestCartBadge() {
  const [count, setCount] = useState(0);

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

  if (count <= 0) return null;

  return (
    <span
      className="inline-flex items-center justify-center min-w-[1.25rem] shrink-0 bg-green-700 text-white text-[10px] font-bold leading-none px-1.5 py-0.5 rounded-full"
      aria-label={`${count} in cart`}
    >
      {count > 9 ? "9+" : count}
    </span>
  );
}
