import type { HostAccountsData, HostPayoutAccountInput } from "./host-accounts-types";
import { isSharedDbEnabled } from "@/lib/shared-db";

export function shouldUseSharedHostAccounts() {
  return isSharedDbEnabled();
}

export async function fetchHostAccountsFromApi(hostId: string): Promise<HostAccountsData> {
  const res = await fetch(`/api/hosts/${encodeURIComponent(hostId)}/accounts`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to load host accounts");
  const json = (await res.json()) as { data: HostAccountsData };
  return json.data;
}

export async function savePayoutAccountViaApi(
  hostId: string,
  payoutAccount: HostPayoutAccountInput
): Promise<HostAccountsData> {
  const res = await fetch(`/api/hosts/${encodeURIComponent(hostId)}/accounts`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ payoutAccount }),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? "Failed to save payout account");
  }
  const json = (await res.json()) as { data: HostAccountsData };
  return json.data;
}
