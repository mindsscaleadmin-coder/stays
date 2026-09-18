"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FINANCIAL_SYNC_EVENT } from "@/lib/admin/financial-data";
import { HOST_BOOKINGS_SYNC_EVENT } from "@/lib/host/host-booking-data";
import { LISTINGS_SYNC_EVENT } from "@/lib/listings/submission-data";
import { TRUST_ADMIN_SYNC_EVENT } from "@/lib/admin/trust-data";
import { HOST_REVIEWS_SYNC_EVENT } from "@/lib/host/host-reviews-data";
import { USERS_SYNC_EVENT } from "@/lib/admin/user-data";
import { HOST_PROMOTIONS_SYNC_EVENT } from "@/lib/host/host-promotions-data";
import {
  ADMIN_ALERTS_SYNC_EVENT,
  computeAdminAlerts,
  countCriticalAdminAlerts,
  countUnreadAdminAlerts,
  dismissAdminAlert,
  loadAdminAlertsState,
  markAdminAlertRead,
  markAllAdminAlertsRead,
  updateAdminAlertSettings,
} from "./admin-alerts-data";
import type { AdminAlertSettings, AdminAlertsState, SystemServiceStatus } from "./admin-alerts-types";
import {
  fetchAdminAlertsStateFromApi,
  patchAdminAlertsViaApi,
  shouldUseSharedAdminAlerts,
} from "./admin-alerts-api";

export function useAdminAlerts() {
  const shared = shouldUseSharedAdminAlerts();
  const [state, setState] = useState<AdminAlertsState>(() => loadAdminAlertsState());
  const [ready, setReady] = useState(true);

  const [dataTick, setDataTick] = useState(0);

  const refreshLocal = useCallback(() => {
    setState(loadAdminAlertsState());
  }, []);

  const refreshRemote = useCallback(() => {
    if (shared) {
      void fetchAdminAlertsStateFromApi()
        .then(setState)
        .catch(() => refreshLocal());
    } else {
      refreshLocal();
    }
  }, [shared, refreshLocal]);

  const refreshRemoteRef = useRef(refreshRemote);
  refreshRemoteRef.current = refreshRemote;

  useEffect(() => {
    refreshRemote();
    setReady(true);

    // Recompute derived alerts from local stores — no API round-trip.
    function onDataSync() {
      setDataTick((t) => t + 1);
    }

    let remoteTimer: ReturnType<typeof setTimeout> | null = null;
    function onAlertsStateSync() {
      if (remoteTimer) clearTimeout(remoteTimer);
      remoteTimer = setTimeout(() => refreshRemoteRef.current(), 250);
    }

    function onStorage(e: StorageEvent) {
      if (
        e.key === "farm-stays-admin-alerts" ||
        e.key === "farm-stays-host-promotions"
      ) {
        onAlertsStateSync();
      }
    }

    window.addEventListener(ADMIN_ALERTS_SYNC_EVENT, onAlertsStateSync);
    window.addEventListener(LISTINGS_SYNC_EVENT, onDataSync);
    window.addEventListener(USERS_SYNC_EVENT, onDataSync);
    window.addEventListener(HOST_BOOKINGS_SYNC_EVENT, onDataSync);
    window.addEventListener(FINANCIAL_SYNC_EVENT, onDataSync);
    window.addEventListener(TRUST_ADMIN_SYNC_EVENT, onDataSync);
    window.addEventListener(HOST_REVIEWS_SYNC_EVENT, onDataSync);
    window.addEventListener(HOST_PROMOTIONS_SYNC_EVENT, onDataSync);
    window.addEventListener("storage", onStorage);
    return () => {
      if (remoteTimer) clearTimeout(remoteTimer);
      window.removeEventListener(ADMIN_ALERTS_SYNC_EVENT, onAlertsStateSync);
      window.removeEventListener(LISTINGS_SYNC_EVENT, onDataSync);
      window.removeEventListener(USERS_SYNC_EVENT, onDataSync);
      window.removeEventListener(HOST_BOOKINGS_SYNC_EVENT, onDataSync);
      window.removeEventListener(FINANCIAL_SYNC_EVENT, onDataSync);
      window.removeEventListener(TRUST_ADMIN_SYNC_EVENT, onDataSync);
      window.removeEventListener(HOST_REVIEWS_SYNC_EVENT, onDataSync);
      window.removeEventListener(HOST_PROMOTIONS_SYNC_EVENT, onDataSync);
      window.removeEventListener("storage", onStorage);
    };
  }, [refreshRemote]);

  const alerts = useMemo(() => {
    void dataTick;
    return computeAdminAlerts(state);
  }, [state, dataTick]);
  const unreadCount = useMemo(() => countUnreadAdminAlerts(alerts), [alerts]);
  const criticalCount = useMemo(() => countCriticalAdminAlerts(alerts), [alerts]);

  const applyState = useCallback(
    (next: AdminAlertsState) => {
      if (shared) {
        setState(next);
        refreshRemote();
        return;
      }
      setState(next);
    },
    [refreshRemote, shared]
  );

  return {
    ready,
    shared,
    alerts,
    settings: state.settings,
    dismissedCount: state.dismissedSourceKeys.length,
    unreadCount,
    criticalCount,
    refresh: refreshRemote,
    markRead: (sourceKey: string) => {
      if (shared) {
        void patchAdminAlertsViaApi({ action: "markRead", sourceKey })
          .then(setState)
          .catch(() => {
            markAdminAlertRead(sourceKey);
            applyState(loadAdminAlertsState());
          });
        return;
      }
      markAdminAlertRead(sourceKey);
      setState(loadAdminAlertsState());
    },
    markAllRead: () => {
      const sourceKeys = alerts.map((a) => a.sourceKey);
      if (shared) {
        void patchAdminAlertsViaApi({ action: "markAllRead", sourceKeys })
          .then(setState)
          .catch(() => {
            markAllAdminAlertsRead();
            applyState(loadAdminAlertsState());
          });
        return;
      }
      markAllAdminAlertsRead();
      setState(loadAdminAlertsState());
    },
    dismiss: (sourceKey: string) => {
      if (shared) {
        void patchAdminAlertsViaApi({ action: "dismiss", sourceKey })
          .then(setState)
          .catch(() => {
            dismissAdminAlert(sourceKey);
            applyState(loadAdminAlertsState());
          });
        return;
      }
      dismissAdminAlert(sourceKey);
      setState(loadAdminAlertsState());
    },
    saveSettings: (settings: AdminAlertSettings) => {
      if (shared) {
        void patchAdminAlertsViaApi({ action: "saveSettings", settings })
          .then(setState)
          .catch(() => {
            updateAdminAlertSettings(settings);
            applyState(loadAdminAlertsState());
          });
        return;
      }
      updateAdminAlertSettings(settings);
      setState(loadAdminAlertsState());
    },
    setServiceStatus: (
      service: keyof Omit<AdminAlertSettings["systemHealth"], "lastCheckedAt">,
      status: SystemServiceStatus
    ) => {
      if (shared) {
        void patchAdminAlertsViaApi({ action: "setServiceStatus", service, status })
          .then(setState)
          .catch(() => {
            const nextSettings: AdminAlertSettings = {
              ...state.settings,
              systemHealth: {
                ...state.settings.systemHealth,
                [service]: status,
                lastCheckedAt: new Date().toISOString(),
              },
            };
            updateAdminAlertSettings(nextSettings);
            applyState(loadAdminAlertsState());
          });
        return;
      }
      const nextSettings: AdminAlertSettings = {
        ...state.settings,
        systemHealth: {
          ...state.settings.systemHealth,
          [service]: status,
          lastCheckedAt: new Date().toISOString(),
        },
      };
      updateAdminAlertSettings(nextSettings);
      setState(loadAdminAlertsState());
    },
  };
}
