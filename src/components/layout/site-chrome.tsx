"use client";

import type { ReactNode } from "react";
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

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {!dashboard && <AnnouncementBar />}
      {!dashboard && <SharedDataBanner />}
      <Header />
      <main className="flex-1">{children}</main>
      {!dashboard && <Footer />}
    </div>
  );
}
