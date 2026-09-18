export interface GuestBookingHistoryRow {
  id: string;
  bookingReference?: string;
  property: string;
  checkIn: string;
  checkOut: string;
  status: string;
  bookedAt: string;
}

export interface HostGuestBookingSummary {
  guestId: string;
  totalBookings: number;
  completedBookings: number;
  upcomingBookings: number;
  cancelledBookings: number;
  /** 1-based index of the current booking with this host, chronologically. */
  bookingNumberWithHost: number | null;
  recentBookings: GuestBookingHistoryRow[];
}
