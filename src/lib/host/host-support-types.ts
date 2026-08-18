export type SupportTicketStatus = "open" | "in_progress" | "resolved";

export interface SupportTicket {
  id: string;
  subject: string;
  message: string;
  status: SupportTicketStatus;
  createdAt: string;
}

export interface HostSupportData {
  hostId: string;
  tickets: SupportTicket[];
}
