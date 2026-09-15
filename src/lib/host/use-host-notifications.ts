"use client";

import { useCallback, useEffect, useState } from "react";
import {
  HOST_NOTIFICATIONS_SYNC_EVENT,
  loadHostNotifications,
  markAlertRead,
  markAllAlertsRead,
  saveNotificationPrefs,
} from "./host-notifications-data";
import {
  fetchHostNotificationsFromApi,
  markAlertReadViaApi,
  markAllAlertsReadViaApi,
  saveNotificationPrefsViaApi,
  shouldUseSharedHostNotifications,
} from "./host-notifications-api";
import type { HostNotificationsData, HostNotificationPrefs } from "./host-notifications-types";

export function useHostNotifications(hostId: string | undefined) {
  const [data, setData] = useState<HostNotificationsData | null>(() =>
    hostId ? loadHostNotifications(hostId) : null
  );
  const [ready, setReady] = useState(true);
  const shared = shouldUseSharedHostNotifications();

  const refresh = useCallback(async () => {
    if (!hostId) {
      setData(null);
      setReady(true);
      return;
    }

    if (shared) {
      try {
        setData(await fetchHostNotificationsFromApi(hostId));
        setReady(true);
        return;
      } catch {
        // fall through
      }
    }

    setData(loadHostNotifications(hostId));
    setReady(true);
  }, [hostId, shared]);

  useEffect(() => {
    void refresh();
    function onStorage(e: StorageEvent) {
      if (e.key === "farm-stays-host-notifications") void refresh();
    }
    window.addEventListener(HOST_NOTIFICATIONS_SYNC_EVENT, refresh);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(HOST_NOTIFICATIONS_SYNC_EVENT, refresh);
      window.removeEventListener("storage", onStorage);
    };
  }, [refresh]);

  return {
    ready,
    data,
    unreadCount: data?.alerts.filter((a) => !a.read).length ?? 0,
    savePrefs: async (prefs: HostNotificationPrefs) => {
      if (!hostId) return;
      if (shared) {
        try {
          setData(await saveNotificationPrefsViaApi(hostId, prefs));
          window.dispatchEvent(new Event(HOST_NOTIFICATIONS_SYNC_EVENT));
          return;
        } catch {
          // fall through
        }
      }
      setData(saveNotificationPrefs(hostId, prefs));
    },
    markRead: async (id: string) => {
      if (!hostId) return;
      if (shared) {
        try {
          setData(await markAlertReadViaApi(hostId, id));
          window.dispatchEvent(new Event(HOST_NOTIFICATIONS_SYNC_EVENT));
          return;
        } catch {
          // fall through
        }
      }
      setData(markAlertRead(hostId, id));
    },
    markAllRead: async () => {
      if (!hostId) return;
      if (shared) {
        try {
          setData(await markAllAlertsReadViaApi(hostId));
          window.dispatchEvent(new Event(HOST_NOTIFICATIONS_SYNC_EVENT));
          return;
        } catch {
          // fall through
        }
      }
      setData(markAllAlertsRead(hostId));
    },
  };
}
