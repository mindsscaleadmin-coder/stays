import { resolveBookingHost } from "@/lib/admin/booking-oversight-utils";
import { loadStaffMembers } from "@/lib/admin/staff-data";
import { loadHostBookings } from "@/lib/host/host-booking-data";
import type { SupportTicketStatus } from "@/lib/host/host-support-types";
import type {
  CommunicationLog,
  CommunicationLogType,
  EscalationLevel,
  FlatSupportTicket,
  SupportTicketRecord,
  TicketPriority,
  TicketSource,
  TicketStatus,
} from "./support-types";

import { emitSyncCustomEvent } from "@/lib/emit-sync-event";
const STORAGE_KEY = "farm-stays-support-tickets";
export const SUPPORT_TICKETS_SYNC_EVENT = "farm-stays-support-tickets-updated";

const HOST_NAMES: Record<string, string> = {
  "seed-host-4": "Ahmed Al Farsi",
  "seed-host-5": "Sara Khan",
  "demo-host": "Demo Host",
  "U-001": "Ahmed Al Farsi",
};

export const DEFAULT_SUPPORT_TICKETS: SupportTicketRecord[] = [
  {
    id: "TKT-H-1001",
    source: "host",
    subject: "Payout delayed for July bookings",
    message:
      "My payout for booking GF-M9O2T4 has been pending for 5 days. Please check the status.",
    status: "open",
    priority: "high",
    escalationLevel: 0,
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    requesterId: "seed-host-4",
    requesterName: "Ahmed Al Farsi",
    requesterEmail: "ahmed@example.com",
    communicationLogs: [],
  },
  {
    id: "TKT-H-1002",
    source: "host",
    subject: "Listing photos not updating",
    message: "Uploaded new gallery photos yesterday but the public listing still shows old images.",
    status: "in_progress",
    priority: "normal",
    escalationLevel: 0,
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    requesterId: "seed-host-5",
    requesterName: "Sara Khan",
    requesterEmail: "sara@example.com",
    assigneeStaffId: "STF-003",
    assigneeStaffName: "Layla Support",
    assignedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    communicationLogs: [
      {
        id: "log-1",
        type: "chat",
        at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        staffId: "STF-003",
        staffName: "Layla Support",
        summary: "Asked host to hard-refresh and clear CDN cache. Monitoring for 24h.",
      },
    ],
  },
  {
    id: "TKT-G-2001",
    source: "guest",
    subject: "Refund not received after cancellation",
    message:
      "Cancelled booking GF-L3P8R5 two weeks ago. Host confirmed refund but amount not on my card.",
    status: "open",
    priority: "high",
    escalationLevel: 0,
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    requesterId: "U-002",
    requesterName: "Fatima Al Zaabi",
    requesterEmail: "fatima@example.com",
    bookingRef: "GF-L3P8R5",
    property: "Green Valley Farmhouse",
    communicationLogs: [],
  },
  {
    id: "TKT-G-2002",
    source: "guest",
    subject: "Cannot modify booking dates",
    message: "App shows an error when I try to change check-in from Aug 16 to Aug 18.",
    status: "resolved",
    priority: "low",
    escalationLevel: 0,
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    requesterId: "U-004",
    requesterName: "Priya Sharma",
    requesterEmail: "priya@example.com",
    assigneeStaffId: "STF-003",
    assigneeStaffName: "Layla Support",
    assignedAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
    communicationLogs: [
      {
        id: "log-2",
        type: "call",
        at: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
        staffId: "STF-003",
        staffName: "Layla Support",
        summary: "Walked guest through date change on mobile. Issue was cached session.",
        durationMinutes: 8,
      },
    ],
  },
];

function dispatchSync() {
  if (typeof window !== "undefined") {
    emitSyncCustomEvent(SUPPORT_TICKETS_SYNC_EVENT);
  }
}

function readTickets(): SupportTicketRecord[] {
  if (typeof window === "undefined") return [...DEFAULT_SUPPORT_TICKETS];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [...DEFAULT_SUPPORT_TICKETS];
    const parsed = JSON.parse(raw) as SupportTicketRecord[];
    return parsed.length > 0 ? parsed : [...DEFAULT_SUPPORT_TICKETS];
  } catch {
    return [...DEFAULT_SUPPORT_TICKETS];
  }
}

function writeTickets(tickets: SupportTicketRecord[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets));
  dispatchSync();
}

export function newTicketId(prefix: string): string {
  return `TKT-${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
}

export function newLogId(): string {
  return `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

function mapHostStatus(status: TicketStatus): SupportTicketStatus {
  if (status === "escalated") return "in_progress";
  if (status === "closed") return "resolved";
  return status as SupportTicketStatus;
}

/** Host-facing ticket list — synced from central store */
export function loadHostTicketsFlat(hostId: string): {
  id: string;
  subject: string;
  message: string;
  status: SupportTicketStatus;
  createdAt: string;
}[] {
  return loadAllSupportTickets()
    .filter((t) => t.source === "host" && t.requesterId === hostId)
    .map((t) => ({
      id: t.id,
      subject: t.subject,
      message: t.message,
      status: mapHostStatus(t.status),
      createdAt: t.createdAt,
    }))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/** Guest-facing ticket list — synced from central store */
export function loadGuestTicketsFlat(guestId: string): {
  id: string;
  subject: string;
  message: string;
  status: SupportTicketStatus;
  createdAt: string;
  bookingRef?: string;
  property?: string;
}[] {
  return loadAllSupportTickets()
    .filter((t) => t.source === "guest" && t.requesterId === guestId)
    .map((t) => ({
      id: t.id,
      subject: t.subject,
      message: t.message,
      status: mapHostStatus(t.status),
      createdAt: t.createdAt,
      bookingRef: t.bookingRef,
      property: t.property,
    }))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

function syncDisputeTickets(tickets: SupportTicketRecord[]): SupportTicketRecord[] {
  const bookings = loadHostBookings().map(resolveBookingHost);
  const byBooking = new Map(
    tickets.filter((t) => t.bookingRef).map((t) => [t.bookingRef!, t])
  );
  let next = [...tickets];

  for (const booking of bookings) {
    if (booking.disputeStatus !== "open") continue;
    const reference = booking.bookingReference || booking.id;
    const existing = byBooking.get(reference) ?? byBooking.get(booking.id);
    if (existing) {
      next = next.map((t) => {
        if (t.id !== existing.id) return t;
        const patched: SupportTicketRecord = {
          ...t,
          subject: `Dispute: ${booking.disputeSummary ?? booking.property}`,
          message: booking.disputeGuestClaim ?? booking.disputeSummary ?? t.message,
          status: t.status === "resolved" || t.status === "closed" ? t.status : "escalated",
          priority: "critical",
          escalationLevel: Math.max(t.escalationLevel, 1) as EscalationLevel,
          property: booking.property,
          hostName: booking.hostName,
        };
        // Avoid bumping updatedAt when nothing changed — that caused a write/sync/fetch loop.
        const { updatedAt: _a, ...before } = t;
        const { updatedAt: _b, ...after } = patched;
        if (JSON.stringify(before) === JSON.stringify(after)) return t;
        return { ...patched, updatedAt: new Date().toISOString() };
      });
      continue;
    }

    const disputeTicket: SupportTicketRecord = {
      id: newTicketId("DSP"),
      source: "dispute",
      subject: `Dispute: ${booking.disputeSummary ?? booking.property}`,
      message: booking.disputeGuestClaim ?? booking.disputeSummary ?? "Booking dispute opened",
      status: "escalated",
      priority: "critical",
      escalationLevel: 1,
      createdAt: booking.disputeOpenedAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      requesterId: booking.guestEmail,
      requesterName: booking.guest,
      requesterEmail: booking.guestEmail,
      bookingRef: reference,
      property: booking.property,
      hostName: booking.hostName,
      communicationLogs: [
        {
          id: newLogId(),
          type: "note",
          at: booking.disputeOpenedAt ?? new Date().toISOString(),
          summary: `Auto-created from open booking dispute. Host response: ${booking.disputeHostResponse ?? "Pending"}`,
        },
      ],
    };
    next = [disputeTicket, ...next];
    byBooking.set(reference, disputeTicket);
  }

  return next;
}

export function loadAllSupportTickets(opts?: { persist?: boolean }): FlatSupportTicket[] {
  const raw = readTickets();
  const synced = syncDisputeTickets(raw);
  const persist = opts?.persist ?? true;
  if (persist && typeof window !== "undefined" && JSON.stringify(synced) !== JSON.stringify(raw)) {
    writeTickets(synced);
  }
  return synced.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export function createSupportTicket(input: {
  source: TicketSource;
  subject: string;
  message: string;
  requesterId: string;
  requesterName: string;
  requesterEmail?: string;
  bookingRef?: string;
  property?: string;
  priority?: TicketPriority;
}): SupportTicketRecord {
  const now = new Date().toISOString();
  const ticket: SupportTicketRecord = {
    id: newTicketId(input.source === "host" ? "H" : input.source === "guest" ? "G" : "DSP"),
    source: input.source,
    subject: input.subject.trim(),
    message: input.message.trim(),
    status: "open",
    priority: input.priority ?? "normal",
    escalationLevel: 0,
    createdAt: now,
    updatedAt: now,
    requesterId: input.requesterId,
    requesterName: input.requesterName,
    requesterEmail: input.requesterEmail,
    bookingRef: input.bookingRef,
    property: input.property,
    communicationLogs: [],
  };
  writeTickets([ticket, ...readTickets()]);
  return ticket;
}

export function assignTicket(ticketId: string, staffId: string): SupportTicketRecord | null {
  const staff = loadStaffMembers().find((s) => s.id === staffId && s.active);
  if (!staff) return null;
  const now = new Date().toISOString();
  let updated: SupportTicketRecord | null = null;
  const next = readTickets().map((t) => {
    if (t.id !== ticketId) return t;
    updated = {
      ...t,
      assigneeStaffId: staff.id,
      assigneeStaffName: staff.name,
      assignedAt: now,
      status: t.status === "open" ? "in_progress" : t.status,
      updatedAt: now,
      communicationLogs: [
        {
          id: newLogId(),
          type: "note",
          at: now,
          staffId: staff.id,
          staffName: staff.name,
          summary: `Ticket assigned to ${staff.name}`,
        },
        ...t.communicationLogs,
      ],
    };
    return updated;
  });
  if (!updated) return null;
  writeTickets(next);
  return updated;
}

export function escalateTicket(
  ticketId: string,
  reason: string,
  actorName = "Admin"
): SupportTicketRecord | null {
  const now = new Date().toISOString();
  let updated: SupportTicketRecord | null = null;
  const next = readTickets().map((t) => {
    if (t.id !== ticketId) return t;
    const nextLevel = Math.min(3, t.escalationLevel + 1) as EscalationLevel;
    updated = {
      ...t,
      escalationLevel: nextLevel,
      status: "escalated",
      priority: nextLevel >= 2 ? "critical" : t.priority === "low" ? "normal" : t.priority,
      updatedAt: now,
      communicationLogs: [
        {
          id: newLogId(),
          type: "note",
          at: now,
          staffName: actorName,
          summary: `Escalated to L${nextLevel}: ${reason}`,
        },
        ...t.communicationLogs,
      ],
    };
    return updated;
  });
  if (!updated) return null;
  writeTickets(next);
  return updated;
}

export function updateTicketStatus(ticketId: string, status: TicketStatus): SupportTicketRecord | null {
  const now = new Date().toISOString();
  let updated: SupportTicketRecord | null = null;
  const next = readTickets().map((t) => {
    if (t.id !== ticketId) return t;
    updated = { ...t, status, updatedAt: now };
    return updated;
  });
  if (!updated) return null;
  writeTickets(next);
  return updated;
}

export function addCommunicationLog(
  ticketId: string,
  input: {
    type: CommunicationLogType;
    summary: string;
    staffId?: string;
    staffName?: string;
    durationMinutes?: number;
  }
): SupportTicketRecord | null {
  const now = new Date().toISOString();
  let updated: SupportTicketRecord | null = null;
  const next = readTickets().map((t) => {
    if (t.id !== ticketId) return t;
    const log: CommunicationLog = {
      id: newLogId(),
      type: input.type,
      at: now,
      staffId: input.staffId,
      staffName: input.staffName,
      summary: input.summary.trim(),
      durationMinutes: input.durationMinutes,
    };
    updated = {
      ...t,
      updatedAt: now,
      communicationLogs: [log, ...t.communicationLogs],
    };
    return updated;
  });
  if (!updated) return null;
  writeTickets(next);
  return updated;
}

export function countOpenTickets(tickets: FlatSupportTicket[] = loadAllSupportTickets()): number {
  return tickets.filter((t) => t.status === "open" || t.status === "in_progress").length;
}

export function countEscalatedTickets(tickets: FlatSupportTicket[] = loadAllSupportTickets()): number {
  return tickets.filter((t) => t.status === "escalated" || t.escalationLevel >= 1).length;
}

export function countUnassignedTickets(tickets: FlatSupportTicket[] = loadAllSupportTickets()): number {
  return tickets.filter(
    (t) => !t.assigneeStaffId && t.status !== "resolved" && t.status !== "closed"
  ).length;
}

export function resolveHostDisplayName(hostId: string): string {
  return HOST_NAMES[hostId] ?? hostId;
}
