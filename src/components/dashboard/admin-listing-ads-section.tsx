"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ImagePlus, Plus, Trash2, Upload } from "lucide-react";
import { ListingAdTargetingFields } from "@/components/dashboard/listing-ad-targeting-fields";
import { emptyListingAd } from "@/lib/admin/listing-ads-data";
import { useListingAds } from "@/lib/admin/use-listing-ads";

const fieldClass =
  "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500";

const AD_IMAGE_ACCEPT = "image/jpeg,image/png,image/webp";
const AD_IMAGE_MAX_BYTES = 1_500_000;

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read image file."));
    reader.readAsDataURL(file);
  });
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function ListingAdImageField({
  imageUrl,
  onChange,
  onNotice,
}: {
  imageUrl: string;
  onChange: (url: string) => void;
  onNotice: (text: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const isUploadedFile = imageUrl.startsWith("data:image/");

  async function handleFile(file: File | undefined) {
    setError("");
    if (!file) return;
    if (!AD_IMAGE_ACCEPT.split(",").includes(file.type)) {
      setError("Use JPG, PNG, or WebP.");
      return;
    }
    if (file.size > AD_IMAGE_MAX_BYTES) {
      setError(`Image is too large (${formatBytes(file.size)}). Max is 1.5 MB.`);
      return;
    }

    setUploading(true);
    try {
      const url = await fileToDataUrl(file);
      onChange(url);
      onNotice("Ad image uploaded.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-2">
      <div>
        <span className="text-xs font-medium text-gray-600 block">Image (optional)</span>
        <p className="text-xs text-gray-500 mt-0.5">
          Upload from your computer or paste a public image link (https://…). Recommended: tall ads
          ~800×1200px, short ads ~800×400px.
        </p>
      </div>

      {imageUrl ? (
        <div className="relative h-28 w-full max-w-xs overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
          <Image src={imageUrl} alt="" fill className="object-cover" sizes="320px" unoptimized />
        </div>
      ) : (
        <div className="flex h-28 w-full max-w-xs items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white text-gray-400">
          <ImagePlus className="h-8 w-8" />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept={AD_IMAGE_ACCEPT}
          className="hidden"
          onChange={(e) => void handleFile(e.target.files?.[0])}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          <Upload className="h-4 w-4" />
          {uploading ? "Uploading…" : imageUrl ? "Replace image" : "Upload image"}
        </button>
        {imageUrl ? (
          <button
            type="button"
            onClick={() => {
              onChange("");
              onNotice("Ad image removed.");
            }}
            className="text-sm font-medium text-red-600 hover:text-red-800"
          >
            Remove
          </button>
        ) : null}
      </div>

      <label className="block">
        <span className="text-xs font-medium text-gray-600 mb-1 block">Or paste image URL</span>
        <input
          value={isUploadedFile ? "" : imageUrl}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => onNotice("Ad saved.")}
          placeholder={isUploadedFile ? "Uploaded image saved — paste a URL to replace" : "https://…"}
          className={fieldClass}
        />
      </label>

      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}

export function AdminListingAdsSection({ onNotice }: { onNotice?: (message: string) => void }) {
  const { ready, settings, updateAd, addAd, removeAd } = useListingAds();

  function notice(text: string) {
    onNotice?.(text);
  }

  if (!ready || !settings) {
    return <p className="text-sm text-gray-400">Loading ads…</p>;
  }

  return (
    <section className="bg-white rounded-2xl border shadow-sm p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-display font-semibold text-gray-900">Listings sidebar</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            Contextual sidebar ads on search results — target by location and taxonomy. Tall fills
            the sponsored card; short fills the smaller slot.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            addAd(emptyListingAd());
            notice("Sidebar ad added.");
          }}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-green-800 border border-green-200 hover:bg-green-50 px-3 py-1.5 rounded-lg"
        >
          <Plus className="w-4 h-4" /> Add ad
        </button>
      </div>

      {settings.ads.length === 0 ? (
        <p className="text-sm text-gray-500">No ads yet. Add one to show on listings.</p>
      ) : (
        <ul className="space-y-4">
          {settings.ads.map((ad) => (
            <li
              key={ad.id}
              className="border border-gray-100 rounded-xl p-4 bg-gray-50/50 space-y-3"
            >
              <div className="flex flex-wrap items-center gap-3">
                <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={ad.enabled}
                    onChange={(e) => {
                      updateAd(ad.id, { enabled: e.target.checked });
                      notice(`Ad ${e.target.checked ? "enabled" : "disabled"}.`);
                    }}
                    className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                  On
                </label>
                <select
                  value={ad.placement}
                  onChange={(e) => {
                    updateAd(ad.id, {
                      placement: e.target.value === "short" ? "short" : "tall",
                    });
                    notice("Ad placement saved.");
                  }}
                  className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm bg-white"
                >
                  <option value="tall">Tall (sponsored)</option>
                  <option value="short">Short</option>
                </select>
                <button
                  type="button"
                  onClick={() => {
                    removeAd(ad.id);
                    notice("Ad removed.");
                  }}
                  className="ms-auto inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-800"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Remove
                </button>
              </div>
              <ListingAdTargetingFields
                ad={ad}
                onChange={(targeting) => {
                  updateAd(ad.id, { targeting });
                  notice("Ad targeting saved.");
                }}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs font-medium text-gray-600 mb-1 block">Eyebrow</span>
                  <input
                    value={ad.eyebrow}
                    onChange={(e) => updateAd(ad.id, { eyebrow: e.target.value })}
                    onBlur={() => notice("Ad saved.")}
                    className={fieldClass}
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-gray-600 mb-1 block">Title</span>
                  <input
                    value={ad.title}
                    onChange={(e) => updateAd(ad.id, { title: e.target.value })}
                    onBlur={() => notice("Ad saved.")}
                    className={fieldClass}
                  />
                </label>
              </div>
              <label className="block">
                <span className="text-xs font-medium text-gray-600 mb-1 block">Body</span>
                <textarea
                  value={ad.body}
                  onChange={(e) => updateAd(ad.id, { body: e.target.value })}
                  onBlur={() => notice("Ad saved.")}
                  rows={2}
                  className={`${fieldClass} resize-y`}
                />
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs font-medium text-gray-600 mb-1 block">
                    Button label
                  </span>
                  <input
                    value={ad.ctaLabel}
                    onChange={(e) => updateAd(ad.id, { ctaLabel: e.target.value })}
                    onBlur={() => notice("Ad saved.")}
                    className={fieldClass}
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-gray-600 mb-1 block">
                    Button link
                  </span>
                  <input
                    value={ad.ctaHref}
                    onChange={(e) => updateAd(ad.id, { ctaHref: e.target.value })}
                    onBlur={() => notice("Ad saved.")}
                    className={fieldClass}
                  />
                </label>
              </div>
              <ListingAdImageField
                imageUrl={ad.imageUrl}
                onChange={(imageUrl) => updateAd(ad.id, { imageUrl })}
                onNotice={notice}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
