"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { usePathname } from "@/i18n/routing";
import { AnnouncementBar } from "@/components/layout/announcement-bar";
import { SharedDataBanner } from "@/components/layout/shared-data-banner";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { isDashboardChromePath } from "@/lib/layout/dashboard-chrome";

/**
 * Site chrome. Dashboard pages render their own sidebar beside the page.
 */
export function SiteChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const dashboard = isDashboardChromePath(pathname);
  const chromeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = chromeRef.current;
    if (!el) return;

    const syncChromeHeight = () => {
      document.documentElement.style.setProperty(
        "--site-chrome-height",
        `${el.getBoundingClientRect().height}px`
      );
    };

    syncChromeHeight();
    const observer = new ResizeObserver(syncChromeHeight);
    observer.observe(el);
    window.addEventListener("resize", syncChromeHeight);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", syncChromeHeight);
    };
  }, [dashboard]);

  return (
    <div className="min-h-screen w-full min-w-0 max-w-none bg-gray-50 flex flex-col">
      <div
        id="site-chrome"
        ref={chromeRef}
        className="sticky top-0 z-[100] w-full min-w-0 pt-[env(safe-area-inset-top)]"
      >
        {!dashboard && <AnnouncementBar />}
        {!dashboard && <SharedDataBanner />}
        <Header />
      </div>
      <main className="flex-1 w-full min-w-0">{children}</main>
      {!dashboard && <Footer />}
    </div>
  );
}
