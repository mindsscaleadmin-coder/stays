"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import {
  ChevronDown,
  ChevronUp,
  ImagePlus,
  Plus,
  RotateCcw,
  Trash2,
  Upload,
} from "lucide-react";
import { AnnouncementBar } from "@/components/layout/announcement-bar";
import { useHomePageSettings } from "@/components/providers/home-page-settings-provider";
import {
  HOME_PAGE_BANNER_SPECS,
  HOME_PAGE_FAVICON_SPECS,
} from "@/lib/admin/home-page-settings-types";
import { loadFaviconUrl, loadHeroBannerUrl } from "@/lib/admin/home-page-settings-data";
import { HERO_BG } from "@/lib/mock/data";
import { cn } from "@/lib/utils";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function readImageDimensions(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error("Could not read image dimensions."));
    img.src = src;
  });
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read file."));
    reader.readAsDataURL(file);
  });
}

export function AdminHomePageSettingsContent() {
  const {
    settings,
    setAnnouncementEnabled,
    addAnnouncementItem,
    updateAnnouncementItem,
    removeAnnouncementItem,
    reorderAnnouncementItem,
    resetAnnouncementItems,
    setHeroBanner,
    removeHeroBanner,
    setFavicon,
    removeFavicon,
  } = useHomePageSettings();
  const [message, setMessage] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [faviconError, setFaviconError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);

  const banner = settings.heroBanner;
  const favicon = settings.favicon;
  const previewSrc = banner?.url || loadHeroBannerUrl() || HERO_BG;
  const faviconPreviewSrc = favicon?.url || loadFaviconUrl();

  function flash(text: string) {
    setMessage(text);
    setTimeout(() => setMessage(""), 2500);
  }

  async function handleBannerFile(file: File | undefined) {
    setUploadError("");
    if (!file) return;

    const allowed = HOME_PAGE_BANNER_SPECS.accept.split(",");
    if (!allowed.includes(file.type)) {
      setUploadError(`Invalid format. Use ${HOME_PAGE_BANNER_SPECS.acceptLabel}.`);
      return;
    }
    if (file.size > HOME_PAGE_BANNER_SPECS.maxFileBytes) {
      setUploadError(
        `File is too large (${formatBytes(file.size)}). Max size is ${HOME_PAGE_BANNER_SPECS.maxFileLabel}.`
      );
      return;
    }

    setUploading(true);
    try {
      const url = await fileToDataUrl(file);
      const dims = await readImageDimensions(url);
      setHeroBanner({
        url,
        fileName: file.name,
        fileSize: file.size,
        width: dims.width,
        height: dims.height,
        updatedAt: new Date().toISOString(),
      });
      flash("Banner uploaded.");
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleFaviconFile(file: File | undefined) {
    setFaviconError("");
    if (!file) return;

    const allowed = HOME_PAGE_FAVICON_SPECS.accept.split(",");
    if (!allowed.includes(file.type) && !file.name.toLowerCase().endsWith(".ico")) {
      setFaviconError(`Invalid format. Use ${HOME_PAGE_FAVICON_SPECS.acceptLabel}.`);
      return;
    }
    if (file.size > HOME_PAGE_FAVICON_SPECS.maxFileBytes) {
      setFaviconError(
        `File is too large (${formatBytes(file.size)}). Max size is ${HOME_PAGE_FAVICON_SPECS.maxFileLabel}.`
      );
      return;
    }

    setUploadingFavicon(true);
    try {
      const url = await fileToDataUrl(file);
      let width: number | undefined;
      let height: number | undefined;
      try {
        const dims = await readImageDimensions(url);
        width = dims.width;
        height = dims.height;
      } catch {
        // ICO/SVG may not expose dimensions in all browsers
      }
      setFavicon({
        url,
        fileName: file.name,
        fileSize: file.size,
        width,
        height,
        updatedAt: new Date().toISOString(),
      });
      flash("Favicon uploaded.");
    } catch (err) {
      setFaviconError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploadingFavicon(false);
      if (faviconInputRef.current) faviconInputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 font-display">Home Page</h2>
        <p className="text-gray-500 text-sm mt-1">
          Manage the hero banner, favicon, and announcement ticker on the public site.
        </p>
      </div>

      {message && (
        <div className="bg-green-50 border border-green-200 text-green-800 text-sm rounded-xl px-4 py-3">
          {message}
        </div>
      )}

      <section className="bg-white rounded-2xl border shadow-sm p-5 space-y-4">
        <div>
          <h3 className="font-semibold text-gray-900">Homepage banner</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            Full-bleed hero image behind the search form on the homepage.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5">
            <p className="font-semibold text-gray-700 uppercase tracking-wide text-[10px]">
              Recommended size
            </p>
            <p className="text-gray-900 font-medium mt-1">
              {HOME_PAGE_BANNER_SPECS.recommendedWidth} × {HOME_PAGE_BANNER_SPECS.recommendedHeight} px
            </p>
            <p className="text-gray-500 mt-0.5">
              {HOME_PAGE_BANNER_SPECS.recommendedAspect} landscape
            </p>
          </div>
          <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5">
            <p className="font-semibold text-gray-700 uppercase tracking-wide text-[10px]">
              Max file size
            </p>
            <p className="text-gray-900 font-medium mt-1">{HOME_PAGE_BANNER_SPECS.maxFileLabel}</p>
            <p className="text-gray-500 mt-0.5">Compressed images work best</p>
          </div>
          <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5">
            <p className="font-semibold text-gray-700 uppercase tracking-wide text-[10px]">
              Formats
            </p>
            <p className="text-gray-900 font-medium mt-1">{HOME_PAGE_BANNER_SPECS.acceptLabel}</p>
            <p className="text-gray-500 mt-0.5">No GIF or SVG</p>
          </div>
        </div>

        <div className="relative h-48 sm:h-56 rounded-xl overflow-hidden border bg-gray-100">
          <Image
            src={previewSrc}
            alt="Homepage banner preview"
            fill
            className="object-cover"
            sizes="800px"
            unoptimized={previewSrc.startsWith("data:")}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/20 to-transparent" />
          <div className="absolute bottom-3 start-3 end-3 flex flex-wrap items-end justify-between gap-2">
            <div className="text-white text-xs">
              {banner ? (
                <>
                  <p className="font-semibold">{banner.fileName || "Custom banner"}</p>
                  <p className="text-white/80 mt-0.5">
                    {[
                      banner.width && banner.height
                        ? `${banner.width} × ${banner.height} px`
                        : null,
                      banner.fileSize ? formatBytes(banner.fileSize) : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </>
              ) : (
                <p className="font-semibold">Default banner in use</p>
              )}
            </div>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept={HOME_PAGE_BANNER_SPECS.accept}
          className="hidden"
          onChange={(e) => void handleBannerFile(e.target.files?.[0])}
        />

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg text-white",
              "bg-green-700 hover:bg-green-800 disabled:opacity-60"
            )}
          >
            {banner ? <Upload className="w-3.5 h-3.5" /> : <ImagePlus className="w-3.5 h-3.5" />}
            {uploading ? "Uploading…" : banner ? "Replace banner" : "Upload banner"}
          </button>
          {banner && (
            <button
              type="button"
              disabled={uploading}
              onClick={() => {
                removeHeroBanner();
                flash("Banner removed — default image will show.");
              }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-60"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Remove banner
            </button>
          )}
        </div>

        {uploadError && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {uploadError}
          </p>
        )}

        <p className="text-xs text-gray-400">
          Uploads are saved immediately and shown on the live homepage.
        </p>
      </section>

      <section className="bg-white rounded-2xl border shadow-sm p-5 space-y-4">
        <div>
          <h3 className="font-semibold text-gray-900">Favicon</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            Browser tab icon for the whole site. Changes apply immediately.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5">
            <p className="font-semibold text-gray-700 uppercase tracking-wide text-[10px]">
              Recommended size
            </p>
            <p className="text-gray-900 font-medium mt-1">
              {HOME_PAGE_FAVICON_SPECS.recommendedWidth} ×{" "}
              {HOME_PAGE_FAVICON_SPECS.recommendedHeight} px
            </p>
            <p className="text-gray-500 mt-0.5">{HOME_PAGE_FAVICON_SPECS.recommendedSizes}</p>
          </div>
          <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5">
            <p className="font-semibold text-gray-700 uppercase tracking-wide text-[10px]">
              Max file size
            </p>
            <p className="text-gray-900 font-medium mt-1">{HOME_PAGE_FAVICON_SPECS.maxFileLabel}</p>
            <p className="text-gray-500 mt-0.5">Keep it small for fast loads</p>
          </div>
          <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5">
            <p className="font-semibold text-gray-700 uppercase tracking-wide text-[10px]">
              Formats
            </p>
            <p className="text-gray-900 font-medium mt-1">{HOME_PAGE_FAVICON_SPECS.acceptLabel}</p>
            <p className="text-gray-500 mt-0.5">Square works best</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="w-16 h-16 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden shrink-0">
            {faviconPreviewSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={faviconPreviewSrc} alt="Favicon preview" className="w-10 h-10 object-contain" />
            ) : (
              <span className="text-[10px] text-gray-400 text-center px-1">Default</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            {favicon ? (
              <>
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {favicon.fileName || "Custom favicon"}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {[
                    favicon.width && favicon.height
                      ? `${favicon.width} × ${favicon.height} px`
                      : null,
                    favicon.fileSize ? formatBytes(favicon.fileSize) : null,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "Ready to publish"}
                </p>
              </>
            ) : (
              <p className="text-sm text-gray-500">No custom favicon — browser uses the site default.</p>
            )}
          </div>
        </div>

        <input
          ref={faviconInputRef}
          type="file"
          accept={HOME_PAGE_FAVICON_SPECS.accept}
          className="hidden"
          onChange={(e) => void handleFaviconFile(e.target.files?.[0])}
        />

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={uploadingFavicon}
            onClick={() => faviconInputRef.current?.click()}
            className={cn(
              "inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg text-white",
              "bg-green-700 hover:bg-green-800 disabled:opacity-60"
            )}
          >
            {favicon ? <Upload className="w-3.5 h-3.5" /> : <ImagePlus className="w-3.5 h-3.5" />}
            {uploadingFavicon ? "Uploading…" : favicon ? "Replace favicon" : "Upload favicon"}
          </button>
          {favicon && (
            <button
              type="button"
              disabled={uploadingFavicon}
              onClick={() => {
                removeFavicon();
                flash("Favicon removed — default icon will show.");
              }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-60"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Remove favicon
            </button>
          )}
        </div>

        {faviconError && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {faviconError}
          </p>
        )}
      </section>

      <section className="bg-white rounded-2xl border shadow-sm p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-gray-900">Announcement bar</h3>
            <p className="text-sm text-gray-500 mt-0.5">
              Messages scroll left to right in a continuous loop.
            </p>
          </div>
          <label className="inline-flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.announcementEnabled}
              onChange={(e) => {
                setAnnouncementEnabled(e.target.checked);
                flash(e.target.checked ? "Announcement bar enabled." : "Announcement bar hidden.");
              }}
              className="rounded border-gray-300 text-green-600 focus:ring-green-500"
            />
            Show on site
          </label>
        </div>

        <div className="rounded-xl overflow-hidden border">
          <AnnouncementBar preview />
        </div>
      </section>

      <section className="bg-white rounded-2xl border shadow-sm p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="font-semibold text-gray-900">Ticker messages</h3>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                resetAnnouncementItems();
                flash("Restored default announcement messages.");
              }}
              className="inline-flex items-center gap-1.5 text-xs border border-gray-200 hover:border-gray-300 text-gray-600 px-3 py-1.5 rounded-lg font-medium"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset defaults
            </button>
            <button
              type="button"
              onClick={() => {
                addAnnouncementItem({
                  emoji: "📢",
                  text: "New announcement",
                  enabled: true,
                });
                flash("Announcement added.");
              }}
              className="inline-flex items-center gap-1.5 text-xs bg-green-700 hover:bg-green-800 text-white px-3 py-1.5 rounded-lg font-medium"
            >
              <Plus className="w-3.5 h-3.5" />
              Add message
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {settings.announcementItems.map((item, index) => (
            <div
              key={item.id}
              className="border border-gray-200 rounded-xl p-4 grid grid-cols-1 md:grid-cols-[auto_1fr_auto] gap-3 items-start"
            >
              <label className="block">
                <span className="block text-[10px] font-semibold uppercase tracking-wide text-gray-500 mb-1">
                  Emoji
                </span>
                <input
                  value={item.emoji}
                  onChange={(e) => updateAnnouncementItem(item.id, { emoji: e.target.value })}
                  className="w-16 border border-gray-200 rounded-lg px-2 py-2 text-center text-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </label>

              <label className="block">
                <span className="block text-[10px] font-semibold uppercase tracking-wide text-gray-500 mb-1">
                  Message
                </span>
                <input
                  value={item.text}
                  onChange={(e) => updateAnnouncementItem(item.id, { text: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Announcement text"
                />
              </label>

              <div className="flex items-center gap-2 md:justify-end md:pt-5">
                <label className="inline-flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={item.enabled}
                    onChange={(e) =>
                      updateAnnouncementItem(item.id, { enabled: e.target.checked })
                    }
                    className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                  Active
                </label>
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() => reorderAnnouncementItem(item.id, "up")}
                  className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:text-gray-800 disabled:opacity-40"
                  aria-label="Move up"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  disabled={index === settings.announcementItems.length - 1}
                  onClick={() => reorderAnnouncementItem(item.id, "down")}
                  className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:text-gray-800 disabled:opacity-40"
                  aria-label="Move down"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    removeAnnouncementItem(item.id);
                    flash("Announcement removed.");
                  }}
                  className="p-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                  aria-label="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
