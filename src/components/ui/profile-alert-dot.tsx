"use client";

import { useEffect, useState } from "react";

type ProfileAlertDotProps = {
  label: string;
  position: "top" | "bottom";
  pingClassName: string;
  dotClassName: string;
  /** Change to replay the pulse (e.g. cart or saved count). */
  pulseKey?: number | string;
};

const PULSE_DURATION_MS = 3000;

export function ProfileAlertDot({
  label,
  position,
  pingClassName,
  dotClassName,
  pulseKey = 0,
}: ProfileAlertDotProps) {
  const positionClass = position === "top" ? "-top-0.5" : "-bottom-0.5";
  const [pinging, setPinging] = useState(false);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) {
      setPinging(false);
      return;
    }
    setPinging(true);
    const timer = window.setTimeout(() => setPinging(false), PULSE_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [pulseKey]);

  return (
    <span
      className={`absolute ${positionClass} -end-0.5 flex h-2.5 w-2.5`}
      aria-label={label}
    >
      {pinging ? (
        <span
          key={pulseKey}
          className={`absolute inline-flex h-full w-full rounded-full opacity-75 profile-alert-ping ${pingClassName}`}
          aria-hidden="true"
        />
      ) : null}
      <span
        className={`relative inline-flex h-2.5 w-2.5 rounded-full ring-2 ring-white transition-transform duration-300 ${
          pinging ? "scale-110" : "scale-100"
        } ${dotClassName}`}
        aria-hidden="true"
      />
    </span>
  );
}
