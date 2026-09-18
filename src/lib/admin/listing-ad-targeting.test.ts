import { describe, expect, it } from "vitest";
import {
  listingAdTargetingScore,
  pickListingAdsForContext,
} from "./listing-ad-targeting";
import type { ListingAdsSettings, ListingSidebarAd } from "./listing-ads-types";

function ad(
  partial: Partial<ListingSidebarAd> & Pick<ListingSidebarAd, "id" | "title">
): ListingSidebarAd {
  return {
    enabled: true,
    placement: "tall",
    eyebrow: "Sponsored",
    body: "",
    ctaLabel: "Go",
    ctaHref: "/",
    imageUrl: "",
    ...partial,
  };
}

describe("listingAdTargetingScore", () => {
  it("matches global ads on any context", () => {
    const score = listingAdTargetingScore(ad({ id: "a", title: "Global" }), {
      parent: "Stays",
      country: "India",
    });
    expect(score).toBe(0);
  });

  it("rejects ads when a targeted field does not match", () => {
    const score = listingAdTargetingScore(
      ad({
        id: "a",
        title: "Kerala",
        targeting: { state: "Kerala" },
      }),
      { country: "India" }
    );
    expect(score).toBe(-1);
  });

  it("prefers more specific targeting scores", () => {
    const parentOnly = listingAdTargetingScore(
      ad({ id: "a", title: "Stays", targeting: { parent: "Stays" } }),
      { parent: "Stays", category: "Homestays" }
    );
    const parentAndCategory = listingAdTargetingScore(
      ad({
        id: "b",
        title: "Homestays",
        targeting: { parent: "Stays", category: "Homestays" },
      }),
      { parent: "Stays", category: "Homestays" }
    );
    expect(parentOnly).toBeGreaterThan(0);
    expect(parentAndCategory).toBeGreaterThan(parentOnly);
  });
});

describe("pickListingAdsForContext", () => {
  const settings: ListingAdsSettings = {
    ads: [
      ad({ id: "global", title: "Global fallback", placement: "tall" }),
      ad({
        id: "stays",
        title: "Stays ad",
        placement: "tall",
        targeting: { parent: "Stays" },
      }),
      ad({
        id: "kerala",
        title: "Kerala ad",
        placement: "short",
        targeting: { country: "India", state: "Kerala" },
      }),
    ],
  };

  it("picks the most specific tall ad for taxonomy context", () => {
    const picked = pickListingAdsForContext(settings, {
      parent: "Stays",
      category: "Homestays",
    });
    expect(picked.tall?.id).toBe("stays");
    expect(picked.short).toBeNull();
  });

  it("picks location-targeted short ads", () => {
    const picked = pickListingAdsForContext(settings, {
      country: "India",
      state: "Kerala",
    });
    expect(picked.short?.id).toBe("kerala");
  });

  it("falls back to global ads when nothing else matches", () => {
    const picked = pickListingAdsForContext(settings, {
      parent: "Events",
    });
    expect(picked.tall?.id).toBe("global");
  });
});
