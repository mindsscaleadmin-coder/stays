export interface SeasonalPeriod {
  id: string;
  name: string;
  /** ISO date (year used for display; recurring yearly by month/day) */
  startDate: string;
  endDate: string;
  /** When true, property is closed during this window each year */
  closed: boolean;
  note?: string;
}

export interface ListingIcalFeed {
  id: string;
  name: string;
  url: string;
  lastSyncedAt?: string;
  lastError?: string;
}

export interface ListingAvailabilitySettings {
  listingId: string;
  blockedDates: string[];
  /** Dates pulled from inbound Airbnb / Booking.com feeds */
  icalImportedDates?: string[];
  seasonalPeriods: SeasonalPeriod[];
  minStayNights: number;
  advanceNoticeDays: number;
  /** Secret token for the public export URL */
  icalToken?: string;
  icalFeeds?: ListingIcalFeed[];
  /** Last successful iCal import timestamp */
  lastIcalImportAt?: string;
}

export type ListingAvailabilityInput = Omit<ListingAvailabilitySettings, "listingId">;
