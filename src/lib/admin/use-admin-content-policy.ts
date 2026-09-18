"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { loadActiveSubmissions } from "@/lib/listings/submission-data";
import { HOST_NOTIFICATIONS_SYNC_EVENT, pushPolicyAlertToAllHosts } from "@/lib/host/host-notifications-data";
import {
  broadcastPolicyAlertViaApi,
  shouldUseSharedHostNotifications,
} from "@/lib/host/host-notifications-api";
import {
  CONTENT_POLICY_SYNC_EVENT,
  countDraftAnnouncements,
  countDisabledTemplates,
  getDefaultHouseRulesFromTemplates,
  getEnabledHouseRuleTemplates,
  getHostSelectableCancellationPolicies,
  loadContentPolicy,
  mergeParentPolicyPacks,
  normalizeContentPolicy,
  newContentPolicyId,
  saveContentPolicy,
  syncFeaturedListings,
  CMS_HOMEPAGE_BLOCK_CATALOG,
} from "./content-policy-data";
import {
  loadContentPolicyClient,
  saveContentPolicyToApi,
  shouldUseSharedContentPolicy,
} from "./content-policy-api";
import { PLATFORM_CONFIG_SYNC_EVENT } from "./platform-config-data";
import type {
  BlogPost,
  CmsSettings,
  ContentPolicySettings,
  HouseRuleTemplate,
  MessageTemplate,
  PlatformAnnouncement,
  CancellationPolicyOption,
  CmsContentSection,
} from "./content-policy-types";
import { normalizeAnnouncementAudience } from "./announcement-audience";

export function useAdminContentPolicy(taxonomyParents?: { id: string; name: string }[]) {
  const [settings, setSettings] = useState<ContentPolicySettings>(() =>
    loadContentPolicy(taxonomyParents)
  );
  const [ready, setReady] = useState(false);
  const shared = shouldUseSharedContentPolicy();

  const refresh = useCallback(async () => {
    setSettings(await loadContentPolicyClient(taxonomyParents));
    setReady(true);
  }, [taxonomyParents]);

  useEffect(() => {
    void refresh();
    function onSync() {
      void refresh();
    }
    window.addEventListener(CONTENT_POLICY_SYNC_EVENT, onSync);
    window.addEventListener(HOST_NOTIFICATIONS_SYNC_EVENT, onSync);
    window.addEventListener("storage", onSync);
    return () => {
      window.removeEventListener(CONTENT_POLICY_SYNC_EVENT, onSync);
      window.removeEventListener(HOST_NOTIFICATIONS_SYNC_EVENT, onSync);
      window.removeEventListener("storage", onSync);
    };
  }, [refresh]);

  const persist = useCallback(
    async (next: ContentPolicySettings) => {
      if (shared) {
        try {
          const saved = await saveContentPolicyToApi(next);
          setSettings(saved);
          window.dispatchEvent(new Event(CONTENT_POLICY_SYNC_EVENT));
          return saved;
        } catch {
          saveContentPolicy(next);
          setSettings(next);
          return next;
        }
      }
      saveContentPolicy(next);
      setSettings(next);
      return next;
    },
    [shared]
  );

  const patch = useCallback(
    (updater: (prev: ContentPolicySettings) => ContentPolicySettings) => {
      setSettings((prev) => {
        const next = updater(prev);
        void persist(next);
        return next;
      });
    },
    [persist]
  );

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

  const syncParentPolicyPacks = useCallback(() => {
    if (!taxonomyParents?.length) return;
    patch((prev) => ({
      ...prev,
      parentPolicyPacks: mergeParentPolicyPacks(prev, taxonomyParents),
    }));
  }, [patch, taxonomyParents]);

  return {
    ready,
    settings,
    shared,
    approvedListings,
    draftAnnouncementCount,
    disabledTemplateCount,
    refresh,
    saveHouseRuleTemplates: (
      parentId: string,
      houseRuleTemplates: HouseRuleTemplate[]
    ) => {
      patch((prev) => ({
        ...prev,
        parentPolicyPacks: prev.parentPolicyPacks.map((pack) =>
          pack.parentId === parentId ? { ...pack, houseRuleTemplates } : pack
        ),
      }));
    },
    saveCancellationPolicies: (
      parentId: string,
      cancellationPolicies: CancellationPolicyOption[]
    ) => {
      patch((prev) => ({
        ...prev,
        parentPolicyPacks: prev.parentPolicyPacks.map((pack) =>
          pack.parentId === parentId ? { ...pack, cancellationPolicies } : pack
        ),
      }));
    },
    syncParentPolicyPacks,
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
      const announcement = settings.platformAnnouncements.find((a) => a.id === id);
      if (!announcement || announcement.status === "sent") return;

      const audience = normalizeAnnouncementAudience(announcement);
      pushPolicyAlertToAllHosts(announcement.title, announcement.message, audience);

      const pushedAt = new Date().toISOString();
      await persist({
        ...settings,
        platformAnnouncements: settings.platformAnnouncements.map((a) =>
          a.id === id ? { ...a, status: "sent" as const, pushedAt } : a
        ),
      });

      if (shouldUseSharedHostNotifications()) {
        try {
          await broadcastPolicyAlertViaApi(
            announcement.title,
            announcement.message,
            audience
          );
        } catch {
          // local inbox already updated
        }
      }
    },
    pushAnnouncementNow: async (
      input: Omit<PlatformAnnouncement, "id" | "createdAt" | "status" | "pushedAt">
    ) => {
      const audience = normalizeAnnouncementAudience(input);
      pushPolicyAlertToAllHosts(input.title, input.message, audience);

      const createdAt = new Date().toISOString();
      const pushedAt = createdAt;
      const item: PlatformAnnouncement = {
        ...input,
        ...audience,
        id: newContentPolicyId("pa"),
        createdAt,
        status: "sent",
        pushedAt,
      };

      await persist({
        ...settings,
        platformAnnouncements: [item, ...settings.platformAnnouncements],
      });

      if (shouldUseSharedHostNotifications()) {
        try {
          await broadcastPolicyAlertViaApi(input.title, input.message, audience);
        } catch {
          // local inbox already updated
        }
      }
    },
    saveMessageTemplates: (messageTemplates: MessageTemplate[]) => {
      patch((prev) => ({ ...prev, messageTemplates }));
    },
    saveCms: (cms: CmsSettings) => {
      syncFeaturedListings(cms.featuredListingIds);
      patch((prev) => ({ ...prev, cms }));
    },
    toggleFeaturedListing: (listingId: string) => {
      patch((prev) => {
        const ids = new Set(prev.cms.featuredListingIds);
        if (ids.has(listingId)) ids.delete(listingId);
        else ids.add(listingId);
        const cms = { ...prev.cms, featuredListingIds: Array.from(ids) };
        syncFeaturedListings(cms.featuredListingIds);
        return { ...prev, cms };
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
    addCmsSection: (key: string) => {
      const block = CMS_HOMEPAGE_BLOCK_CATALOG.find((item) => item.key === key);
      if (!block) return;
      patch((prev) => {
        if (prev.cms.contentSections.some((section) => section.key === key)) return prev;
        const sortOrder =
          prev.cms.contentSections.reduce((max, section) => Math.max(max, section.sortOrder), 0) +
          1;
        return {
          ...prev,
          cms: {
            ...prev.cms,
            contentSections: [
              ...prev.cms.contentSections,
              {
                id: newContentPolicyId("sec"),
                key: block.key,
                title: block.title,
                subtitle: block.subtitle,
                enabled: true,
                sortOrder,
              },
            ].sort((a, b) => a.sortOrder - b.sortOrder),
          },
        };
      });
    },
    updateCmsSection: (sectionId: string, sectionPatch: Partial<CmsContentSection>) => {
      patch((prev) => ({
        ...prev,
        cms: {
          ...prev.cms,
          contentSections: prev.cms.contentSections.map((section) =>
            section.id === sectionId ? { ...section, ...sectionPatch } : section
          ),
        },
      }));
    },
    removeCmsSection: (sectionId: string) => {
      patch((prev) => ({
        ...prev,
        cms: {
          ...prev.cms,
          contentSections: prev.cms.contentSections.filter((section) => section.id !== sectionId),
        },
      }));
    },
  };
}

/** Lightweight hook for host-side policy template access */
export function useContentPolicyOptions(parentCategory?: string | null) {
  const [settings, setSettings] = useState<ContentPolicySettings>(loadContentPolicy());

  useEffect(() => {
    async function refresh() {
      setSettings(await loadContentPolicyClient());
    }
    void refresh();
    function onSync() {
      void refresh();
    }
    window.addEventListener(CONTENT_POLICY_SYNC_EVENT, onSync);
    window.addEventListener(PLATFORM_CONFIG_SYNC_EVENT, onSync);
    window.addEventListener("storage", onSync);
    return () => {
      window.removeEventListener(CONTENT_POLICY_SYNC_EVENT, onSync);
      window.removeEventListener(PLATFORM_CONFIG_SYNC_EVENT, onSync);
      window.removeEventListener("storage", onSync);
    };
  }, []);

  const houseRuleTemplates = useMemo(
    () => getEnabledHouseRuleTemplates(settings, parentCategory),
    [settings, parentCategory]
  );

  const cancellationPolicies = useMemo(
    () => getHostSelectableCancellationPolicies(settings, parentCategory),
    [settings, parentCategory]
  );

  const defaultHouseRules = useMemo(
    () => getDefaultHouseRulesFromTemplates(settings, parentCategory),
    [settings, parentCategory]
  );

  return {
    houseRuleTemplates,
    cancellationPolicies,
    defaultHouseRules,
  };
}

/** Homepage CMS hook */
export function useCmsSettings() {
  // Match server HTML on first client render; load localStorage/API after mount.
  const [cms, setCms] = useState(() => normalizeContentPolicy(null).cms);

  useEffect(() => {
    async function refresh() {
      const settings = await loadContentPolicyClient();
      setCms(settings.cms);
    }
    void refresh();
    function onSync() {
      void refresh();
    }
    window.addEventListener(CONTENT_POLICY_SYNC_EVENT, onSync);
    window.addEventListener("storage", onSync);
    return () => {
      window.removeEventListener(CONTENT_POLICY_SYNC_EVENT, onSync);
      window.removeEventListener("storage", onSync);
    };
  }, []);

  return cms;
}
