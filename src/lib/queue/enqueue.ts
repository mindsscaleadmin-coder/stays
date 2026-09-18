import { safeAddJob } from "@/lib/queue/client";

export async function enqueueWelcomeEmailJob(input: {
  userId: string;
  email: string;
  fullName?: string;
}) {
  const queued = await safeAddJob("welcome-email", input);
  if (!queued) {
    const { deliverWelcomeEmail } = await import("@/lib/email/jobs");
    await deliverWelcomeEmail(input).catch(() => null);
  }
  return queued;
}

export async function enqueueBookingConfirmedJob(input: {
  bookingId: string;
  guestId: string;
}) {
  const queued = await safeAddJob("booking-confirmed", input);
  if (!queued) {
    const { deliverInvoiceEmail } = await import("@/lib/email/jobs");
    await deliverInvoiceEmail(input.bookingId).catch(() => null);
  }
  return queued;
}

export async function enqueueAuditLogJob(input: {
  action: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}) {
  return safeAddJob("audit-log", input);
}
