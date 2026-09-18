import type {
  OperationalSettings,
  OperationalSettingsInput,
} from "./operational-settings-types";
import { DEFAULT_OPERATIONAL_TIMEZONE } from "./operational-timezone";

export const DEFAULT_OPERATIONAL_SETTINGS: OperationalSettings = {
  autoCheckInOutEnabled: true,
  checkInTime: "15:00",
  checkOutTime: "11:00",
  timezone: DEFAULT_OPERATIONAL_TIMEZONE,
  noShowCutoffTime: "17:00",
};

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isValidOperationalTime(value: string): boolean {
  return TIME_RE.test(value.trim());
}

export function mergeOperationalSettings(
  platformDefaults: OperationalSettings,
  hostOverride?: OperationalSettingsInput | null
): OperationalSettings {
  if (!hostOverride) return platformDefaults;
  return {
    autoCheckInOutEnabled:
      hostOverride.autoCheckInOutEnabled ?? platformDefaults.autoCheckInOutEnabled,
    checkInTime: hostOverride.checkInTime ?? platformDefaults.checkInTime,
    checkOutTime: hostOverride.checkOutTime ?? platformDefaults.checkOutTime,
    timezone: platformDefaults.timezone,
    noShowCutoffTime: hostOverride.noShowCutoffTime ?? platformDefaults.noShowCutoffTime,
  };
}

export function sanitizeOperationalSettingsInput(
  input: OperationalSettingsInput,
  current: OperationalSettings
): OperationalSettings {
  const next: OperationalSettings = { ...current };

  if (input.autoCheckInOutEnabled !== undefined) {
    next.autoCheckInOutEnabled = Boolean(input.autoCheckInOutEnabled);
  }
  if (input.checkInTime !== undefined) {
    if (!isValidOperationalTime(input.checkInTime)) {
      throw new Error("Check-in time must be HH:mm (24-hour).");
    }
    next.checkInTime = input.checkInTime.trim();
  }
  if (input.checkOutTime !== undefined) {
    if (!isValidOperationalTime(input.checkOutTime)) {
      throw new Error("Check-out time must be HH:mm (24-hour).");
    }
    next.checkOutTime = input.checkOutTime.trim();
  }
  if (input.noShowCutoffTime !== undefined) {
    if (!isValidOperationalTime(input.noShowCutoffTime)) {
      throw new Error("No-show cutoff must be HH:mm (24-hour).");
    }
    next.noShowCutoffTime = input.noShowCutoffTime.trim();
  }

  return next;
}

export function formatOperationalTimeLabel(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit" });
}
