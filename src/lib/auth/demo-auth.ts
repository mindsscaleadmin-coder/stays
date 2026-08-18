import type { GuestUser } from "./types";

const STORAGE_KEY = "farm-stays-demo-user";

export function getDemoUser(): GuestUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as GuestUser) : null;
  } catch {
    return null;
  }
}

export function setDemoUser(user: GuestUser): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
}

export function clearDemoUser(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function createDemoUser(input: {
  email: string;
  fullName: string;
  phone?: string;
  country?: string;
  language?: "en";
  roles?: string[];
}): GuestUser {
  const normalizedEmail = input.email.trim().toLowerCase();
  const stableIdSource = normalizedEmail || input.fullName.trim().toLowerCase() || "guest";
  const stableId = stableIdSource.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

  return {
    id: `demo-${stableId || "guest"}`,
    email: input.email,
    fullName: input.fullName,
    phone: input.phone,
    country: input.country,
    roles: input.roles ?? ["guest"],
    language: input.language ?? "en",
  };
}

export function updateDemoUser(updates: Partial<GuestUser>): GuestUser | null {
  const current = getDemoUser();
  if (!current) return null;
  const updated = { ...current, ...updates };
  setDemoUser(updated);
  return updated;
}
