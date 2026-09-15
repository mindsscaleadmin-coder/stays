"use client";

import { memo, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { BOOKING_ACTIVITY } from "@/lib/mock/data";

export const HomeLiveActivityBar = memo(function HomeLiveActivityBar() {
  const t = useTranslations("home");
  const [activityIdx, setActivityIdx] = useState(0);

  useEffect(() => {
    const iv = setInterval(
      () => setActivityIdx((i) => (i + 1) % BOOKING_ACTIVITY.length),
      3000
    );
    return () => clearInterval(iv);
  }, []);

  const activity = BOOKING_ACTIVITY[activityIdx];

  return (
    <div className="home-page-container mt-4">
      <div className="bg-green-700 rounded-xl px-5 py-3 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-2 h-2 bg-green-300 rounded-full animate-pulse" />
          <span className="text-white text-sm font-semibold">{t("liveActivity")}</span>
        </div>
        <div className="text-green-100 text-sm">
          <strong className="text-white">{activity.name}</strong> {t("justBooked")}{" "}
          <span className="text-amber-300">{activity.property}</span>{" "}
          <span className="text-green-300">— {activity.time}</span>
        </div>
      </div>
    </div>
  );
});
