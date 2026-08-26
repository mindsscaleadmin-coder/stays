"use client";

import { useCallback, useEffect, useState } from "react";
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

export function useHostStaff(
  hostId: string | undefined,
  owner?: { name: string; email: string } | null
) {
  const [staff, setStaff] = useState<HostStaffMember[]>([]);
  const [ready, setReady] = useState(false);
  const shared = shouldUseSharedHostStaff();

  const refresh = useCallback(async () => {
    if (!hostId) {
      setStaff([]);
      setReady(true);
      return;
    }

    if (shared) {
      try {
        setStaff(await fetchHostStaffFromApi(hostId, owner));
        setReady(true);
        return;
      } catch {
        // fall through to localStorage
      }
    }

    if (owner?.email) {
      ensureHostOwnerStaff({
        hostId,
        name: owner.name,
        email: owner.email,
      });
    }
    setStaff(loadHostStaffMembers(hostId));
    setReady(true);
  }, [hostId, owner, shared]);

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

      if (shared) {
        try {
          const nextMember = await saveHostStaffViaApi(hostId, input);
          setStaff(await fetchHostStaffFromApi(hostId, owner));
          window.dispatchEvent(new Event(HOST_STAFF_SYNC_EVENT));
          return nextMember;
        } catch {
          // fall through
        }
      }

      const nextMember = saveHostStaffMember({ ...input, hostId });
      setStaff(loadHostStaffMembers(hostId));
      return nextMember;
    },
    remove: async (id: string) => {
      if (!hostId) return false;

      if (shared) {
        try {
          const ok = await deleteHostStaffViaApi(hostId, id);
          if (ok) {
            setStaff(await fetchHostStaffFromApi(hostId, owner));
            window.dispatchEvent(new Event(HOST_STAFF_SYNC_EVENT));
          }
          return ok;
        } catch {
          // fall through
        }
      }

      const ok = deleteHostStaffMember(hostId, id);
      if (ok) setStaff(loadHostStaffMembers(hostId));
      return ok;
    },
  };
}
