"use client";

import { useEffect } from "react";
import { SEO_SETTINGS_SYNC_EVENT } from "@/lib/admin/seo-settings-data";
import { useCountrySeo } from "@/lib/admin/use-country-seo";
import { isCrawlerSafeImageUrl, marketUrl } from "@/lib/seo/market-url";

function setMetaTag(
  selector: string,
  attributes: Record<string, string>,
  content: string
) {
  if (!content) return;
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement("meta");
    for (const [key, value] of Object.entries(attributes)) {
      element.setAttribute(key, value);
    }
    document.head.appendChild(element);
  }
  element.setAttribute("content", content);
}

function setLinkTag(rel: string, href: string) {
  if (!href) return;
  let element = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!element) {
    element = document.createElement("link");
    element.rel = rel;
    document.head.appendChild(element);
  }
  element.href = href;
}

/** Applies country-specific SEO tags when the visitor switches market. */
export function SiteSeoHead() {
  const { ready, seo, countryCode } = useCountrySeo();

  useEffect(() => {
    if (!ready) return;

    function apply() {
      const path = window.location.pathname;
      const pageUrl = marketUrl(path, countryCode);
      const ogLocale = seo.ogLocale.replace("_", "-");

      document.title = seo.siteName;
      setMetaTag('meta[name="description"]', { name: "description" }, seo.metaDescription);
      setMetaTag('meta[name="keywords"]', { name: "keywords" }, seo.metaKeywords);
      setMetaTag('meta[property="og:title"]', { property: "og:title" }, seo.siteName);
      setMetaTag(
        'meta[property="og:description"]',
        { property: "og:description" },
        seo.metaDescription
      );
      setMetaTag('meta[property="og:site_name"]', { property: "og:site_name" }, seo.siteName);
      setMetaTag('meta[property="og:url"]', { property: "og:url" }, pageUrl);
      setMetaTag('meta[property="og:locale"]', { property: "og:locale" }, ogLocale);
      setMetaTag('meta[name="twitter:title"]', { name: "twitter:title" }, seo.siteName);
      setMetaTag(
        'meta[name="twitter:description"]',
        { name: "twitter:description" },
        seo.metaDescription
      );

      if (isCrawlerSafeImageUrl(seo.ogImageUrl)) {
        setMetaTag('meta[property="og:image"]', { property: "og:image" }, seo.ogImageUrl);
        setMetaTag('meta[property="og:image:width"]', { property: "og:image:width" }, "1200");
        setMetaTag('meta[property="og:image:height"]', { property: "og:image:height" }, "630");
        setMetaTag('meta[name="twitter:image"]', { name: "twitter:image" }, seo.ogImageUrl);
      }

      if (isCrawlerSafeImageUrl(seo.logoUrl)) {
        setLinkTag("icon", seo.logoUrl);
      }

      setLinkTag("canonical", pageUrl);
    }

    apply();
    window.addEventListener(SEO_SETTINGS_SYNC_EVENT, apply);
    return () => window.removeEventListener(SEO_SETTINGS_SYNC_EVENT, apply);
  }, [ready, seo, countryCode]);

  return null;
}
