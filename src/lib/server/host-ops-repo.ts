import { prisma } from "@/lib/prisma";
import {
  operationalStatusForBooking,
  operationalStatusForEventRequest,
} from "@/lib/host/operational-status";
import { opsSourceForRecord } from "@/lib/host/host-ops-adapter";
import type { HostBookingRecord } from "@/lib/host/host-booking-types";
import type {
  HostBookingOpsRecord,
  HostBookingOpsUpsertInput,
  HostOpsSourceRef,
  HostOpsSourceType,
} from "@/lib/host/host-ops-types";
import { isHostOpsSourceType } from "@/lib/host/host-ops-types";

type OpsRow = {
  id: string;
  hostId: string;
  sourceType: string;
  sourceId: string;
  assignedStaffId: string | null;
  privateNotes: string | null;
  completedAt: Date | null;
  updatedAt: Date;
};

function toRecord(row: OpsRow): HostBookingOpsRecord {
  return {
    id: row.id,
    hostId: row.hostId,
    sourceType: row.sourceType as HostOpsSourceType,
    sourceId: row.sourceId,
    assignedStaffId: row.assignedStaffId,
    privateNotes: row.privateNotes,
    completedAt: row.completedAt?.toISOString() ?? null,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export class HostOpsAccessError extends Error {
  constructor(message = "Not allowed") {
    super(message);
    this.name = "HostOpsAccessError";
  }
}

/**
 * Verifies the host owns the underlying booking or event enquiry.
 * Throws HostOpsAccessError when the source is missing or belongs to another host.
 */
export async function assertHostOwnsSource(
  hostId: string,
  sourceType: HostOpsSourceType,
  sourceId: string
): Promise<void> {
  if (sourceType === "booking") {
    const booking = await prisma.booking.findUnique({
      where: { id: sourceId },
      select: { listing: { select: { hostId: true } } },
    });
    if (!booking || booking.listing.hostId !== hostId) {
      throw new HostOpsAccessError();
    }
    return;
  }

  const request = await prisma.eventAvailabilityRequest.findUnique({
    where: { id: sourceId },
    select: { hostId: true },
  });
  if (!request || request.hostId !== hostId) {
    throw new HostOpsAccessError();
  }
}

async function assertStaffBelongsToHost(hostId: string, staffId: string): Promise<void> {
  const staff = await prisma.hostStaff.findFirst({
    where: { id: staffId, hostId, active: true },
    select: { id: true },
  });
  if (!staff) {
    throw new HostOpsAccessError("Invalid staff assignment");
  }
}

/**
 * Batch-load ops metadata for many sources in one query (avoids N+1 on host lists).
 */
export async function getOpsForSources(
  hostId: string,
  sources: HostOpsSourceRef[]
): Promise<Map<string, HostBookingOpsRecord>> {
  const map = new Map<string, HostBookingOpsRecord>();
  if (sources.length === 0) return map;

  const valid = sources.filter(
    (s) => isHostOpsSourceType(s.sourceType) && s.sourceId.trim().length > 0
  );
  if (valid.length === 0) return map;

  const rows = await prisma.hostBookingOps.findMany({
    where: {
      hostId,
      OR: valid.map((s) => ({
        sourceType: s.sourceType,
        sourceId: s.sourceId,
      })),
    },
  });

  for (const row of rows) {
    const key = `${row.sourceType}:${row.sourceId}`;
    map.set(key, toRecord(row));
  }

  return map;
}

export function opsMapKey(sourceType: HostOpsSourceType, sourceId: string): string {
  return `${sourceType}:${sourceId}`;
}

export async function getOpsForSource(
  hostId: string,
  sourceType: HostOpsSourceType,
  sourceId: string
): Promise<HostBookingOpsRecord | null> {
  const row = await prisma.hostBookingOps.findUnique({
    where: { sourceType_sourceId: { sourceType, sourceId } },
  });
  if (!row || row.hostId !== hostId) return null;
  return toRecord(row);
}

export async function upsertOps(
  hostId: string,
  sourceType: HostOpsSourceType,
  sourceId: string,
  input: HostBookingOpsUpsertInput
): Promise<HostBookingOpsRecord> {
  await assertHostOwnsSource(hostId, sourceType, sourceId);

  if (input.assignedStaffId) {
    await assertStaffBelongsToHost(hostId, input.assignedStaffId);
  }

  const completedAt =
    input.completedAt === undefined
      ? undefined
      : input.completedAt === null
        ? null
        : new Date(input.completedAt);

  const row = await prisma.hostBookingOps.upsert({
    where: { sourceType_sourceId: { sourceType, sourceId } },
    create: {
      hostId,
      sourceType,
      sourceId,
      assignedStaffId: input.assignedStaffId ?? null,
      privateNotes: input.privateNotes ?? null,
      completedAt: completedAt ?? null,
    },
    update: {
      ...(input.assignedStaffId !== undefined && {
        assignedStaffId: input.assignedStaffId,
      }),
      ...(input.privateNotes !== undefined && { privateNotes: input.privateNotes }),
      ...(input.completedAt !== undefined && { completedAt }),
    },
  });

  if (row.hostId !== hostId) {
    throw new HostOpsAccessError();
  }

  return toRecord(row);
}

export async function deleteOpsForSource(
  hostId: string,
  sourceType: HostOpsSourceType,
  sourceId: string
): Promise<void> {
  await assertHostOwnsSource(hostId, sourceType, sourceId);
  await prisma.hostBookingOps.deleteMany({
    where: { hostId, sourceType, sourceId },
  });
}

/** Batch-enrich host ops list rows with metadata (single query, no N+1). */
export async function enrichHostOpsListRows(
  hostId: string,
  bookings: HostBookingRecord[]
): Promise<HostBookingRecord[]> {
  if (bookings.length === 0) return bookings;

  const opsMap = await getOpsForSources(
    hostId,
    bookings.map((booking) => opsSourceForRecord(booking))
  );

  const staffIds = Array.from(
    new Set(
      Array.from(opsMap.values())
        .map((ops) => ops.assignedStaffId)
        .filter((id): id is string => Boolean(id))
    )
  );

  const staffNameById = new Map<string, string>();
  if (staffIds.length > 0) {
    const staffRows = await prisma.hostStaff.findMany({
      where: { hostId, id: { in: staffIds } },
      select: { id: true, name: true },
    });
    for (const row of staffRows) {
      staffNameById.set(row.id, row.name);
    }
  }

  return bookings.map((booking) => {
    const { sourceType, sourceId } = opsSourceForRecord(booking);
    const ops = opsMap.get(opsMapKey(sourceType, sourceId));
    const assignedStaffId = ops?.assignedStaffId ?? null;
    const operationalStatus =
      sourceType === "event_request"
        ? operationalStatusForEventRequest({
            status: booking.eventEnquiryStatus ?? booking.status,
            eventDate: booking.dateFlexible ? null : booking.checkIn,
            dateFlexible: Boolean(booking.dateFlexible),
            opsCompletedAt: ops?.completedAt,
          })
        : operationalStatusForBooking({
            status: booking.status,
            checkIn: booking.checkIn,
            checkOut: booking.checkOut,
            opsCompletedAt: ops?.completedAt,
          });
    return {
      ...booking,
      assignedStaffId,
      assignedStaffName: assignedStaffId
        ? staffNameById.get(assignedStaffId) ?? null
        : null,
      operationalStatus,
    };
  });
}

/** @deprecated Use enrichHostOpsListRows */
export async function enrichHostBookingsWithOps(
  hostId: string,
  bookings: HostBookingRecord[]
): Promise<HostBookingRecord[]> {
  return enrichHostOpsListRows(hostId, bookings);
}
