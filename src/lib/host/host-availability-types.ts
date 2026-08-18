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

export interface ListingAvailabilitySettings {
  listingId: string;
  blockedDates: string[];
  seasonalPeriods: SeasonalPeriod[];
  minStayNights: number;
  advanceNoticeDays: number;
  /** Last successful iCal import timestamp */
  lastIcalImportAt?: string;
}

export type ListingAvailabilityInput = Omit<ListingAvailabilitySettings, "listingId">;
