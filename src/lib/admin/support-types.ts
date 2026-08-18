export type TicketSource = "host" | "guest" | "dispute";

export type TicketPriority = "low" | "normal" | "high" | "critical";

export type TicketStatus = "open" | "in_progress" | "escalated" | "resolved" | "closed";

export type EscalationLevel = 0 | 1 | 2 | 3;

export type CommunicationLogType = "chat" | "call" | "email" | "note";

export interface CommunicationLog {
  id: string;
  type: CommunicationLogType;
  at: string;
  staffId?: string;
  staffName?: string;
  summary: string;
  durationMinutes?: number;
}

export interface SupportTicketRecord {
  id: string;
  source: TicketSource;
  subject: string;
  message: string;
  status: TicketStatus;
  priority: TicketPriority;
  escalationLevel: EscalationLevel;
  createdAt: string;
  updatedAt: string;
  requesterId: string;
  requesterName: string;
  requesterEmail?: string;
  assigneeStaffId?: string;
  assigneeStaffName?: string;
  assignedAt?: string;
  bookingRef?: string;
  property?: string;
  hostName?: string;
  communicationLogs: CommunicationLog[];
}

export interface FlatSupportTicket extends SupportTicketRecord {}
