import type { SeoSettings } from "./seo-settings-types";
import { isSharedDbEnabled } from "@/lib/shared-db";

export function shouldUseSharedSeoSettings() {
  return isSharedDbEnabled();
}

export async function fetchSeoSettingsFromApi(): Promise<SeoSettings> {
  const res = await fetch("/api/platform/seo-settings", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load SEO settings");
  const data = (await res.json()) as { settings: SeoSettings };
  return data.settings;
}

export async function saveSeoSettingsToApi(settings: SeoSettings): Promise<SeoSettings> {
  const res = await fetch("/api/platform/seo-settings", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(settings),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? "Failed to save SEO settings");
  }
  const data = (await res.json()) as { settings: SeoSettings };
  return data.settings;
}
