import { isSharedDbEnabled } from "@/lib/shared-db";
import type { GuestVerificationRequest } from "./guest-verification-types";

export function shouldUseSharedGuestVerification() {
  return isSharedDbEnabled();
}

export async function fetchGuestVerificationFromApi(
  userId: string
): Promise<GuestVerificationRequest | null> {
  const res = await fetch(`/api/guests/${encodeURIComponent(userId)}/verification`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to load verification");
  const data = (await res.json()) as { request: GuestVerificationRequest | null };
  return data.request;
}

export async function submitGuestVerificationToApi(
  request: GuestVerificationRequest
): Promise<GuestVerificationRequest> {
  const res = await fetch(`/api/guests/${encodeURIComponent(request.userId)}/verification`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  if (!res.ok) throw new Error("Failed to submit verification");
  const data = (await res.json()) as { request: GuestVerificationRequest };
  return data.request;
}

export async function reviewGuestVerificationToApi(
  userId: string,
  status: "verified" | "rejected",
  reviewNote?: string
): Promise<GuestVerificationRequest> {
  const res = await fetch(`/api/guests/${encodeURIComponent(userId)}/verification`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status, reviewNote }),
  });
  if (!res.ok) throw new Error("Failed to review verification");
  const data = (await res.json()) as { request: GuestVerificationRequest };
  return data.request;
}
