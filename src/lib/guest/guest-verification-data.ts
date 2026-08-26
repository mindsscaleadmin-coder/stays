import { emitSyncEvent } from "@/lib/emit-sync-event";
import type {
  GuestIdDocumentType,
  GuestVerificationRequest,
  GuestVerificationStatus,
} from "./guest-verification-types";

const STORAGE_KEY = "farm-stays-verification-requests";
export const GUEST_VERIFICATION_SYNC_EVENT = "farm-stays-guest-verification-updated";

function notify() {
  if (typeof window === "undefined") return;
  emitSyncEvent(GUEST_VERIFICATION_SYNC_EVENT);
}

function readAll(): Record<string, GuestVerificationRequest | GuestVerificationStatus> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, GuestVerificationRequest | GuestVerificationStatus>;
  } catch {
    return {};
  }
}

function writeAll(map: Record<string, GuestVerificationRequest>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  notify();
}

function normalize(
  userId: string,
  raw: GuestVerificationRequest | GuestVerificationStatus | undefined
): GuestVerificationRequest | null {
  if (!raw) return null;
  if (typeof raw === "string") {
    if (raw === "none") return null;
    return {
      userId,
      idType: "emirates_id",
      notes: "",
      status: raw,
      submittedAt: new Date().toISOString(),
    };
  }
  return raw;
}

export function getGuestVerification(userId: string): GuestVerificationRequest | null {
  return normalize(userId, readAll()[userId]);
}

export function getGuestVerificationStatus(userId: string): GuestVerificationStatus {
  return getGuestVerification(userId)?.status ?? "none";
}

export function submitGuestVerification(input: {
  userId: string;
  idType: GuestIdDocumentType;
  notes: string;
}): GuestVerificationRequest {
  const request: GuestVerificationRequest = {
    userId: input.userId,
    idType: input.idType,
    notes: input.notes.trim(),
    status: "pending",
    submittedAt: new Date().toISOString(),
  };
  const next: Record<string, GuestVerificationRequest> = {};
  for (const [id, raw] of Object.entries(readAll())) {
    const item = normalize(id, raw);
    if (item) next[id] = item;
  }
  next[input.userId] = request;
  writeAll(next);
  return request;
}
