import type {
  HostIdDocumentType,
  HostVerificationDocument,
  HostVerificationRequest,
  HostVerificationStatus,
} from "./verification-types";

import { emitSyncEvent } from "@/lib/emit-sync-event";
const STORAGE_KEY = "farm-stays-host-verification-requests";
export const HOST_VERIFICATION_SYNC_EVENT = "farm-stays-host-verification-updated";

function notify() {
  if (typeof window === "undefined") return;
  emitSyncEvent(HOST_VERIFICATION_SYNC_EVENT);
}

function readAll(): Record<string, HostVerificationRequest> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, HostVerificationRequest>;
  } catch {
    return {};
  }
}

function writeAll(map: Record<string, HostVerificationRequest>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  notify();
}

export function loadAllHostVerifications(): HostVerificationRequest[] {
  return Object.values(readAll()).sort(
    (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
  );
}

export function getHostVerification(hostId: string): HostVerificationRequest | null {
  return readAll()[hostId] ?? null;
}

export function findHostVerification(host: {
  id: string;
  email?: string;
  name?: string;
}): HostVerificationRequest | null {
  const all = readAll();
  if (all[host.id]) return all[host.id];
  const email = host.email?.toLowerCase();
  const name = host.name?.toLowerCase();
  return (
    Object.values(all).find(
      (r) =>
        (email && r.hostEmail.toLowerCase() === email) ||
        (name && r.hostName.toLowerCase() === name)
    ) ?? null
  );
}

export function getHostVerificationStatus(hostId: string): HostVerificationStatus {
  return getHostVerification(hostId)?.status ?? "none";
}

export function submitHostVerification(input: {
  hostId: string;
  hostName: string;
  hostEmail: string;
  idType: HostIdDocumentType;
  notes: string;
  documents: HostVerificationDocument[];
}): HostVerificationRequest {
  const request: HostVerificationRequest = {
    hostId: input.hostId,
    hostName: input.hostName,
    hostEmail: input.hostEmail,
    idType: input.idType,
    notes: input.notes.trim(),
    documents: input.documents,
    status: "pending",
    submittedAt: new Date().toISOString(),
  };
  const map = readAll();
  map[input.hostId] = request;
  writeAll(map);
  return request;
}

export function reviewHostVerification(
  hostId: string,
  status: "verified" | "rejected",
  reviewNote?: string
): HostVerificationRequest | null {
  const map = readAll();
  const existing = map[hostId];
  if (!existing) return null;
  const updated: HostVerificationRequest = {
    ...existing,
    status,
    reviewedAt: new Date().toISOString(),
    reviewNote: reviewNote?.trim() || undefined,
  };
  map[hostId] = updated;
  writeAll(map);
  return updated;
}

export function idTypeLabel(idType: HostIdDocumentType): string {
  switch (idType) {
    case "emirates_id":
      return "Emirates ID";
    case "passport":
      return "Passport";
    case "trade_license":
      return "Trade license";
    default:
      return idType;
  }
}
