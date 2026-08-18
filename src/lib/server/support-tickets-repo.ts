import {
  getSupportTicketsFromDb,
  saveSupportTicketsToDb,
} from "@/lib/server/platform-catalog-repo";
import { listPlatformStaff } from "@/lib/server/platform-staff-repo";
import type {
  CommunicationLog,
  CommunicationLogType,
  EscalationLevel,
  SupportTicketRecord,
  TicketPriority,
  TicketSource,
  TicketStatus,
} from "@/lib/admin/support-types";

export function newTicketId(prefix: string): string {
  return `TKT-${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
}

function newLogId(): string {
  return `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

export async function listSupportTickets(hostId?: string): Promise<SupportTicketRecord[]> {
  const tickets = await getSupportTicketsFromDb();
  const sorted = [...tickets].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
  if (!hostId) return sorted;
  return sorted.filter((t) => t.source === "host" && t.requesterId === hostId);
}

export async function listGuestSupportTickets(
  guestId: string
): Promise<SupportTicketRecord[]> {
  const tickets = await getSupportTicketsFromDb();
  return tickets
    .filter((t) => t.source === "guest" && t.requesterId === guestId)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

async function writeTickets(
  updater: (tickets: SupportTicketRecord[]) => SupportTicketRecord[]
): Promise<SupportTicketRecord[]> {
  const current = await getSupportTicketsFromDb();
  const next = updater(current);
  await saveSupportTicketsToDb(next);
  return next;
}

export async function createSupportTicketInDb(input: {
  source: TicketSource;
  subject: string;
  message: string;
  requesterId: string;
  requesterName: string;
  requesterEmail?: string;
  bookingRef?: string;
  property?: string;
  priority?: TicketPriority;
}): Promise<SupportTicketRecord> {
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
  await writeTickets((tickets) => [ticket, ...tickets]);
  return ticket;
}

export async function assignTicketInDb(
  ticketId: string,
  staffId: string
): Promise<SupportTicketRecord | null> {
  const staffList = await listPlatformStaff();
  const staff = staffList.find((s) => s.id === staffId && s.active);
  if (!staff) return null;
  const now = new Date().toISOString();
  let updated: SupportTicketRecord | null = null;
  await writeTickets((tickets) =>
    tickets.map((t) => {
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
    })
  );
  return updated;
}

export async function escalateTicketInDb(
  ticketId: string,
  reason: string,
  actorName = "Admin"
): Promise<SupportTicketRecord | null> {
  const now = new Date().toISOString();
  let updated: SupportTicketRecord | null = null;
  await writeTickets((tickets) =>
    tickets.map((t) => {
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
    })
  );
  return updated;
}

export async function updateTicketStatusInDb(
  ticketId: string,
  status: TicketStatus
): Promise<SupportTicketRecord | null> {
  const now = new Date().toISOString();
  let updated: SupportTicketRecord | null = null;
  await writeTickets((tickets) =>
    tickets.map((t) => {
      if (t.id !== ticketId) return t;
      updated = { ...t, status, updatedAt: now };
      return updated;
    })
  );
  return updated;
}

export async function addCommunicationLogInDb(
  ticketId: string,
  input: {
    type: CommunicationLogType;
    summary: string;
    staffId?: string;
    staffName?: string;
    durationMinutes?: number;
  }
): Promise<SupportTicketRecord | null> {
  const now = new Date().toISOString();
  let updated: SupportTicketRecord | null = null;
  await writeTickets((tickets) =>
    tickets.map((t) => {
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
    })
  );
  return updated;
}
