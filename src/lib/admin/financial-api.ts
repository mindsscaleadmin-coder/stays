import type {
  FinancialSettings,
  RefundRequest,
  AdminPayoutStatus,
  HostCommissionOverride,
  AdminTransactionRow,
  AdminPayoutItem,
  FinancialReport,
} from "./financial-types";
import type { FinancialHostOption } from "./financial-data";
import { isSharedDbEnabled } from "@/lib/shared-db";

export function shouldUseSharedAdminFinancial() {
  return isSharedDbEnabled();
}

export type PlatformLedger = {
  transactions: AdminTransactionRow[];
  payouts: AdminPayoutItem[];
  refunds: RefundRequest[];
  report: FinancialReport;
  hosts: FinancialHostOption[];
};

export async function fetchFinancialSettingsFromApi(): Promise<{
  settings: FinancialSettings;
  ledger?: PlatformLedger;
}> {
  const res = await fetch("/api/admin/financial", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load financial settings");
  return (await res.json()) as { settings: FinancialSettings; ledger?: PlatformLedger };
}

export type FinancialPatchAction =
  | { action: "saveSettings"; settings: FinancialSettings }
  | { action: "updateGlobalCommission"; globalFeePct: number; globalServiceFeeFlat?: number }
  | { action: "setHostOverride"; override: HostCommissionOverride }
  | { action: "removeHostOverride"; hostId: string }
  | {
      action: "updatePayout";
      payoutId: string;
      adminStatus: AdminPayoutStatus;
      holdReason?: string;
    }
  | {
      action: "reviewRefund";
      id: string;
      status: RefundRequest["status"];
      reviewNote?: string;
    };

export async function patchFinancialSettingsViaApi(
  body: FinancialPatchAction
): Promise<{ settings: FinancialSettings; ledger?: PlatformLedger }> {
  const res = await fetch("/api/admin/financial", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const payload = (await res.json()) as { error?: string };
    throw new Error(payload.error || "Financial update failed");
  }
  const json = (await res.json()) as { settings: FinancialSettings; ledger?: PlatformLedger };
  return json;
}
