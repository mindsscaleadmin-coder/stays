import type { AdminAlertSettings, AdminAlertsState } from "./admin-alerts-types";
import { isSharedDbEnabled } from "@/lib/shared-db";

export function shouldUseSharedAdminAlerts() {
  return isSharedDbEnabled();
}

export async function fetchAdminAlertsStateFromApi(): Promise<AdminAlertsState> {
  const res = await fetch("/api/admin/alerts", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load admin alerts state");
  const json = (await res.json()) as { state: AdminAlertsState };
  return json.state;
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
