import type { AdminAlertSettings, AdminAlertsState } from "./admin-alerts-types";
import { isSharedDbEnabled } from "@/lib/shared-db";

export function shouldUseSharedAdminAlerts() {
  return isSharedDbEnabled();
}

const ALERTS_STATE_TTL_MS = 8_000;
let alertsStateCache: AdminAlertsState | null = null;
let alertsStateFetchedAt = 0;
let alertsStateInflight: Promise<AdminAlertsState> | null = null;

export async function fetchAdminAlertsStateFromApi(force = false): Promise<AdminAlertsState> {
  if (!force && alertsStateInflight) return alertsStateInflight;
  if (!force && alertsStateCache && Date.now() - alertsStateFetchedAt < ALERTS_STATE_TTL_MS) {
    return alertsStateCache;
  }

  alertsStateInflight = (async () => {
    try {
      const res = await fetch("/api/admin/alerts", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load admin alerts state");
      const json = (await res.json()) as { state: AdminAlertsState };
      alertsStateCache = json.state;
      alertsStateFetchedAt = Date.now();
      return json.state;
    } catch {
      if (alertsStateCache) return alertsStateCache;
      throw new Error("Failed to load admin alerts state");
    } finally {
      alertsStateInflight = null;
    }
  })();

  return alertsStateInflight;
}

export type AdminAlertsPatchAction =
  | { action: "markRead"; sourceKey: string }
  | { action: "markAllRead"; sourceKeys: string[] }
  | { action: "dismiss"; sourceKey: string }
  | { action: "saveSettings"; settings: AdminAlertSettings }
  | {
      action: "setServiceStatus";
      service: keyof Omit<AdminAlertSettings["systemHealth"], "lastCheckedAt">;
      status: AdminAlertSettings["systemHealth"]["paymentGateway"];
    };

export async function patchAdminAlertsViaApi(
  body: AdminAlertsPatchAction
): Promise<AdminAlertsState> {
  const res = await fetch("/api/admin/alerts", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const payload = (await res.json()) as { error?: string };
    throw new Error(payload.error || "Admin alerts update failed");
  }
  const json = (await res.json()) as { state: AdminAlertsState };
  return json.state;
}
