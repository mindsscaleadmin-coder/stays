"use client";

import { useEffect, useMemo, useState } from "react";
import { Link } from "@/i18n/routing";
import { Megaphone } from "lucide-react";
import { useHostNotifications } from "@/lib/host/use-host-notifications";
import { useHostSubmissions } from "@/lib/listings/use-listing-submissions";
import {
  CONTENT_POLICY_SYNC_EVENT,
} from "@/lib/admin/content-policy-data";
import { loadContentPolicyClient } from "@/lib/admin/content-policy-api";
import { announcementsForHost } from "@/lib/admin/announcement-audience";
import type { PlatformAnnouncement } from "@/lib/admin/content-policy-types";
import {
  announcementKey,
  loadDismissedAnnouncementIds,
  saveDismissedAnnouncementIds,
} from "@/lib/host/host-overview-announcement-count";

type Banner = {
  id: string;
  title: string;
  message: string;
  source: "announcement" | "inbox";
};

export function HostOverviewAnnouncements({
  hostId,
  hostName,
}: {
  hostId?: string;
  hostName?: string;
}) {
  const listings = useHostSubmissions(hostId, hostName);
  const { data, ready: inboxReady, markRead } = useHostNotifications(hostId);
  const [announcements, setAnnouncements] = useState<PlatformAnnouncement[]>([]);
  const [dismissed, setDismissed] = useState<string[]>([]);

  useEffect(() => {
    async function refresh() {
      const policy = await loadContentPolicyClient();
      setAnnouncements(policy.platformAnnouncements);
      setDismissed(loadDismissedAnnouncementIds(hostId));
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
  }, [hostId]);

  const banners = useMemo<Banner[]>(() => {
    const seen = new Set<string>();
    const next: Banner[] = [];

    for (const announcement of announcementsForHost(announcements, listings)) {
      if (dismissed.includes(announcement.id)) continue;
      const key = announcementKey(announcement.title, announcement.message);
      if (seen.has(key)) continue;
      seen.add(key);
      next.push({
        id: announcement.id,
        title: announcement.title,
        message: announcement.message,
        source: "announcement",
      });
    }

    if (inboxReady) {
      for (const alert of data?.alerts ?? []) {
        if (alert.type !== "policy" || alert.read) continue;
        const key = announcementKey(alert.title, alert.message);
        if (seen.has(key) || dismissed.includes(alert.id)) continue;
        seen.add(key);
        next.push({
          id: alert.id,
          title: alert.title,
          message: alert.message,
          source: "inbox",
        });
      }
    }

    return next.slice(0, 5);
  }, [announcements, listings, dismissed, data?.alerts, inboxReady]);

  function dismiss(banner: Banner) {
    if (hostId) {
      const ids = Array.from(new Set([...dismissed, banner.id]));
      setDismissed(ids);
      saveDismissedAnnouncementIds(hostId, ids);
    }
    if (banner.source === "inbox") {
      void markRead(banner.id);
    }
  }

  if (banners.length === 0) return null;

  return (
    <div className="space-y-2">
      {banners.map((banner) => (
        <section
          key={banner.id}
          className="bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-2.5"
        >
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                <Megaphone className="w-3.5 h-3.5 text-amber-800" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wide text-amber-800 leading-none">
                  Announcement
                </p>
                <p className="font-display text-sm font-semibold text-amber-950 mt-0.5 leading-snug truncate">
                  {banner.title}
                </p>
                <p className="text-xs text-amber-900/80 mt-0.5 line-clamp-2 whitespace-pre-wrap leading-snug">
                  {banner.message}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Link
                href="/host/notifications"
                className="text-xs font-semibold text-amber-900 border border-amber-300 bg-white px-2.5 py-1 rounded-lg hover:bg-amber-100/60"
              >
                Notifications
              </Link>
              <button
                type="button"
                onClick={() => dismiss(banner)}
                className="text-xs font-semibold text-amber-900 px-2.5 py-1 rounded-lg hover:bg-amber-100/80"
              >
                Dismiss
              </button>
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}
