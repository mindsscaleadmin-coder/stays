import {
  createSupportTicket as createCentralTicket,
  loadHostTicketsFlat,
  resolveHostDisplayName,
} from "@/lib/admin/support-data";
import type { HostSupportData, SupportTicket } from "./host-support-types";
import { emitSyncEvent } from "@/lib/emit-sync-event";

export const HOST_SUPPORT_SYNC_EVENT = "farm-stays-host-support-updated";

export function loadHostSupport(hostId: string): HostSupportData {
  return { hostId, tickets: loadHostTicketsFlat(hostId) as SupportTicket[] };
}

export function createSupportTicket(
  hostId: string,
  subject: string,
  message: string,
  hostName?: string
): HostSupportData {
  createCentralTicket({
    source: "host",
    subject,
    message,
    requesterId: hostId,
    requesterName: hostName ?? resolveHostDisplayName(hostId),
    priority: "normal",
  });
  if (typeof window !== "undefined") {
    emitSyncEvent(HOST_SUPPORT_SYNC_EVENT);
  }
  return loadHostSupport(hostId);
}
