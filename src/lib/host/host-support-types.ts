export type SupportTicketStatus = "open" | "in_progress" | "escalated" | "resolved" | "closed";
export type SupportTicketPriority = "low" | "normal" | "high" | "critical";

export interface SupportTicketLog {
  id: string;
  type: string;
  at: string;
  staffName?: string;
  summary: string;
}

export interface SupportTicket {
  id: string;
  subject: string;
  message: string;
  status: SupportTicketStatus;
  priority?: SupportTicketPriority;
  createdAt: string;
  updatedAt?: string;
  bookingRef?: string;
  property?: string;
  assigneeStaffName?: string;
  communicationLogs?: SupportTicketLog[];
}

export interface HostSupportData {
  hostId: string;
  tickets: SupportTicket[];
}
