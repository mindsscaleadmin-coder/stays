/** Persisted ops row source — booking (stays/experiences) or directory event enquiry. */
export type HostOpsSourceType = "booking" | "event_request";

export const HOST_OPS_SOURCE_TYPES: HostOpsSourceType[] = ["booking", "event_request"];

/** Host-facing operational display state (does not replace internal booking status). */
export type OperationalStatus =
  | "confirmed"
  | "upcoming"
  | "in_progress"
  | "completed"
  | "cancelled";

export interface HostBookingOpsRecord {
  id: string;
  hostId: string;
  sourceType: HostOpsSourceType;
  sourceId: string;
  assignedStaffId: string | null;
  privateNotes: string | null;
  completedAt: string | null;
  updatedAt: string;
}

export interface HostBookingOpsUpsertInput {
  assignedStaffId?: string | null;
  privateNotes?: string | null;
  completedAt?: string | null;
}

export interface HostOpsSourceRef {
  sourceType: HostOpsSourceType;
  sourceId: string;
}

/** Minimal booking fields for operational status (pure function input). */
export interface BookingOperationalInput {
  status: string;
  checkIn: string;
  checkOut: string;
  opsCompletedAt?: string | null;
}

/** Minimal event enquiry fields for operational status (pure function input). */
export interface EventRequestOperationalInput {
  status: string;
  eventDate: string | null;
  dateFlexible: boolean;
  opsCompletedAt?: string | null;
}

export function isHostOpsSourceType(value: string): value is HostOpsSourceType {
  return HOST_OPS_SOURCE_TYPES.includes(value as HostOpsSourceType);
}
