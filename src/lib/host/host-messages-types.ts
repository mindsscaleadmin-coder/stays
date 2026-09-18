export interface HostMessageInboxRow {
  bookingId: string;
  bookingReference: string;
  guestName: string;
  property: string;
  checkIn: string;
  lastMessageBody: string;
  lastMessageAt: string;
  lastSenderRole: string;
}

export interface HostMessagesInboxPage {
  threads: HostMessageInboxRow[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
