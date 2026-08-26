"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { moderateHostReview, HOST_REVIEWS_SYNC_EVENT } from "@/lib/host/host-reviews-data";
import { reviewFarmCertification, HOST_TRUST_SYNC_EVENT } from "@/lib/host/host-trust-data";
import {
  computeHostReviewFlags,
  loadAllReviewsFlat,
  loadPendingCertifications,
  loadTrustAdminSettings,
  saveTrustAdminSettings,
  TRUST_ADMIN_SYNC_EVENT,
} from "./trust-data";
import type { TrustAdminSettings } from "./trust-data";
import type { FlatHostReview, PendingCertification } from "./trust-data";
import {
  fetchPendingCertificationsFromApi,
  fetchTrustAdminSettingsFromApi,
  reviewCertificationViaApi,
  saveTrustAdminSettingsToApi,
  shouldUseSharedTrust,
} from "./trust-settings-api";
import {
  fetchAllReviewsFlatFromApi,
  moderateReviewViaApi,
} from "@/lib/host/host-reviews-api";

export function useAdminTrust() {
  const [settings, setSettings] = useState<TrustAdminSettings>(() => loadTrustAdminSettings());
  const [pendingCerts, setPendingCerts] = useState<PendingCertification[]>([]);
  const [reviews, setReviews] = useState<FlatHostReview[]>(() => loadAllReviewsFlat());
  const [ready, setReady] = useState(false);
  const [tick, setTick] = useState(0);
  const shared = shouldUseSharedTrust();

  const refresh = useCallback(async () => {
    if (shared) {
      try {
        setSettings(await fetchTrustAdminSettingsFromApi(true));
        setPendingCerts(await fetchPendingCertificationsFromApi());
        setReviews(await fetchAllReviewsFlatFromApi());
      } catch {
        setSettings(loadTrustAdminSettings());
        setPendingCerts(loadPendingCertifications());
        setReviews(loadAllReviewsFlat());
      }
    } else {
      setSettings(loadTrustAdminSettings());
      setPendingCerts(loadPendingCertifications());
      setReviews(loadAllReviewsFlat());
    }
    setTick((t) => t + 1);
  }, [shared]);

  useEffect(() => {
    void refresh().then(() => setReady(true));
    function onSync() {
      void refresh();
    }
    window.addEventListener(TRUST_ADMIN_SYNC_EVENT, onSync);
    window.addEventListener(HOST_REVIEWS_SYNC_EVENT, onSync);
    window.addEventListener(HOST_TRUST_SYNC_EVENT, onSync);
    window.addEventListener("storage", onSync);
    return () => {
      window.removeEventListener(TRUST_ADMIN_SYNC_EVENT, onSync);
      window.removeEventListener(HOST_REVIEWS_SYNC_EVENT, onSync);
      window.removeEventListener(HOST_TRUST_SYNC_EVENT, onSync);
      window.removeEventListener("storage", onSync);
    };
  }, [refresh]);

  const persistSettings = useCallback(async (next: TrustAdminSettings) => {
    if (shared) {
      try {
        const saved = await saveTrustAdminSettingsToApi(next);
        setSettings(saved);
        window.dispatchEvent(new Event(TRUST_ADMIN_SYNC_EVENT));
        return saved;
      } catch {
        saveTrustAdminSettings(next);
        setSettings(next);
        return next;
      }
    }
    saveTrustAdminSettings(next);
    setSettings(next);
    return next;
  }, [shared]);

  const patch = useCallback(
    (updater: (prev: TrustAdminSettings) => TrustAdminSettings) => {
      setSettings((prev) => {
        const next = updater(prev);
        void persistSettings(next);
        return next;
      });
    },
    [persistSettings]
  );

  const reviewsFlat = reviews;
  const hostFlags = useMemo(
    () => computeHostReviewFlags(reviewsFlat, settings.manualHostFlags),
    [reviewsFlat, settings.manualHostFlags]
  );

  const flaggedReviewCount = useMemo(
    () => reviewsFlat.filter((r) => r.moderationStatus === "flagged").length,
    [reviewsFlat]
  );

  const flaggedHostCount = useMemo(
    () => hostFlags.filter((h) => h.flagged).length,
    [hostFlags]
  );

  async function reviewCert(
    hostId: string,
    certId: string,
    status: "verified" | "rejected" | "none",
    note?: string
  ) {
    if (shared) {
      try {
        await reviewCertificationViaApi({ hostId, certId, status, note });
        await refresh();
        return;
      } catch {
        // fall through
      }
    }
    reviewFarmCertification(hostId, certId, status, note);
    setTick((t) => t + 1);
  }

  async function moderateReview(
    hostId: string,
    reviewId: string,
    action: "remove" | "restore" | "flag",
    reason?: string
  ) {
    if (shared) {
      try {
        await moderateReviewViaApi({ hostId, reviewId, action, reason });
        await refresh();
        return;
      } catch {
        // fall through
      }
    }
    moderateHostReview(hostId, reviewId, action, reason);
    setReviews(loadAllReviewsFlat());
    setTick((t) => t + 1);
  }

  return {
    ready,
    settings,
    reviews: reviewsFlat,
    hostFlags,
    pendingCerts,
    flaggedReviewCount,
    flaggedHostCount,
    pendingCertCount: pendingCerts.length,
    refresh,
    removeReview: (hostId: string, reviewId: string, reason?: string) => {
      void moderateReview(hostId, reviewId, "remove", reason);
    },
    restoreReview: (hostId: string, reviewId: string) => {
      void moderateReview(hostId, reviewId, "restore");
    },
    flagReview: (hostId: string, reviewId: string) => {
      void moderateReview(hostId, reviewId, "flag");
    },
    toggleHostFlag: (hostId: string) => {
      patch((prev) => {
        const has = prev.manualHostFlags.includes(hostId);
        return {
          ...prev,
          manualHostFlags: has
            ? prev.manualHostFlags.filter((id) => id !== hostId)
            : [...prev.manualHostFlags, hostId],
        };
      });
    },
    approveCert: (hostId: string, certId: string, note?: string) => {
      void reviewCert(hostId, certId, "verified", note);
    },
    rejectCert: (hostId: string, certId: string, note?: string) => {
      void reviewCert(hostId, certId, "rejected", note);
    },
    saveBadges: (badgeCatalog: TrustAdminSettings["badgeCatalog"]) => {
      patch((prev) => ({ ...prev, badgeCatalog }));
    },
  };
}
