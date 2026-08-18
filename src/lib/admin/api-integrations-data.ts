import { emitSyncEvent } from "@/lib/emit-sync-event";
import {
  DEFAULT_API_INTEGRATIONS,
  type ApiIntegration,
  type ApiIntegrationInput,
} from "./api-integrations-types";

const STORAGE_KEY = "farm-stays-api-integrations";
export const API_INTEGRATIONS_SYNC_EVENT = "farm-stays-api-integrations-updated";

function notify() {
  if (typeof window === "undefined") return;
  emitSyncEvent(API_INTEGRATIONS_SYNC_EVENT);
}

function slugify(name: string): string {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48) || `api-${Date.now()}`
  );
}

function normalize(item: ApiIntegration): ApiIntegration {
  const builtInDefault = DEFAULT_API_INTEGRATIONS.find((d) => d.id === item.id);
  return {
    id: item.id || slugify(item.name),
    name: (item.name || "").trim() || "Untitled service",
    description: (item.description || "").trim(),
    fieldLabel: (item.fieldLabel || "").trim() || "API key",
    docsUrl: item.docsUrl?.trim() || undefined,
    value: (item.value || "").trim(),
    enabled: item.enabled !== false,
    builtIn: item.builtIn ?? Boolean(builtInDefault),
  };
}

/** Merge stored values over the built-in defaults and append custom ones. */
function mergeWithDefaults(stored: ApiIntegration[]): ApiIntegration[] {
  const byId = new Map(stored.map((s) => [s.id, s]));
  const merged: ApiIntegration[] = DEFAULT_API_INTEGRATIONS.map((def) => {
    const saved = byId.get(def.id);
    return normalize({ ...def, ...(saved ?? {}), builtIn: true });
  });
  const defaultIds = new Set(DEFAULT_API_INTEGRATIONS.map((d) => d.id));
  for (const item of stored) {
    if (!defaultIds.has(item.id)) merged.push(normalize({ ...item, builtIn: false }));
  }
  return merged;
}

export function loadApiIntegrations(): ApiIntegration[] {
  if (typeof window === "undefined") {
    return DEFAULT_API_INTEGRATIONS.map((d) => ({ ...d }));
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_API_INTEGRATIONS.map((d) => ({ ...d }));
    const parsed = JSON.parse(raw) as ApiIntegration[];
    if (!Array.isArray(parsed)) return DEFAULT_API_INTEGRATIONS.map((d) => ({ ...d }));
    return mergeWithDefaults(parsed.map(normalize));
  } catch {
    return DEFAULT_API_INTEGRATIONS.map((d) => ({ ...d }));
  }
}

export function saveApiIntegrations(items: ApiIntegration[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items.map(normalize)));
  notify();
}

export function createApiIntegration(input: ApiIntegrationInput): ApiIntegration {
  return normalize({
    ...input,
    id: input.id || slugify(input.name),
    builtIn: false,
  });
}

/** Read a single integration's key (only when enabled and set). */
export function getApiKey(id: string): string | undefined {
  const found = loadApiIntegrations().find((i) => i.id === id);
  if (!found || !found.enabled || !found.value) return undefined;
  return found.value;
}

export function resetApiIntegrations(): void {
  saveApiIntegrations(DEFAULT_API_INTEGRATIONS.map((d) => ({ ...d })));
}
