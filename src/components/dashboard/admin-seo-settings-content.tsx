"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Globe2, ImagePlus, RotateCcw, Search, Upload } from "lucide-react";
import { useAdminTaxonomy } from "@/components/providers/admin-taxonomy-provider";
import {
  DEFAULT_SEO_SETTINGS,
  mergeSeoSettings,
  saveSeoSettings,
} from "@/lib/admin/seo-settings-data";
import {
  SEO_LOGO_SPECS,
  SEO_OG_IMAGE_SPECS,
  type CountrySeoProfile,
} from "@/lib/admin/seo-settings-types";
import { useSeoSettings } from "@/lib/admin/use-seo-settings";
import { isCrawlerSafeImageUrl } from "@/lib/seo/market-url";
import { cn } from "@/lib/utils";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read file."));
    reader.readAsDataURL(file);
  });
}

const fieldClass =
  "w-full rounded-xl border border-gray-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500";

function ImageUploadField({
  label,
  hint,
  value,
  specs,
  onChange,
  onError,
}: {
  label: string;
  hint: string;
  value: string;
  specs: { maxFileBytes: number; accept: string; acceptLabel: string };
  onChange: (url: string) => void;
  onError: (message: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    if (!specs.accept.split(",").includes(file.type)) {
      onError(`Use ${specs.acceptLabel}.`);
      return;
    }
    if (file.size > specs.maxFileBytes) {
      onError(`Image is too large (${formatBytes(file.size)}).`);
      return;
    }
    setUploading(true);
    try {
      onChange(await fileToDataUrl(file));
    } catch (err) {
      onError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-2">
      <div>
        <p className="text-sm font-medium text-gray-700">{label}</p>
        <p className="text-xs text-gray-500">{hint}</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {value ? (
          <div className="relative h-16 w-16 overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
            <Image src={value} alt="" fill className="object-contain p-1" unoptimized />
          </div>
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50 text-gray-400">
            <ImagePlus className="h-5 w-5" />
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <Upload className="h-4 w-4" />
            {uploading ? "Uploading…" : "Upload"}
          </button>
          {value ? (
            <button
              type="button"
              onClick={() => onChange("")}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              Remove
            </button>
          ) : null}
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={specs.accept}
        className="hidden"
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />
      <input
        value={value.startsWith("data:") ? "" : value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Or paste a public HTTPS image URL"
        className={fieldClass}
      />
      {value && !isCrawlerSafeImageUrl(value) ? (
        <p className="text-xs text-amber-700">
          Uploaded files work in the browser, but Google, Meta, and AI crawlers need a public HTTPS
          URL for previews and rich results.
        </p>
      ) : null}
    </div>
  );
}

export function AdminSeoSettingsContent() {
  const { data: taxonomy } = useAdminTaxonomy();
  const { ready, settings, setFallback, updateProfile, ensureProfile, save } = useSeoSettings();
  const [message, setMessage] = useState("");
  const [uploadError, setUploadError] = useState("");

  const countries = useMemo(
    () =>
      taxonomy.countries
        .filter((country) => country.code)
        .sort((a, b) => (a.name || a.code || "").localeCompare(b.name || b.code || "")),
    [taxonomy.countries]
  );

  useEffect(() => {
    for (const country of countries) {
      if (country.code) ensureProfile(country.code);
    }
  }, [countries, ensureProfile]);

  if (!ready || !settings) {
    return <p className="text-sm text-gray-400">Loading…</p>;
  }

  function flash(text: string) {
    setMessage(text);
    setTimeout(() => setMessage(""), 2500);
  }

  function getProfile(countryCode: string): CountrySeoProfile {
    const code = countryCode.trim().toUpperCase();
    const current = settings!;
    return (
      current.profiles.find((profile) => profile.countryCode === code) ?? {
        countryCode: code,
        enabled: true,
        siteName: current.fallbackSiteName,
        metaDescription: current.fallbackMetaDescription,
        metaKeywords: current.fallbackMetaKeywords,
        logoUrl: current.fallbackLogoUrl,
        ogImageUrl: current.fallbackOgImageUrl,
        extraSitemapUrl: "",
        schemaOrganizationName: current.fallbackSiteName,
        schemaOrganizationUrl: "",
        schemaOrganizationLogo: current.fallbackLogoUrl,
        schemaOrganizationDescription: current.fallbackMetaDescription,
      }
    );
  }

  function resetDefaults() {
    const next = mergeSeoSettings(DEFAULT_SEO_SETTINGS);
    saveSeoSettings(next);
    save(next);
    flash("Reset to defaults.");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">SEO & branding</h1>
          <p className="mt-1 text-sm text-gray-500">
            Configure site name, logo, meta tags, schema markup, and optional extra sitemap URLs
            for each country market.
          </p>
        </div>
        <button
          type="button"
          onClick={resetDefaults}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <RotateCcw className="h-4 w-4" />
          Reset defaults
        </button>
      </div>

      {message ? (
        <p className="rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
          {message}
        </p>
      ) : null}
      {uploadError ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {uploadError}
        </p>
      ) : null}

      <section className="rounded-2xl border bg-white p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-green-600" />
          <h2 className="font-semibold text-gray-900">Global fallback</h2>
        </div>
        <p className="text-xs text-gray-500">
          Used when a country profile is disabled or a field is left blank. The main sitemap is
          auto-generated at <code className="text-xs">/sitemap.xml</code>. Country markets use
          <code className="text-xs">?market=IN</code> URLs for hreflang and AI crawlers.
        </p>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={settings.allowAiCrawlers}
            onChange={(e) => setFallback({ allowAiCrawlers: e.target.checked })}
            className="rounded border-gray-300 text-green-600 focus:ring-green-500"
          />
          Allow AI crawlers (ChatGPT, Claude, Perplexity, Google-Extended, Meta) in robots.txt
        </label>
        <label className="block">
          <span className="text-sm font-medium text-gray-700">Social profile URLs (schema sameAs)</span>
          <textarea
            value={settings.schemaSameAs}
            onChange={(e) => setFallback({ schemaSameAs: e.target.value })}
            rows={2}
            placeholder="https://facebook.com/yourpage, https://instagram.com/yourpage"
            className={`${fieldClass} mt-1 resize-y`}
          />
          <p className="mt-1 text-xs text-gray-500">
            Helps Google and AI tools connect your brand to official social profiles.
          </p>
        </label>
        <div className="grid gap-4 lg:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Site name</span>
            <input
              value={settings.fallbackSiteName}
              onChange={(e) => setFallback({ fallbackSiteName: e.target.value })}
              className={`${fieldClass} mt-1`}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Meta keywords</span>
            <input
              value={settings.fallbackMetaKeywords}
              onChange={(e) => setFallback({ fallbackMetaKeywords: e.target.value })}
              placeholder="farm stays, homestays, retreats"
              className={`${fieldClass} mt-1`}
            />
          </label>
        </div>
        <label className="block">
          <span className="text-sm font-medium text-gray-700">Meta description</span>
          <textarea
            value={settings.fallbackMetaDescription}
            onChange={(e) => setFallback({ fallbackMetaDescription: e.target.value })}
            rows={3}
            className={`${fieldClass} mt-1 resize-y`}
          />
        </label>
        <div className="grid gap-4 lg:grid-cols-2">
          <ImageUploadField
            label="Fallback logo"
            hint={`${SEO_LOGO_SPECS.recommendedWidth}×${SEO_LOGO_SPECS.recommendedHeight}px recommended`}
            value={settings.fallbackLogoUrl}
            specs={SEO_LOGO_SPECS}
            onChange={(url) => setFallback({ fallbackLogoUrl: url })}
            onError={setUploadError}
          />
          <ImageUploadField
            label="Fallback social image"
            hint={`${SEO_OG_IMAGE_SPECS.recommendedWidth}×${SEO_OG_IMAGE_SPECS.recommendedHeight}px recommended`}
            value={settings.fallbackOgImageUrl}
            specs={SEO_OG_IMAGE_SPECS}
            onChange={(url) => setFallback({ fallbackOgImageUrl: url })}
            onError={setUploadError}
          />
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <Globe2 className="h-4 w-4 text-green-600" />
          <h2 className="font-semibold text-gray-900">Country profiles</h2>
        </div>

        <ul className="space-y-4">
          {countries.map((country) => {
            const code = (country.code || "").toUpperCase();
            const profile = getProfile(code);
            return (
              <li
                key={country.id}
                className={cn(
                  "rounded-xl border p-4 space-y-4",
                  profile.enabled ? "border-gray-100 bg-gray-50/60" : "border-gray-100 bg-white"
                )}
              >
                <div className="flex flex-wrap items-center gap-3">
                  <div>
                    <p className="font-medium text-gray-900">
                      {country.flag ? `${country.flag} ` : ""}
                      {country.name}
                    </p>
                    <p className="text-xs text-gray-500">{code}</p>
                  </div>
                  <label className="ms-auto inline-flex items-center gap-2 text-sm text-gray-600">
                    <input
                      type="checkbox"
                      checked={profile.enabled}
                      onChange={(e) => updateProfile(code, { enabled: e.target.checked })}
                      className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                    />
                    Use country SEO
                  </label>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-medium text-gray-700">Site name</span>
                    <input
                      value={profile.siteName}
                      onChange={(e) => updateProfile(code, { siteName: e.target.value })}
                      className={`${fieldClass} mt-1`}
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium text-gray-700">Meta keywords</span>
                    <input
                      value={profile.metaKeywords}
                      onChange={(e) => updateProfile(code, { metaKeywords: e.target.value })}
                      className={`${fieldClass} mt-1`}
                    />
                  </label>
                </div>

                <label className="block">
                  <span className="text-sm font-medium text-gray-700">Meta description</span>
                  <textarea
                    value={profile.metaDescription}
                    onChange={(e) => updateProfile(code, { metaDescription: e.target.value })}
                    rows={2}
                    className={`${fieldClass} mt-1 resize-y`}
                  />
                </label>

                <div className="grid gap-4 lg:grid-cols-2">
                  <ImageUploadField
                    label="Logo"
                    hint="Used for favicon and schema logo when set"
                    value={profile.logoUrl}
                    specs={SEO_LOGO_SPECS}
                    onChange={(url) =>
                      updateProfile(code, {
                        logoUrl: url,
                        schemaOrganizationLogo: url || profile.schemaOrganizationLogo,
                      })
                    }
                    onError={setUploadError}
                  />
                  <ImageUploadField
                    label="Social share image"
                    hint="Open Graph / Twitter card image"
                    value={profile.ogImageUrl}
                    specs={SEO_OG_IMAGE_SPECS}
                    onChange={(url) => updateProfile(code, { ogImageUrl: url })}
                    onError={setUploadError}
                  />
                </div>

                <details className="rounded-xl border border-gray-200 bg-white p-4">
                  <summary className="cursor-pointer text-sm font-medium text-gray-800">
                    Schema.org & sitemap
                  </summary>
                  <div className="mt-4 space-y-3">
                    <div className="grid gap-3 lg:grid-cols-2">
                      <label className="block">
                        <span className="text-xs font-medium text-gray-600">Organization name</span>
                        <input
                          value={profile.schemaOrganizationName}
                          onChange={(e) =>
                            updateProfile(code, { schemaOrganizationName: e.target.value })
                          }
                          className={`${fieldClass} mt-1`}
                        />
                      </label>
                      <label className="block">
                        <span className="text-xs font-medium text-gray-600">Organization URL</span>
                        <input
                          value={profile.schemaOrganizationUrl}
                          onChange={(e) =>
                            updateProfile(code, { schemaOrganizationUrl: e.target.value })
                          }
                          placeholder="https://example.com"
                          className={`${fieldClass} mt-1`}
                        />
                      </label>
                    </div>
                    <label className="block">
                      <span className="text-xs font-medium text-gray-600">
                        Organization description
                      </span>
                      <textarea
                        value={profile.schemaOrganizationDescription}
                        onChange={(e) =>
                          updateProfile(code, { schemaOrganizationDescription: e.target.value })
                        }
                        rows={2}
                        className={`${fieldClass} mt-1 resize-y`}
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-medium text-gray-600">
                        Extra sitemap URL (optional)
                      </span>
                      <input
                        value={profile.extraSitemapUrl}
                        onChange={(e) => updateProfile(code, { extraSitemapUrl: e.target.value })}
                        placeholder="https://example.com/sitemap-in.xml"
                        className={`${fieldClass} mt-1`}
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Added to robots.txt alongside the main auto-generated sitemap.
                      </p>
                    </label>
                  </div>
                </details>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
