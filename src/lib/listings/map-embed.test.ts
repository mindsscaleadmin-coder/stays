import { describe, expect, it } from "vitest";
import { buildLocationMapEmbedUrl, parseMapEmbedUrl } from "@/lib/listings/map-embed";

describe("buildLocationMapEmbedUrl", () => {
  it("builds a Google Maps embed URL from a location query", () => {
    const url = buildLocationMapEmbedUrl("Al Ain, UAE", { zoom: 12 });
    expect(url).toContain("https://maps.google.com/maps?");
    expect(url).toContain("output=embed");
    expect(url).toContain("z=12");
    expect(new URL(url).searchParams.get("q")).toBe("Al Ain, UAE");
  });

  it("supports terrain map type for listing previews", () => {
    const url = buildLocationMapEmbedUrl("Kalba, UAE", { zoom: 6, mapType: "terrain" });
    expect(url).toContain("z=6");
    expect(url).toContain("t=p");
  });

  it("returns empty string for blank input", () => {
    expect(buildLocationMapEmbedUrl("   ")).toBe("");
  });
});

describe("parseMapEmbedUrl", () => {
  it("accepts Google Maps embed URLs", () => {
    const src = "https://www.google.com/maps/embed?pb=abc123";
    expect(parseMapEmbedUrl(src)).toBe(src);
  });
});
