"use client";

import { useCallback, useEffect, useState } from "react";
import {
  USERS_SYNC_EVENT,
  loadAllUsers,
  updateUserProfile,
  updateUserStatus,
} from "./user-data";
import type {
  AdminUserProfileInput,
  AdminUserRecord,
  UserAccountStatus,
} from "./user-types";

export function useAdminUsers() {
  const [users, setUsers] = useState<AdminUserRecord[]>([]);

  const refresh = useCallback(() => {
    setUsers(loadAllUsers());
  }, []);

  useEffect(() => {
    refresh();

    function onStorage(e: StorageEvent) {
      if (e.key === "farm-stays-admin-users") refresh();
    }

    window.addEventListener(USERS_SYNC_EVENT, refresh);
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener(USERS_SYNC_EVENT, refresh);
      window.removeEventListener("storage", onStorage);
    };
  }, [refresh]);

  return {
    users,
    refresh,
    setStatus: (id: string, status: UserAccountStatus) => {
      const ok = updateUserStatus(id, status);
      if (ok) refresh();
      return ok;
    },
    updateProfile: (id: string, input: AdminUserProfileInput) => {
      const ok = updateUserProfile(id, input);
      if (ok) refresh();
      return ok;
    },
    suspend: (id: string) => {
      const ok = updateUserStatus(id, "suspended");
      if (ok) refresh();
      return ok;
    },
    ban: (id: string) => {
      const ok = updateUserStatus(id, "banned");
      if (ok) refresh();
      return ok;
    },
    verify: (id: string) => {
      const ok = updateUserStatus(id, "verified");
      if (ok) refresh();
      return ok;
    },
    unsuspend: (id: string) => {
      const ok = updateUserStatus(id, "verified");
      if (ok) refresh();
      return ok;
    },
    reinstate: (id: string) => {
      const ok = updateUserStatus(id, "verified");
      if (ok) refresh();
      return ok;
    },
  };
}
