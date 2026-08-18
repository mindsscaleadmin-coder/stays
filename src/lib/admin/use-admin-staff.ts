"use client";

import { useCallback, useEffect, useState } from "react";
import {
  STAFF_SYNC_EVENT,
  loadStaffMembers,
  saveStaffMember,
  deleteStaffMember,
} from "./staff-data";
import {
  deleteAdminStaffViaApi,
  fetchAdminStaffFromApi,
  saveAdminStaffViaApi,
  shouldUseSharedAdminStaff,
} from "./staff-api";
import type { StaffMember, StaffMemberInput } from "./staff-types";

export function useAdminStaff() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [ready, setReady] = useState(false);
  const shared = shouldUseSharedAdminStaff();

  const refresh = useCallback(async () => {
    if (shared) {
      try {
        setStaff(await fetchAdminStaffFromApi());
        setReady(true);
        return;
      } catch {
        // fall through
      }
    }
    setStaff(loadStaffMembers());
    setReady(true);
  }, [shared]);

  useEffect(() => {
    void refresh();
    function onStorage(e: StorageEvent) {
      if (e.key === "farm-stays-admin-staff") void refresh();
    }
    window.addEventListener(STAFF_SYNC_EVENT, refresh);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(STAFF_SYNC_EVENT, refresh);
      window.removeEventListener("storage", onStorage);
    };
  }, [refresh]);

  return {
    ready,
    staff,
    save: async (input: StaffMemberInput) => {
      if (shared) {
        try {
          const nextMember = await saveAdminStaffViaApi(input);
          setStaff(await fetchAdminStaffFromApi());
          window.dispatchEvent(new Event(STAFF_SYNC_EVENT));
          return nextMember;
        } catch {
          // fall through
        }
      }
      const nextMember = saveStaffMember(input);
      setStaff(loadStaffMembers());
      return nextMember;
    },
    remove: async (id: string) => {
      if (shared) {
        try {
          const ok = await deleteAdminStaffViaApi(id);
          if (ok) {
            setStaff(await fetchAdminStaffFromApi());
            window.dispatchEvent(new Event(STAFF_SYNC_EVENT));
          }
          return ok;
        } catch {
          // fall through
        }
      }
      const ok = deleteStaffMember(id);
      if (ok) setStaff(loadStaffMembers());
      return ok;
    },
  };
}
