import type { SupportContactSettings } from "./support-contact-settings-types";
import { isSharedDbEnabled } from "@/lib/shared-db";

export function shouldUseSharedSupportContactSettings() {
  return isSharedDbEnabled();
}

export async function fetchSupportContactSettingsFromApi(): Promise<SupportContactSettings> {
  const res = await fetch("/api/platform/support-contact-settings", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load support contact settings");
  const data = (await res.json()) as { settings: SupportContactSettings };
  return data.settings;
}

export async function saveSupportContactSettingsToApi(
  settings: SupportContactSettings
): Promise<SupportContactSettings> {
  const res = await fetch("/api/platform/support-contact-settings", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(settings),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? "Failed to save support contact settings");
  }
  const data = (await res.json()) as { settings: SupportContactSettings };
  return data.settings;
}
