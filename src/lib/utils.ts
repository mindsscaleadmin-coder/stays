import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { BASE_CURRENCY } from "@/lib/currency";

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

export function formatPrice(amount: number, currency = BASE_CURRENCY) {
  const formatted = formatAmount(amount);
  return `${currency} ${formatted}`;
}

/** Open the native date/time picker when the user clicks anywhere on the field. */
export function openNativeDatePicker(event: { currentTarget: HTMLInputElement }) {
  const input = event.currentTarget;
  if (typeof input.showPicker !== "function") return;
  try {
    input.showPicker();
  } catch {
    /* already open, or the browser blocked it */
  }
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
