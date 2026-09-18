export type CheckInOutSource = "manual" | "auto";

export interface OperationalSettings {
  /** Master switch for timed auto check-in / check-out. */
  autoCheckInOutEnabled: boolean;
  /** HH:mm — expected guest arrival (house rules / guest comms). */
  checkInTime: string;
  /** HH:mm — auto check-out on departure day. */
  checkOutTime: string;
  /** IANA timezone — derived from listing country. */
  timezone: string;
  /** HH:mm — auto check-in runs here; mark no-show before this time. */
  noShowCutoffTime: string;
}

/** Host-editable fields — timezone is derived from listing country. */
export type OperationalSettingsInput = Partial<
  Omit<OperationalSettings, "timezone">
>;

export type OperationalTimezoneMeta = {
  timezone: string;
  countryName: string | null;
  iso2: string | null;
  derivedFromCountry: boolean;
};
