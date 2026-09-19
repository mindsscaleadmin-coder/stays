import type { MetadataRoute } from "next";
import { collectExtraSitemapUrls } from "@/lib/admin/seo-settings-data";
import { AI_CRAWLER_AGENTS, PUBLIC_DISALLOW_PATHS } from "@/lib/seo/ai-crawlers";
import { loadServerSeoSettings } from "@/lib/seo/resolve-server-seo";
import { absoluteUrl } from "@/lib/seo/site";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const settings = await loadServerSeoSettings();
  const extraSitemaps = collectExtraSitemapUrls(settings);
  const sitemap = [absoluteUrl("/sitemap.xml"), ...extraSitemaps];
  const disallow = [...PUBLIC_DISALLOW_PATHS];

  const publicRule = {
    userAgent: "*",
    allow: "/",
    disallow,
  };

  const aiRules = AI_CRAWLER_AGENTS.map((userAgent) =>
    settings.allowAiCrawlers
      ? { userAgent, allow: "/", disallow }
      : { userAgent, disallow: "/" }
  );

  return {
    rules: [publicRule, ...aiRules],
    sitemap: sitemap.length === 1 ? sitemap[0] : sitemap,
  };
}
