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

const SUPPORT_TICKETS_TTL_MS = 8_000;
const supportTicketsPull = new Map<
  string,
  {
    rows: FlatSupportTicket[] | null;
    at: number;
    inflight?: Promise<FlatSupportTicket[]>;
  }
>();

export async function fetchAdminSupportTicketsFromApi(
  hostId?: string,
  force = false
): Promise<FlatSupportTicket[]> {
  const key = hostId || "*";
  const cached = supportTicketsPull.get(key);
  if (!force && cached?.inflight) return cached.inflight;
  if (!force && cached && Date.now() - cached.at < SUPPORT_TICKETS_TTL_MS) {
    return cached.rows ?? [];
  }

  const inflight = (async () => {
    try {
      const qs = hostId ? `?hostId=${encodeURIComponent(hostId)}` : "";
      const res = await fetch(`/api/admin/support${qs}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load support tickets");
      const json = (await res.json()) as { tickets: FlatSupportTicket[] };
      const rows = json.tickets ?? [];
      supportTicketsPull.set(key, { rows, at: Date.now() });
      return rows;
    } catch {
      return cached?.rows ?? [];
    }
  })();

  supportTicketsPull.set(key, {
    rows: cached?.rows ?? null,
    at: cached?.at ?? 0,
    inflight,
  });
  return inflight;
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
