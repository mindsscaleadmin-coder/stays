"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { clampCommissionPct } from "@/lib/admin/platform-config-data";
import {
  aggregateAllPayouts,
  aggregateAllTransactions,
  computeFinancialReport,
  FINANCIAL_SYNC_EVENT,
  loadFinancialSettings,
  reviewRefundRequest,
  saveFinancialSettings,
  updatePayoutState,
} from "./financial-data";
import type {
  FinancialSettings,
  HostCommissionOverride,
  RefundRequest,
} from "./financial-types";
import {
  fetchFinancialSettingsFromApi,
  patchFinancialSettingsViaApi,
  shouldUseSharedAdminFinancial,
  type PlatformLedger,
} from "./financial-api";

export function useAdminFinancial() {
  const shared = shouldUseSharedAdminFinancial();
  const [settings, setSettings] = useState<FinancialSettings>(() => loadFinancialSettings());
  const [ledger, setLedger] = useState<PlatformLedger | null>(null);
  const [ready, setReady] = useState(false);

  const applyPayload = useCallback(
    (payload: { settings: FinancialSettings; ledger?: PlatformLedger }) => {
      setSettings(payload.settings);
      if (payload.ledger) setLedger(payload.ledger);
    },
    []
  );

  const refresh = useCallback(() => {
    if (shared) {
      void fetchFinancialSettingsFromApi()
        .then(applyPayload)
        .catch(() => setSettings(loadFinancialSettings()));
    } else {
      setSettings(loadFinancialSettings());
      setLedger(null);
    }
  }, [shared, applyPayload]);

  useEffect(() => {
    refresh();
    setReady(true);
    function onSync() {
      refresh();
    }
    window.addEventListener(FINANCIAL_SYNC_EVENT, onSync);
    window.addEventListener("storage", onSync);
    return () => {
      window.removeEventListener(FINANCIAL_SYNC_EVENT, onSync);
      window.removeEventListener("storage", onSync);
    };
  }, [refresh]);

  const patch = useCallback(
    (updater: (prev: FinancialSettings) => FinancialSettings) => {
      if (shared) {
        setSettings((prev) => {
          const next = updater(prev);
          void patchFinancialSettingsViaApi({ action: "saveSettings", settings: next })
            .then(applyPayload)
            .catch(() => {
              saveFinancialSettings(next);
              setSettings(loadFinancialSettings());
            });
          return next;
        });
        return;
      }
      setSettings((prev) => {
        const next = updater(prev);
        saveFinancialSettings(next);
        return next;
      });
    },
    [shared, applyPayload]
  );

  const runPayoutMutation = useCallback(
    (local: () => void) => {
      if (shared) {
        refresh();
        return;
      }
      local();
      setSettings(loadFinancialSettings());
    },
    [refresh, shared]
  );

  const localTransactions = useMemo(() => aggregateAllTransactions(), []);
  const localPayouts = useMemo(() => aggregateAllPayouts(settings), [settings]);
  const transactions = ledger?.transactions ?? localTransactions;
  const payouts = ledger?.payouts ?? localPayouts;
  const report = useMemo(
    () => ledger?.report ?? computeFinancialReport(transactions, payouts),
    [ledger, transactions, payouts]
  );

  const pendingPayoutReviewCount = useMemo(
    () => payouts.filter((p) => p.adminStatus === "pending_review" && p.sourceStatus !== "paid").length,
    [payouts]
  );

  const pendingRefundCount = useMemo(
    () =>
      (ledger?.refunds ?? settings.refundRequests).filter((r) => r.status === "pending").length,
    [ledger, settings.refundRequests]
  );

  const viewSettings = useMemo(
    () => (ledger ? { ...settings, refundRequests: ledger.refunds } : settings),
    [ledger, settings]
  );

  return {
    ready,
    settings: viewSettings,
    transactions,
    payouts,
    report,
    pendingPayoutReviewCount,
    pendingRefundCount,
    refresh,
    updateGlobalCommission: (globalFeePct: number, globalServiceFeeFlat?: number) => {
      if (shared) {
        void patchFinancialSettingsViaApi({
          action: "updateGlobalCommission",
          globalFeePct,
          globalServiceFeeFlat,
        })
          .then((payload) => {
            applyPayload(payload);
            refresh();
          })
          .catch(() => {
            patch((prev) => ({
              ...prev,
              commission: {
                ...prev.commission,
                globalFeePct: clampCommissionPct(globalFeePct),
                ...(globalServiceFeeFlat !== undefined ? { globalServiceFeeFlat } : {}),
              },
            }));
          });
        return;
      }
      patch((prev) => ({
        ...prev,
        commission: {
          ...prev.commission,
          globalFeePct: clampCommissionPct(globalFeePct),
          ...(globalServiceFeeFlat !== undefined ? { globalServiceFeeFlat } : {}),
        },
      }));
    },
    setHostOverride: (override: HostCommissionOverride) => {
      const clamped = { ...override, feePct: clampCommissionPct(override.feePct) };
      if (shared) {
        void patchFinancialSettingsViaApi({ action: "setHostOverride", override: clamped })
          .then((payload) => {
            applyPayload(payload);
            refresh();
          })
          .catch(() => {
            patch((prev) => ({
              ...prev,
              commission: {
                ...prev.commission,
                hostOverrides: [
                  ...prev.commission.hostOverrides.filter((o) => o.hostId !== clamped.hostId),
                  clamped,
                ],
              },
            }));
          });
        return;
      }
      patch((prev) => ({
        ...prev,
        commission: {
          ...prev.commission,
          hostOverrides: [
            ...prev.commission.hostOverrides.filter((o) => o.hostId !== clamped.hostId),
            clamped,
          ],
        },
      }));
    },
    removeHostOverride: (hostId: string) => {
      if (shared) {
        void patchFinancialSettingsViaApi({ action: "removeHostOverride", hostId })
          .then((payload) => {
            applyPayload(payload);
            refresh();
          })
          .catch(() => {
            patch((prev) => ({
              ...prev,
              commission: {
                ...prev.commission,
                hostOverrides: prev.commission.hostOverrides.filter((o) => o.hostId !== hostId),
              },
            }));
          });
        return;
      }
      patch((prev) => ({
        ...prev,
        commission: {
          ...prev.commission,
          hostOverrides: prev.commission.hostOverrides.filter((o) => o.hostId !== hostId),
        },
      }));
    },
    approvePayout: (payoutId: string) => {
      if (shared) {
        void patchFinancialSettingsViaApi({
          action: "updatePayout",
          payoutId,
          adminStatus: "approved",
        }).then((payload) => {
          applyPayload(payload);
          refresh();
        }).catch(() => runPayoutMutation(() => updatePayoutState(payoutId, { adminStatus: "approved" })));
        return;
      }
      updatePayoutState(payoutId, { adminStatus: "approved" });
      setSettings(loadFinancialSettings());
    },
    holdPayout: (payoutId: string, holdReason: string) => {
      if (shared) {
        void patchFinancialSettingsViaApi({
          action: "updatePayout",
          payoutId,
          adminStatus: "held",
          holdReason,
        }).then((payload) => {
          applyPayload(payload);
          refresh();
        }).catch(() => runPayoutMutation(() => updatePayoutState(payoutId, { adminStatus: "held", holdReason })));
        return;
      }
      updatePayoutState(payoutId, { adminStatus: "held", holdReason });
      setSettings(loadFinancialSettings());
    },
    releasePayout: (payoutId: string) => {
      if (shared) {
        void patchFinancialSettingsViaApi({
          action: "updatePayout",
          payoutId,
          adminStatus: "approved",
        }).then((payload) => {
          applyPayload(payload);
          refresh();
        }).catch(() => runPayoutMutation(() => updatePayoutState(payoutId, { adminStatus: "approved" })));
        return;
      }
      updatePayoutState(payoutId, { adminStatus: "approved" });
      setSettings(loadFinancialSettings());
    },
    reviewRefund: (id: string, status: RefundRequest["status"], reviewNote?: string) => {
      if (shared) {
        void patchFinancialSettingsViaApi({
          action: "reviewRefund",
          id,
          status,
          reviewNote,
        }).then((payload) => {
          applyPayload(payload);
          refresh();
        }).catch(() => runPayoutMutation(() => reviewRefundRequest(id, { status, reviewNote })));
        return;
      }
      reviewRefundRequest(id, { status, reviewNote });
      setSettings(loadFinancialSettings());
    },
  };
}
