"use client";

import { useHomePageSettings } from "@/components/providers/home-page-settings-provider";
import { getActiveAnnouncementItems } from "@/lib/admin/home-page-settings-data";

interface AnnouncementBarProps {
  preview?: boolean;
}

export function AnnouncementBar({ preview = false }: AnnouncementBarProps) {
  const { settings } = useHomePageSettings();
  const items = getActiveAnnouncementItems(settings.announcementItems);

  if (!preview && (!settings.announcementEnabled || items.length === 0)) {
    return null;
  }

  if (preview && items.length === 0) {
    return (
      <div className="bg-gray-100 text-gray-500 text-xs py-1.5 px-4 text-center">
        No active announcements to preview. Enable at least one message below.
      </div>
    );
  }

  const track = [...items, ...items];

  return (
    <div
      className="bg-amber-400 text-gray-900 text-xs py-1.5 announcement-marquee-wrapper"
      aria-label="Site announcements"
    >
      <div className="announcement-marquee-track">
        {track.map((item, index) => (
          <span key={`${item.id}-${index}`} className="announcement-marquee-item">
            {item.emoji} {item.text}
          </span>
        ))}
      </div>
    </div>
  );
}
