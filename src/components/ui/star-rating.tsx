"use client";

import { useState, useEffect } from "react";
import { Star } from "lucide-react";

export function StarRating({
  rating,
  size = "sm",
}: {
  rating: number;
  size?: "sm" | "md";
}) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`${
            i <= Math.round(rating)
              ? "fill-amber-400 text-amber-400"
              : "fill-gray-200 text-gray-200"
          } ${size === "sm" ? "w-3 h-3" : "w-4 h-4"}`}
        />
      ))}
    </div>
  );
}

export function CountdownTimer({
  d,
  h,
  m,
}: {
  d: number;
  h: number;
  m: number;
}) {
  const [time, setTime] = useState({ d, h, m, s: 0 });

  useEffect(() => {
    const iv = setInterval(() => {
      setTime((t) => {
        let { d, h, m, s } = t;
        s--;
        if (s < 0) {
          s = 59;
          m--;
        }
        if (m < 0) {
          m = 59;
          h--;
        }
        if (h < 0) {
          h = 23;
          d--;
        }
        return {
          d: Math.max(0, d),
          h: Math.max(0, h),
          m: Math.max(0, m),
          s: Math.max(0, s),
        };
      });
    }, 1000);
    return () => clearInterval(iv);
  }, []);

  const pad = (n: number) => String(n).padStart(2, "0");
  const values = [time.d, time.h, time.m, time.s];
  const labels = ["d", "h", "m", "s"];

  return (
    <div className="flex gap-1">
      {labels.map((label, i) => (
        <div key={label} className="flex flex-col items-center">
          <span className="bg-gray-900 text-white rounded px-1.5 py-0.5 text-xs font-bold min-w-[26px] text-center">
            {pad(values[i])}
          </span>
          <span className="text-[9px] text-gray-500 mt-0.5 uppercase">{label}</span>
        </div>
      ))}
    </div>
  );
}
