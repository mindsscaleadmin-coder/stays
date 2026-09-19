export interface HostMessageInboxRow {
  bookingId: string;
  bookingReference: string;
  guestName: string;
  guestEmail?: string;
  property: string;
  propertyPhoto?: string;
  checkIn: string;
  checkOut?: string;
  guestCount?: number;
  bookingStatus?: string;
  checkInStatus?: string;
  lastMessageBody: string;
  lastMessageAt: string;
  lastSenderRole: string;
  lastSenderName?: string;
}

export interface HostMessagesInboxPage {
  threads: HostMessageInboxRow[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
