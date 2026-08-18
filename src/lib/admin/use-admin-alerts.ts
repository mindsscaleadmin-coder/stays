"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  const [ready, setReady] = useState(false);

  const refresh = useCallback(() => {
    if (shared) {
      void fetchAdminAlertsStateFromApi()
        .then(setState)
        .catch(() => setState(loadAdminAlertsState()));
    } else {
      setState(loadAdminAlertsState());
    }
  }, [shared]);

  useEffect(() => {
    refresh();
    setReady(true);
    function onSync() {
      refresh();
    }
    function onStorage(e: StorageEvent) {
      if (
        !e.key ||
        e.key === "farm-stays-admin-alerts" ||
        e.key === "farm-stays-host-promotions" ||
        e.key.startsWith("farm-stays-")
      ) {
        refresh();
      }
    }
    window.addEventListener(ADMIN_ALERTS_SYNC_EVENT, refresh);
    window.addEventListener(LISTINGS_SYNC_EVENT, refresh);
    window.addEventListener(USERS_SYNC_EVENT, refresh);
    window.addEventListener(HOST_BOOKINGS_SYNC_EVENT, refresh);
    window.addEventListener(FINANCIAL_SYNC_EVENT, refresh);
    window.addEventListener(TRUST_ADMIN_SYNC_EVENT, refresh);
    window.addEventListener(HOST_REVIEWS_SYNC_EVENT, refresh);
    window.addEventListener(HOST_PROMOTIONS_SYNC_EVENT, refresh);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(ADMIN_ALERTS_SYNC_EVENT, refresh);
      window.removeEventListener(LISTINGS_SYNC_EVENT, refresh);
      window.removeEventListener(USERS_SYNC_EVENT, refresh);
      window.removeEventListener(HOST_BOOKINGS_SYNC_EVENT, refresh);
      window.removeEventListener(FINANCIAL_SYNC_EVENT, refresh);
      window.removeEventListener(TRUST_ADMIN_SYNC_EVENT, refresh);
      window.removeEventListener(HOST_REVIEWS_SYNC_EVENT, refresh);
      window.removeEventListener(HOST_PROMOTIONS_SYNC_EVENT, refresh);
      window.removeEventListener("storage", onStorage);
    };
  }, [refresh]);

  const alerts = useMemo(() => computeAdminAlerts(state), [state]);
  const unreadCount = useMemo(() => countUnreadAdminAlerts(alerts), [alerts]);
  const criticalCount = useMemo(() => countCriticalAdminAlerts(alerts), [alerts]);

  const applyState = useCallback(
    (next: AdminAlertsState) => {
      if (shared) {
        setState(next);
        refresh();
        return;
      }
      setState(next);
    },
    [refresh, shared]
  );

  return {
    ready,
    alerts,
    settings: state.settings,
    unreadCount,
    criticalCount,
    refresh,
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
