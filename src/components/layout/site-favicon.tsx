"use client";

import { useEffect } from "react";
import {
  HOME_PAGE_SETTINGS_SYNC_EVENT,
  loadFaviconUrl,
} from "@/lib/admin/home-page-settings-data";
import { useHomePageSettings } from "@/components/providers/home-page-settings-provider";

const FAVICON_LINK_ID = "farm-stays-dynamic-favicon";

/** Applies the admin-configured favicon to the document head. */
export function SiteFavicon() {
  const { settings, ready } = useHomePageSettings();

  useEffect(() => {
    if (!ready) return;

    function applyFavicon() {
      const url = loadFaviconUrl()?.trim();
      let link = document.getElementById(FAVICON_LINK_ID) as HTMLLinkElement | null;

      if (!url) {
        link?.remove();
        return;
      }

      if (!link) {
        link = document.createElement("link");
        link.id = FAVICON_LINK_ID;
        link.rel = "icon";
        document.head.appendChild(link);
      }

      const isSvg = url.startsWith("data:image/svg+xml") || /\.svg(\?|$)/i.test(url);
      const isIco =
        url.startsWith("data:image/x-icon") || url.startsWith("data:image/vnd.microsoft.icon");
      link.type = isSvg ? "image/svg+xml" : isIco ? "image/x-icon" : "image/png";
      link.href = url;
    }

    applyFavicon();
    window.addEventListener(HOME_PAGE_SETTINGS_SYNC_EVENT, applyFavicon);
    return () => window.removeEventListener(HOME_PAGE_SETTINGS_SYNC_EVENT, applyFavicon);
  }, [ready, settings.favicon]);

  return null;
}
