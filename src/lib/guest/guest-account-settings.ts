const STORAGE_KEY = "farm-stays-guest-account-settings";

export interface GuestAccountSettings {
  emailNotifications: boolean;
  smsNotifications: boolean;
}

const DEFAULT_SETTINGS: GuestAccountSettings = {
  emailNotifications: true,
  smsNotifications: false,
};

export function loadGuestAccountSettings(userId: string): GuestAccountSettings {
  if (typeof window === "undefined") return { ...DEFAULT_SETTINGS };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const map = JSON.parse(raw) as Record<string, GuestAccountSettings>;
    return { ...DEFAULT_SETTINGS, ...(map[userId] ?? {}) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveGuestAccountSettings(
  userId: string,
  settings: GuestAccountSettings
): void {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const map = raw ? (JSON.parse(raw) as Record<string, GuestAccountSettings>) : {};
    map[userId] = settings;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}
