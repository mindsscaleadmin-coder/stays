import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Deterministic thousands grouping (avoids Node vs browser locale hydration mismatches). */
export function formatAmount(amount: number): string {
  const n = Math.round(Number.isFinite(amount) ? amount : 0);
  const sign = n < 0 ? "-" : "";
  const digits = String(Math.abs(n));
  return sign + digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function formatPrice(amount: number, currency = "AED") {
  const formatted = formatAmount(amount);
  return `${currency} ${formatted}`;
}

/** Trigger a browser download for a file stored as a data URL (e.g. uploaded ID docs). */
export function downloadDataUrlFile(filename: string, dataUrl: string) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
