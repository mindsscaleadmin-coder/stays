export interface HostCustomerRow {
  guestId: string;
  guestName: string;
  guestEmail: string | null;
  guestPhone: string | null;
  bookingCount: number;
  enquiryCount: number;
  lastActivityAt: string;
}

export interface HostCustomersPage {
  customers: HostCustomerRow[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
