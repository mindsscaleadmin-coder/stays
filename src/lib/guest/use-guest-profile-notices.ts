"use client";

import { useEffect, useState } from "react";
import {
  CART_PROFILE_NOTICE_CLEAR_EVENT,
  CART_PROFILE_NOTICE_EVENT,
  FAVORITES_PROFILE_NOTICE_CLEAR_EVENT,
  FAVORITES_PROFILE_NOTICE_EVENT,
} from "@/lib/guest/guest-profile-notice-events";

function useProfileNotice(
  showEvent: string,
  clearEvent: string
): { visible: boolean; pulseKey: number } {
  const [visible, setVisible] = useState(false);
  const [pulseKey, setPulseKey] = useState(0);

  useEffect(() => {
    function show() {
      setVisible(true);
      setPulseKey((key) => key + 1);
    }
    function hide() {
      setVisible(false);
    }
    window.addEventListener(showEvent, show);
    window.addEventListener(clearEvent, hide);
    return () => {
      window.removeEventListener(showEvent, show);
      window.removeEventListener(clearEvent, hide);
    };
  }, [showEvent, clearEvent]);

  return { visible, pulseKey };
}

export function useCartProfileNotice() {
  return useProfileNotice(CART_PROFILE_NOTICE_EVENT, CART_PROFILE_NOTICE_CLEAR_EVENT);
}

export function useFavoritesProfileNotice() {
  return useProfileNotice(FAVORITES_PROFILE_NOTICE_EVENT, FAVORITES_PROFILE_NOTICE_CLEAR_EVENT);
}
