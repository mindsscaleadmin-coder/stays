import { describe, expect, it } from "vitest";
import {
  getPublishedBlogPosts,
  normalizeContentPolicy,
  slugifyBlogTitle,
} from "./content-policy-data";
import type { BlogPost, ContentPolicySettings } from "./content-policy-types";

describe("slugifyBlogTitle", () => {
  it("produces URL-safe slugs from titles", () => {
    expect(slugifyBlogTitle("Top 5 farm stays in Kerala")).toBe("top-5-farm-stays-in-kerala");
    expect(slugifyBlogTitle("  Hello, World!  ")).toBe("hello-world");
    expect(slugifyBlogTitle("What's new?")).toBe("whats-new");
  });

  it("falls back when title is empty", () => {
    const slug = slugifyBlogTitle("   ");
    expect(slug).toMatch(/^post-\d+$/);
  });
});

describe("getPublishedBlogPosts", () => {
  it("returns only published posts with titles, newest first", () => {
    const posts: BlogPost[] = [
      {
        id: "1",
        title: "Older",
        excerpt: "",
        slug: "older",
        published: true,
        publishedAt: "2026-01-01T00:00:00",
      },
      {
        id: "2",
        title: "Newer",
        excerpt: "",
        slug: "newer",
        published: true,
        publishedAt: "2026-06-01T00:00:00",
      },
      {
        id: "3",
        title: "Draft",
        excerpt: "",
        slug: "draft",
        published: false,
      },
      {
        id: "4",
        title: "   ",
        excerpt: "",
        slug: "empty",
        published: true,
        publishedAt: "2026-12-01T00:00:00",
      },
    ];

    const settings = normalizeContentPolicy({
      cms: { blogPosts: posts },
    } as Partial<ContentPolicySettings>);

    const published = getPublishedBlogPosts(settings);
    expect(published.map((p) => p.id)).toEqual(["2", "1"]);
  });

  it("normalizes body on merge", () => {
    const settings = normalizeContentPolicy({
      cms: {
        blogPosts: [
          {
            id: "b1",
            title: "Test",
            excerpt: " ex ",
            body: " full ",
            slug: "test",
            published: false,
          },
        ],
      },
    } as Partial<ContentPolicySettings>);

    expect(settings.cms.blogPosts[0].body).toBe("full");
    expect(settings.cms.blogPosts[0].excerpt).toBe("ex");
  });
});
