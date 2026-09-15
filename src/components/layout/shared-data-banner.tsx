"use client";

import { useEffect, useState } from "react";
import { Database, X } from "lucide-react";
import { isSharedListingsEnabled } from "@/lib/listings/submission-data";

const DISMISS_KEY = "farm-stays-shared-banner-dismissed";

/**
 * Makes the shared vs local data mode obvious so users know whether
 * changes sync across browsers/devices.
 */
export function SharedDataBanner() {
  const [visible, setVisible] = useState(false);
  const shared = isSharedListingsEnabled();

  useEffect(() => {
    try {
      if (sessionStorage.getItem(DISMISS_KEY) === "1") return;
    } catch {
      /* ignore */
    }
    setVisible(true);
  }, []);

  if (!visible) return null;

  function dismiss() {
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
    setVisible(false);
  }

  return (
    <div
      className={`w-full min-w-0 border-b px-4 py-2.5 ${
        shared
          ? "bg-emerald-50 border-emerald-100 text-emerald-900"
          : "bg-amber-50 border-amber-100 text-amber-950"
      }`}
      role="status"
    >
      <div className="site-page-container flex items-start gap-3 text-sm">
        <Database
          className={`w-4 h-4 mt-0.5 shrink-0 ${shared ? "text-emerald-700" : "text-amber-700"}`}
          aria-hidden
        />
        <p className="flex-1 leading-snug">
          {shared ? (
            <>
              <span className="font-semibold">Shared listings are on.</span> Hosts and admins
              see the same properties across browsers — saves go to the server database, not
              just this device.
            </>
          ) : (
            <>
              <span className="font-semibold">Local demo mode.</span> Listings live in this
              browser only. Set <code className="text-xs bg-white/70 px-1 rounded">NEXT_PUBLIC_USE_SHARED_DB=1</code>{" "}
              for multi-user sync.
            </>
          )}
        </p>
        <button
          type="button"
          onClick={dismiss}
          className="p-1 rounded-md hover:bg-black/5 text-current opacity-70 hover:opacity-100"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
