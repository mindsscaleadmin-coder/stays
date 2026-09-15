"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { loadActiveSubmissions } from "@/lib/listings/submission-data";
import { HOST_NOTIFICATIONS_SYNC_EVENT } from "@/lib/host/host-notifications-data";
import {
  broadcastPolicyAlertViaApi,
  shouldUseSharedHostNotifications,
} from "@/lib/host/host-notifications-api";
import {
  CONTENT_POLICY_SYNC_EVENT,
  countDraftAnnouncements,
  countDisabledTemplates,
  createAndPushAnnouncement,
  getDefaultHouseRulesFromTemplates,
  getHostSelectableCancellationPolicies,
  loadContentPolicy,
  newContentPolicyId,
  pushPlatformAnnouncement,
  saveContentPolicy,
} from "./content-policy-data";
import { PLATFORM_CONFIG_SYNC_EVENT } from "./platform-config-data";
import type {
  BlogPost,
  CmsSettings,
  ContentPolicySettings,
  HouseRuleTemplate,
  MessageTemplate,
  PlatformAnnouncement,
  CancellationPolicyOption,
} from "./content-policy-types";
import { normalizeAnnouncementAudience } from "./announcement-audience";

export function useAdminContentPolicy() {
  const [settings, setSettings] = useState<ContentPolicySettings>(() => loadContentPolicy());
  const [ready, setReady] = useState(true);

  const refresh = useCallback(() => {
    setSettings(loadContentPolicy());
  }, []);

  useEffect(() => {
    refresh();
    setReady(true);
    function onSync() {
      refresh();
    }
    window.addEventListener(CONTENT_POLICY_SYNC_EVENT, refresh);
    window.addEventListener(HOST_NOTIFICATIONS_SYNC_EVENT, refresh);
    window.addEventListener("storage", onSync);
    return () => {
      window.removeEventListener(CONTENT_POLICY_SYNC_EVENT, refresh);
      window.removeEventListener(HOST_NOTIFICATIONS_SYNC_EVENT, refresh);
      window.removeEventListener("storage", onSync);
    };
  }, [refresh]);

  const patch = useCallback((updater: (prev: ContentPolicySettings) => ContentPolicySettings) => {
    setSettings((prev) => {
      const next = updater(prev);
      saveContentPolicy(next);
      return next;
    });
  }, []);

  const approvedListings = useMemo(
    () =>
      typeof window !== "undefined"
        ? loadActiveSubmissions().filter((l) => l.status === "approved")
        : [],
    []
  );

  const draftAnnouncementCount = useMemo(
    () => countDraftAnnouncements(settings),
    [settings]
  );

  const disabledTemplateCount = useMemo(
    () => countDisabledTemplates(settings),
    [settings]
  );

  return {
    ready,
    settings,
    approvedListings,
    draftAnnouncementCount,
    disabledTemplateCount,
    refresh,
    saveHouseRuleTemplates: (houseRuleTemplates: HouseRuleTemplate[]) => {
      patch((prev) => ({ ...prev, houseRuleTemplates }));
    },
    saveCancellationPolicies: (cancellationPolicies: CancellationPolicyOption[]) => {
      patch((prev) => ({ ...prev, cancellationPolicies }));
    },
    addAnnouncement: (input: Omit<PlatformAnnouncement, "id" | "createdAt" | "status" | "pushedAt">) => {
      const item: PlatformAnnouncement = {
        ...input,
        ...normalizeAnnouncementAudience(input),
        id: newContentPolicyId("pa"),
        createdAt: new Date().toISOString(),
        status: "draft",
      };
      patch((prev) => ({
        ...prev,
        platformAnnouncements: [item, ...prev.platformAnnouncements],
      }));
    },
    updateAnnouncement: (id: string, patchAnn: Partial<PlatformAnnouncement>) => {
      patch((prev) => ({
        ...prev,
        platformAnnouncements: prev.platformAnnouncements.map((a) =>
          a.id === id ? { ...a, ...patchAnn } : a
        ),
      }));
    },
    removeAnnouncement: (id: string) => {
      patch((prev) => ({
        ...prev,
        platformAnnouncements: prev.platformAnnouncements.filter((a) => a.id !== id),
      }));
    },
    pushAnnouncement: async (id: string) => {
      const next = pushPlatformAnnouncement(id);
      if (next && shouldUseSharedHostNotifications()) {
        try {
          await broadcastPolicyAlertViaApi(
            next.title,
            next.message,
            normalizeAnnouncementAudience(next)
          );
        } catch {
          // localStorage inbox already updated
        }
      }
      setSettings(loadContentPolicy());
    },
    pushAnnouncementNow: async (
      input: Omit<PlatformAnnouncement, "id" | "createdAt" | "status" | "pushedAt">
    ) => {
      const next = createAndPushAnnouncement(input);
      if (shouldUseSharedHostNotifications()) {
        try {
          await broadcastPolicyAlertViaApi(
            next.title,
            next.message,
            normalizeAnnouncementAudience(next)
          );
        } catch {
          // localStorage inbox already updated
        }
      }
      setSettings(loadContentPolicy());
    },
    saveMessageTemplates: (messageTemplates: MessageTemplate[]) => {
      patch((prev) => ({ ...prev, messageTemplates }));
    },
    saveCms: (cms: CmsSettings) => {
      patch((prev) => ({ ...prev, cms }));
    },
    toggleFeaturedListing: (listingId: string) => {
      patch((prev) => {
        const ids = new Set(prev.cms.featuredListingIds);
        if (ids.has(listingId)) ids.delete(listingId);
        else ids.add(listingId);
        return {
          ...prev,
          cms: { ...prev.cms, featuredListingIds: Array.from(ids) },
        };
      });
    },
    addBlogPost: (input: Omit<BlogPost, "id">) => {
      const post: BlogPost = { ...input, id: newContentPolicyId("blog") };
      patch((prev) => ({
        ...prev,
        cms: { ...prev.cms, blogPosts: [post, ...prev.cms.blogPosts] },
      }));
    },
    updateBlogPost: (id: string, blogPatch: Partial<BlogPost>) => {
      patch((prev) => ({
        ...prev,
        cms: {
          ...prev.cms,
          blogPosts: prev.cms.blogPosts.map((p) => (p.id === id ? { ...p, ...blogPatch } : p)),
        },
      }));
    },
    removeBlogPost: (id: string) => {
      patch((prev) => ({
        ...prev,
        cms: {
          ...prev.cms,
          blogPosts: prev.cms.blogPosts.filter((p) => p.id !== id),
        },
      }));
    },
    toggleCmsSection: (sectionId: string) => {
      patch((prev) => ({
        ...prev,
        cms: {
          ...prev.cms,
          contentSections: prev.cms.contentSections.map((s) =>
            s.id === sectionId ? { ...s, enabled: !s.enabled } : s
          ),
        },
      }));
    },
  };
}

/** Lightweight hook for host-side policy template access */
export function useContentPolicyOptions() {
  const [settings, setSettings] = useState<ContentPolicySettings>(loadContentPolicy());

  useEffect(() => {
    function refresh() {
      setSettings(loadContentPolicy());
    }
    refresh();
    window.addEventListener(CONTENT_POLICY_SYNC_EVENT, refresh);
    window.addEventListener(PLATFORM_CONFIG_SYNC_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(CONTENT_POLICY_SYNC_EVENT, refresh);
      window.removeEventListener(PLATFORM_CONFIG_SYNC_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const houseRuleTemplates = useMemo(
    () => settings.houseRuleTemplates.filter((t) => t.enabled),
    [settings.houseRuleTemplates]
  );

  const cancellationPolicies = useMemo(
    () => getHostSelectableCancellationPolicies(settings),
    [settings]
  );

  const defaultHouseRules = useMemo(
    () => getDefaultHouseRulesFromTemplates(settings),
    [settings]
  );

  return {
    houseRuleTemplates,
    cancellationPolicies,
    defaultHouseRules,
  };
}

/** Homepage CMS hook */
export function useCmsSettings() {
  const [cms, setCms] = useState(loadContentPolicy().cms);

  useEffect(() => {
    function refresh() {
      setCms(loadContentPolicy().cms);
    }
    refresh();
    window.addEventListener(CONTENT_POLICY_SYNC_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(CONTENT_POLICY_SYNC_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  return cms;
}
