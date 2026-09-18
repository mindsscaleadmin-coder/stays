import { prisma } from "@/lib/prisma";
import { withAudit } from "@/lib/booking/booking-audit";
import type { HostBookingOpsRecord, HostBookingOpsUpsertInput } from "@/lib/host/host-ops-types";
import {
  getOpsForSource,
  HostOpsAccessError,
  upsertOps,
} from "@/lib/server/host-ops-repo";

async function staffName(staffId: string): Promise<string | undefined> {
  const row = await prisma.hostStaff.findUnique({
    where: { id: staffId },
    select: { name: true },
  });
  return row?.name;
}

/**
 * Updates host ops metadata for a booking and appends audit log entries when staff or notes change.
 */
export async function patchBookingOps(
  hostId: string,
  bookingId: string,
  input: HostBookingOpsUpsertInput,
  actorLabel: string
): Promise<HostBookingOpsRecord> {
  const before = await getOpsForSource(hostId, "booking", bookingId);

  const ops = await upsertOps(hostId, "booking", bookingId, input);

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { auditLog: true },
  });
  if (!booking) {
    throw new HostOpsAccessError();
  }

  let auditLog = booking.auditLog;

  if (
    input.assignedStaffId !== undefined &&
    input.assignedStaffId !== (before?.assignedStaffId ?? null)
  ) {
    if (!input.assignedStaffId) {
      auditLog = withAudit(auditLog, {
        actor: actorLabel,
        action: "Staff unassigned",
      });
    } else {
      const name = await staffName(input.assignedStaffId);
      auditLog = withAudit(auditLog, {
        actor: actorLabel,
        action: "Staff assigned",
        detail: name,
      });
    }
  }

  if (
    input.privateNotes !== undefined &&
    (input.privateNotes ?? "") !== (before?.privateNotes ?? "")
  ) {
    const hadNotes = Boolean(before?.privateNotes?.trim());
    const hasNotes = Boolean(input.privateNotes?.trim());
    auditLog = withAudit(auditLog, {
      actor: actorLabel,
      action: !hadNotes && hasNotes ? "Note added" : "Note updated",
    });
  }

  if (auditLog !== booking.auditLog) {
    await prisma.booking.update({
      where: { id: bookingId },
      data: { auditLog },
    });
  }

  return ops;
}

export async function getBookingOpsView(hostId: string, bookingId: string) {
  const ops = await getOpsForSource(hostId, "booking", bookingId);
  if (!ops?.assignedStaffId) {
    return { ops, assignedStaffName: null as string | null };
  }
  const assignedStaffName = (await staffName(ops.assignedStaffId)) ?? null;
  return { ops, assignedStaffName };
}

export async function patchEventOps(
  hostId: string,
  eventRequestId: string,
  input: HostBookingOpsUpsertInput
): Promise<HostBookingOpsRecord> {
  return upsertOps(hostId, "event_request", eventRequestId, input);
}

export async function getEventOpsView(hostId: string, eventRequestId: string) {
  const ops = await getOpsForSource(hostId, "event_request", eventRequestId);
  if (!ops?.assignedStaffId) {
    return { ops, assignedStaffName: null as string | null };
  }
  const assignedStaffName = (await staffName(ops.assignedStaffId)) ?? null;
  return { ops, assignedStaffName };
}
