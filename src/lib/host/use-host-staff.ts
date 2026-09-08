"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  HOST_STAFF_SYNC_EVENT,
  deleteHostStaffMember,
  ensureHostOwnerStaff,
  loadHostStaffMembers,
  saveHostStaffMember,
} from "./host-staff-data";
import {
  deleteHostStaffViaApi,
  fetchHostStaffFromApi,
  saveHostStaffViaApi,
  shouldUseSharedHostStaff,
} from "./host-staff-api";
import type { HostStaffMember, HostStaffMemberInput } from "./host-staff-types";

function staffFingerprint(rows: HostStaffMember[]): string {
  return rows
    .map(
      (row) =>
        `${row.id}:${row.role}:${row.active ? 1 : 0}:${row.permissions.join(",")}:${row.name}`
    )
    .join("|");
}

export function useHostStaff(
  hostId: string | undefined,
  owner?: { name: string; email: string } | null
) {
  const [staff, setStaff] = useState<HostStaffMember[]>([]);
  const [ready, setReady] = useState(false);
  const shared = shouldUseSharedHostStaff();
  const ownerName = owner?.name ?? "";
  const ownerEmail = owner?.email ?? "";
  const inflightRef = useRef<Promise<void> | null>(null);
  const fingerprintRef = useRef("");

  const applyStaff = useCallback((rows: HostStaffMember[]) => {
    const next = staffFingerprint(rows);
    if (next === fingerprintRef.current) return;
    fingerprintRef.current = next;
    setStaff(rows);
  }, []);

  const refresh = useCallback(async () => {
    if (!hostId) {
      fingerprintRef.current = "";
      setStaff([]);
      setReady(true);
      return;
    }

    if (inflightRef.current) {
      await inflightRef.current;
      return;
    }

    const ownerPayload =
      ownerEmail.trim().length > 0
        ? { name: ownerName, email: ownerEmail }
        : null;

    const run = (async () => {
      if (shared) {
        try {
          applyStaff(await fetchHostStaffFromApi(hostId, ownerPayload));
          setReady(true);
          return;
        } catch {
          // fall through to localStorage
        }
      }

      if (ownerPayload) {
        ensureHostOwnerStaff({
          hostId,
          name: ownerPayload.name,
          email: ownerPayload.email,
        });
      }
      applyStaff(loadHostStaffMembers(hostId));
      setReady(true);
    })();

    inflightRef.current = run.finally(() => {
      inflightRef.current = null;
    });
    await inflightRef.current;
  }, [hostId, ownerName, ownerEmail, shared, applyStaff]);

  useEffect(() => {
    void refresh();
    function onStorage(e: StorageEvent) {
      if (e.key === "farm-stays-host-staff") void refresh();
    }
    window.addEventListener(HOST_STAFF_SYNC_EVENT, refresh);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(HOST_STAFF_SYNC_EVENT, refresh);
      window.removeEventListener("storage", onStorage);
    };
  }, [refresh]);

  return {
    ready,
    staff,
    save: async (input: Omit<HostStaffMemberInput, "hostId"> & { hostId?: string }) => {
      if (!hostId) throw new Error("Missing host id");
      const ownerPayload = ownerEmail
        ? { name: ownerName, email: ownerEmail }
        : null;

      if (shared) {
        try {
          const nextMember = await saveHostStaffViaApi(hostId, input);
          applyStaff(await fetchHostStaffFromApi(hostId, ownerPayload));
          window.dispatchEvent(new Event(HOST_STAFF_SYNC_EVENT));
          return nextMember;
        } catch {
          // fall through
        }
      }

      const nextMember = saveHostStaffMember({ ...input, hostId });
      applyStaff(loadHostStaffMembers(hostId));
      return nextMember;
    },
    remove: async (id: string) => {
      if (!hostId) return false;
      const ownerPayload = ownerEmail
        ? { name: ownerName, email: ownerEmail }
        : null;

      if (shared) {
        try {
          const ok = await deleteHostStaffViaApi(hostId, id);
          if (ok) {
            applyStaff(await fetchHostStaffFromApi(hostId, ownerPayload));
            window.dispatchEvent(new Event(HOST_STAFF_SYNC_EVENT));
          }
          return ok;
        } catch {
          // fall through
        }
      }

      const ok = deleteHostStaffMember(hostId, id);
      if (ok) applyStaff(loadHostStaffMembers(hostId));
      return ok;
    },
  };
}
