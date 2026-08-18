"use client";

import type { ReactNode } from "react";
import { usePathname } from "@/i18n/routing";
import { AnnouncementBar } from "@/components/layout/announcement-bar";
import { SharedDataBanner } from "@/components/layout/shared-data-banner";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { isDashboardChromePath } from "@/lib/layout/dashboard-chrome";
import { cn } from "@/lib/utils";

/**
 * Site chrome. On dashboard routes the sidebar is full-height; header/footer
 * sit beside it instead of spanning over it.
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
      <div className={cn(dashboard && "lg:ms-[272px]")}>
        <Footer />
      </div>
    </div>
  );
}
