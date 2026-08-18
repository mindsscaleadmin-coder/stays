"use client";

import { useCallback, useEffect, useState } from "react";
import {
  HOST_REVIEWS_SYNC_EVENT,
  loadHostReviews,
  respondToReview,
  saveResponseTemplates,
} from "./host-reviews-data";
import {
  fetchHostReviewsFromApi,
  respondToReviewViaApi,
  saveTemplatesViaApi,
  shouldUseSharedHostReviews,
} from "./host-reviews-api";
import type { HostReviewsData } from "./host-reviews-types";

export function useHostReviews(hostId: string | undefined) {
  const [data, setData] = useState<HostReviewsData | null>(null);
  const [ready, setReady] = useState(false);
  const shared = shouldUseSharedHostReviews();

  const refresh = useCallback(async () => {
    if (!hostId) {
      setData(null);
      setReady(true);
      return;
    }

    if (shared) {
      try {
        setData(await fetchHostReviewsFromApi(hostId));
      } catch {
        setData(loadHostReviews(hostId));
      }
    } else {
      setData(loadHostReviews(hostId));
    }
    setReady(true);
  }, [hostId, shared]);

  useEffect(() => {
    void refresh();
    function onStorage(e: StorageEvent) {
      if (e.key === "farm-stays-host-reviews") void refresh();
    }
    window.addEventListener(HOST_REVIEWS_SYNC_EVENT, refresh);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(HOST_REVIEWS_SYNC_EVENT, refresh);
      window.removeEventListener("storage", onStorage);
    };
  }, [refresh]);

  return {
    ready,
    data,
    respond: async (reviewId: string, response: string) => {
      if (!hostId) return;
      if (shared) {
        try {
          setData(await respondToReviewViaApi(hostId, reviewId, response));
          window.dispatchEvent(new Event(HOST_REVIEWS_SYNC_EVENT));
          return;
        } catch {
          // fall through
        }
      }
      const next = respondToReview(hostId, reviewId, response);
      if (next) setData(next);
    },
    saveTemplates: async (templates: HostReviewsData["templates"]) => {
      if (!hostId) return;
      if (shared) {
        try {
          setData(await saveTemplatesViaApi(hostId, templates));
          window.dispatchEvent(new Event(HOST_REVIEWS_SYNC_EVENT));
          return;
        } catch {
          // fall through
        }
      }
      setData(saveResponseTemplates(hostId, templates));
    },
  };
}
