import { isSharedDbEnabled } from "@/lib/shared-db";
import type { ContentPolicySettings } from "./content-policy-types";
import { loadContentPolicy } from "./content-policy-data";

export function shouldUseSharedContentPolicy() {
  return isSharedDbEnabled();
}

export async function fetchContentPolicyFromApi(): Promise<ContentPolicySettings> {
  const res = await fetch("/api/platform/content-policy", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load content policy");
  const data = (await res.json()) as { settings: ContentPolicySettings };
  return data.settings;
}

export async function saveContentPolicyToApi(
  settings: ContentPolicySettings
): Promise<ContentPolicySettings> {
  const res = await fetch("/api/platform/content-policy", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(settings),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? "Failed to save content policy");
  }
  const data = (await res.json()) as { settings: ContentPolicySettings };
  return data.settings;
}

export async function loadContentPolicyClient(
  taxonomyParents?: { id: string; name: string }[]
): Promise<ContentPolicySettings> {
  if (shouldUseSharedContentPolicy()) {
    try {
      return await fetchContentPolicyFromApi();
    } catch {
      return loadContentPolicy(taxonomyParents);
    }
  }
  return loadContentPolicy(taxonomyParents);
}
