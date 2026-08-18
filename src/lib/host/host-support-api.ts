import type { SupportTicket } from "./host-support-types";
import { isSharedDbEnabled } from "@/lib/shared-db";

export function shouldUseSharedHostSupport() {
  return isSharedDbEnabled();
}

export async function fetchHostSupportFromApi(hostId: string): Promise<SupportTicket[]> {
  const res = await fetch(`/api/hosts/${encodeURIComponent(hostId)}/support`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to load host support tickets");
  const json = (await res.json()) as { tickets: SupportTicket[] };
  return json.tickets;
}

export async function createHostSupportTicketViaApi(
  hostId: string,
  input: { subject: string; message: string; hostName?: string }
): Promise<SupportTicket[]> {
  const res = await fetch(`/api/hosts/${encodeURIComponent(hostId)}/support`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const payload = (await res.json()) as { error?: string };
    throw new Error(payload.error || "Failed to submit support ticket");
  }
  const json = (await res.json()) as { tickets: SupportTicket[] };
  return json.tickets;
}
