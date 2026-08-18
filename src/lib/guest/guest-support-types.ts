export type GuestSupportTicketStatus = "open" | "in_progress" | "resolved";

export interface GuestSupportTicket {
  id: string;
  subject: string;
  message: string;
  status: GuestSupportTicketStatus;
  createdAt: string;
  bookingRef?: string;
  property?: string;
}

export interface GuestSupportData {
  guestId: string;
  tickets: GuestSupportTicket[];
}
