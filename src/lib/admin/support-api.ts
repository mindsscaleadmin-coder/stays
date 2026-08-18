import type {
  CommunicationLogType,
  FlatSupportTicket,
  SupportTicketRecord,
  TicketPriority,
  TicketSource,
  TicketStatus,
} from "./support-types";
import { isSharedDbEnabled } from "@/lib/shared-db";

export function shouldUseSharedAdminSupport() {
  return isSharedDbEnabled();
}

export async function fetchAdminSupportTicketsFromApi(
  hostId?: string
): Promise<FlatSupportTicket[]> {
  const qs = hostId ? `?hostId=${encodeURIComponent(hostId)}` : "";
  const res = await fetch(`/api/admin/support${qs}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load support tickets");
  const json = (await res.json()) as { tickets: FlatSupportTicket[] };
  return json.tickets;
}

export type SupportTicketAction =
  | { action: "assign"; ticketId: string; staffId: string }
  | { action: "escalate"; ticketId: string; reason: string; actorName?: string }
  | { action: "setStatus"; ticketId: string; status: TicketStatus }
  | {
      action: "addLog";
      ticketId: string;
      type: CommunicationLogType;
      summary: string;
      staffId?: string;
      staffName?: string;
      durationMinutes?: number;
    }
  | {
      action: "create";
      source: TicketSource;
      subject: string;
      message: string;
      requesterId: string;
      requesterName: string;
      requesterEmail?: string;
      bookingRef?: string;
      property?: string;
      priority?: TicketPriority;
    };

export async function patchAdminSupportViaApi(
  body: SupportTicketAction
): Promise<{ ticket?: SupportTicketRecord; tickets?: FlatSupportTicket[] }> {
  const res = await fetch("/api/admin/support", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const payload = (await res.json()) as { error?: string };
    throw new Error(payload.error || "Support update failed");
  }
  return (await res.json()) as { ticket?: SupportTicketRecord; tickets?: FlatSupportTicket[] };
}
