"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { GUEST_SUPPORT_SYNC_EVENT } from "@/lib/guest/guest-support-data";
import { HOST_BOOKINGS_SYNC_EVENT } from "@/lib/host/host-booking-data";
import { HOST_SUPPORT_SYNC_EVENT } from "@/lib/host/host-support-data";
import { STAFF_SYNC_EVENT } from "@/lib/admin/staff-data";
import {
  SUPPORT_TICKETS_SYNC_EVENT,
  addCommunicationLog,
  assignTicket,
  countEscalatedTickets,
  countOpenTickets,
  countUnassignedTickets,
  escalateTicket,
  loadAllSupportTickets,
  updateTicketStatus,
} from "./support-data";
import type {
  CommunicationLogType,
  FlatSupportTicket,
  TicketSource,
  TicketStatus,
} from "./support-types";
import { loadStaffMembers } from "./staff-data";
import {
  fetchAdminStaffFromApi,
  shouldUseSharedAdminStaff,
} from "./staff-api";
import {
  fetchAdminSupportTicketsFromApi,
  patchAdminSupportViaApi,
  shouldUseSharedAdminSupport,
} from "./support-api";
import type { StaffMember } from "./staff-types";

export function useAdminSupport() {
  const [tickets, setTickets] = useState<FlatSupportTicket[]>([]);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [ready, setReady] = useState(false);
  const sharedStaff = shouldUseSharedAdminStaff();
  const sharedSupport = shouldUseSharedAdminSupport();

  const refresh = useCallback(() => {
    if (sharedSupport) {
      void fetchAdminSupportTicketsFromApi()
        .then(setTickets)
        .catch(() => setTickets(loadAllSupportTickets()));
    } else {
      setTickets(loadAllSupportTickets());
    }
    if (sharedStaff) {
      void fetchAdminStaffFromApi()
        .then(setStaffList)
        .catch(() => setStaffList(loadStaffMembers()));
    } else {
      setStaffList(loadStaffMembers());
    }
  }, [sharedStaff, sharedSupport]);

  useEffect(() => {
    refresh();
    setReady(true);
    function onSync() {
      refresh();
    }
    window.addEventListener(SUPPORT_TICKETS_SYNC_EVENT, refresh);
    window.addEventListener(HOST_SUPPORT_SYNC_EVENT, refresh);
    window.addEventListener(HOST_BOOKINGS_SYNC_EVENT, refresh);
    window.addEventListener(GUEST_SUPPORT_SYNC_EVENT, refresh);
    window.addEventListener(STAFF_SYNC_EVENT, refresh);
    window.addEventListener("storage", onSync);
    return () => {
      window.removeEventListener(SUPPORT_TICKETS_SYNC_EVENT, refresh);
      window.removeEventListener(HOST_SUPPORT_SYNC_EVENT, refresh);
      window.removeEventListener(HOST_BOOKINGS_SYNC_EVENT, refresh);
      window.removeEventListener(GUEST_SUPPORT_SYNC_EVENT, refresh);
      window.removeEventListener(STAFF_SYNC_EVENT, refresh);
      window.removeEventListener("storage", onSync);
    };
  }, [refresh]);

  const supportStaff = useMemo(
    () =>
      staffList.filter(
        (s) => s.active && (s.role === "support" || s.role === "admin" || s.role === "sub_admin")
      ),
    [staffList]
  );

  const openCount = useMemo(() => countOpenTickets(tickets), [tickets]);
  const escalatedCount = useMemo(() => countEscalatedTickets(tickets), [tickets]);
  const unassignedCount = useMemo(() => countUnassignedTickets(tickets), [tickets]);
  const badgeCount = openCount + escalatedCount;

  const runMutation = useCallback(
    (local: () => void, remote: () => Promise<unknown>) => {
      if (sharedSupport) {
        void remote().then(() => refresh()).catch(() => {
          local();
          refresh();
        });
        return;
      }
      local();
      refresh();
    },
    [refresh, sharedSupport]
  );

  return {
    ready,
    tickets,
    supportStaff,
    openCount,
    escalatedCount,
    unassignedCount,
    badgeCount,
    refresh,
    assign: (ticketId: string, staffId: string) => {
      runMutation(
        () => assignTicket(ticketId, staffId),
        () => patchAdminSupportViaApi({ action: "assign", ticketId, staffId })
      );
    },
    escalate: (ticketId: string, reason: string) => {
      runMutation(
        () => escalateTicket(ticketId, reason),
        () => patchAdminSupportViaApi({ action: "escalate", ticketId, reason })
      );
    },
    setStatus: (ticketId: string, status: TicketStatus) => {
      runMutation(
        () => updateTicketStatus(ticketId, status),
        () => patchAdminSupportViaApi({ action: "setStatus", ticketId, status })
      );
    },
    addLog: (
      ticketId: string,
      input: {
        type: CommunicationLogType;
        summary: string;
        staffId?: string;
        staffName?: string;
        durationMinutes?: number;
      }
    ) => {
      runMutation(
        () => addCommunicationLog(ticketId, input),
        () => patchAdminSupportViaApi({ action: "addLog", ticketId, ...input })
      );
    },
  };
}

export type { TicketSource, TicketStatus };
