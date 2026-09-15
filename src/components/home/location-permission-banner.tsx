"use client";

import { MapPin, Navigation, X } from "lucide-react";
import { useState } from "react";

interface LocationPermissionBannerProps {
  visible: boolean;
  loading: boolean;
  areaName?: string;
  usingGps: boolean;
  onEnable: () => void;
}

export function LocationPermissionBanner({
  visible,
  loading,
  areaName,
  usingGps,
  onEnable,
}: LocationPermissionBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (!visible || dismissed || usingGps) return null;

  return (
    <div className="home-page-container mt-4">
      <div className="bg-white border border-green-200 rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3 shadow-sm">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-green-50 border border-green-100 flex items-center justify-center shrink-0">
            <MapPin className="w-4 h-4 text-green-700" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900">
              See farm stays near you
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              Turn on device location so we can set your country and show properties
              closest to you
              {areaName ? ` (currently showing near ${areaName})` : ""}.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 sm:ps-2">
          <button
            type="button"
            onClick={onEnable}
            disabled={loading}
            className="inline-flex items-center gap-1.5 bg-green-700 hover:bg-green-800 disabled:opacity-60 text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition-colors"
          >
            <Navigation className="w-3.5 h-3.5" />
            {loading ? "Locating…" : "Use my location"}
          </button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
