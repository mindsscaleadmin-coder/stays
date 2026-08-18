import { safeAddJob } from "@/lib/queue/client";

export async function enqueueWelcomeEmailJob(input: {
  userId: string;
  email: string;
  fullName?: string;
}) {
  return safeAddJob("welcome-email", input);
}

export async function enqueueBookingConfirmedJob(input: {
  bookingId: string;
  guestId: string;
}) {
  return safeAddJob("booking-confirmed", input);
}

export async function enqueueAuditLogJob(input: {
  action: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}) {
  return safeAddJob("audit-log", input);
}
