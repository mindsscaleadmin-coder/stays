"use client";

import { useMemo, useRef, useState } from "react";
import Image from "next/image";
import { ImagePlus, Loader2, Plus, Trash2, Upload } from "lucide-react";
import { slugifyBlogTitle } from "@/lib/admin/content-policy-data";
import { useAdminContentPolicy } from "@/lib/admin/use-admin-content-policy";
import type { BlogPost } from "@/lib/admin/content-policy-types";
import { cn } from "@/lib/utils";

const fieldClass =
  "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500";

const BLOG_IMAGE_ACCEPT = "image/jpeg,image/png,image/webp";
const BLOG_IMAGE_MAX_BYTES = 1_500_000;

type BlogFilter = "all" | "published" | "drafts";

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

function formatPublishedDate(iso?: string): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function BlogPostImageField({
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
    if (!BLOG_IMAGE_ACCEPT.split(",").includes(file.type)) {
      setError("Use JPG, PNG, or WebP.");
      return;
    }
    if (file.size > BLOG_IMAGE_MAX_BYTES) {
      setError(`Image is too large (${formatBytes(file.size)}). Max is 1.5 MB.`);
      return;
    }

    setUploading(true);
    try {
      const url = await fileToDataUrl(file);
      onChange(url);
      onNotice("Post image uploaded.");
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
        <span className="text-xs font-medium text-gray-600 block">Cover image (optional)</span>
        <p className="text-xs text-gray-500 mt-0.5">
          Upload from your computer or paste a public image link. Shown on the homepage when set.
        </p>
      </div>

      {imageUrl ? (
        <div className="relative h-32 w-full max-w-sm overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
          <Image src={imageUrl} alt="" fill className="object-cover" sizes="384px" unoptimized />
        </div>
      ) : (
        <div className="flex h-32 w-full max-w-sm items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white text-gray-400">
          <ImagePlus className="h-8 w-8" />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept={BLOG_IMAGE_ACCEPT}
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
              onNotice("Post image removed.");
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
          placeholder={isUploadedFile ? "Uploaded image saved — paste a URL to replace" : "https://…"}
          className={fieldClass}
        />
      </label>

      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}

function BlogPostCard({
  post,
  onUpdate,
  onRemove,
  onNotice,
}: {
  post: BlogPost;
  onUpdate: (patch: Partial<BlogPost>) => void;
  onRemove: () => void;
  onNotice: (text: string) => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <article className="border border-gray-100 rounded-xl p-4 space-y-3 bg-white">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex-1 min-w-[200px] space-y-2">
          <label className="block">
            <span className="text-xs font-medium text-gray-600">Title</span>
            <input
              value={post.title}
              onChange={(e) => onUpdate({ title: e.target.value })}
              className={cn(fieldClass, "font-semibold mt-1")}
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-gray-600">URL slug</span>
            <input
              value={post.slug}
              onChange={(e) => onUpdate({ slug: e.target.value })}
              placeholder="url-slug"
              className={cn(fieldClass, "mt-1 font-mono text-xs")}
            />
          </label>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={post.published}
              onChange={(e) =>
                onUpdate({
                  published: e.target.checked,
                  publishedAt: e.target.checked ? new Date().toISOString() : undefined,
                })
              }
              className="rounded border-gray-300 text-green-600 focus:ring-green-500"
            />
            Published
          </label>
          <p className="text-xs text-gray-500">
            {post.published ? `Live since ${formatPublishedDate(post.publishedAt)}` : "Draft"}
          </p>
        </div>
      </div>

      <label className="block">
        <span className="text-xs font-medium text-gray-600">Excerpt</span>
        <p className="text-xs text-gray-500 mt-0.5">Short summary shown on the homepage blog section.</p>
        <textarea
          value={post.excerpt}
          onChange={(e) => onUpdate({ excerpt: e.target.value })}
          rows={2}
          placeholder="A brief summary for listing cards…"
          className={cn(fieldClass, "resize-none mt-1")}
        />
      </label>

      <label className="block">
        <span className="text-xs font-medium text-gray-600">Body</span>
        <p className="text-xs text-gray-500 mt-0.5">
          Full article text (stored for future use; homepage uses excerpt only).
        </p>
        <textarea
          value={post.body ?? ""}
          onChange={(e) => onUpdate({ body: e.target.value })}
          rows={6}
          placeholder="Full article content…"
          className={cn(fieldClass, "resize-y mt-1")}
        />
      </label>

      <BlogPostImageField
        imageUrl={post.imageUrl ?? ""}
        onChange={(url) => onUpdate({ imageUrl: url || undefined })}
        onNotice={onNotice}
      />

      <div className="flex items-center justify-end gap-2 pt-1 border-t border-gray-100">
        {confirmDelete ? (
          <>
            <span className="text-xs text-gray-600">Delete this post?</span>
            <button
              type="button"
              onClick={() => {
                onRemove();
                setConfirmDelete(false);
              }}
              className="text-xs font-semibold text-red-700 hover:text-red-900"
            >
              Yes, delete
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              className="text-xs text-gray-600 hover:text-gray-900"
            >
              Cancel
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-800"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete post
          </button>
        )}
      </div>
    </article>
  );
}

export function AdminBlogContent() {
  const { ready, settings, addBlogPost, updateBlogPost, removeBlogPost } = useAdminContentPolicy();
  const [message, setMessage] = useState("");
  const [filter, setFilter] = useState<BlogFilter>("all");

  function flash(text: string) {
    setMessage(text);
    setTimeout(() => setMessage(""), 3000);
  }

  const summary = useMemo(() => {
    const posts = settings.cms.blogPosts;
    return {
      total: posts.length,
      published: posts.filter((p) => p.published).length,
      drafts: posts.filter((p) => !p.published).length,
    };
  }, [settings.cms.blogPosts]);

  const filteredPosts = useMemo(() => {
    const posts = settings.cms.blogPosts;
    if (filter === "published") return posts.filter((p) => p.published);
    if (filter === "drafts") return posts.filter((p) => !p.published);
    return posts;
  }, [settings.cms.blogPosts, filter]);

  if (!ready) {
    return (
      <div className="flex items-center justify-center min-h-[320px]">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900 font-display">Blog</h2>
          <p className="text-gray-500 text-sm mt-1">
            Manage homepage blog posts. Published posts with a title appear on the public homepage
            (up to three, newest first).
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            const title = "New post";
            addBlogPost({
              title,
              excerpt: "",
              body: "",
              slug: slugifyBlogTitle(title),
              published: false,
            });
            flash("Draft post added.");
          }}
          className="inline-flex items-center gap-1.5 bg-green-700 hover:bg-green-800 text-white text-sm font-semibold px-4 py-2 rounded-lg"
        >
          <Plus className="w-4 h-4" />
          Add post
        </button>
      </div>

      {message && (
        <div className="bg-green-50 border border-green-200 text-green-800 text-sm rounded-xl px-4 py-3">
          {message}
        </div>
      )}

      <section className="bg-gradient-to-br from-green-50 to-white rounded-2xl border border-green-100 p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-green-800">Summary</p>
        <div className="grid grid-cols-3 gap-3 mt-3">
          <div className="bg-white/80 border border-green-100 rounded-xl px-3 py-3">
            <p className="text-[10px] uppercase tracking-wide text-gray-500">Total posts</p>
            <p className="text-sm font-semibold text-gray-900 mt-1">{summary.total}</p>
          </div>
          <div className="bg-white/80 border border-green-100 rounded-xl px-3 py-3">
            <p className="text-[10px] uppercase tracking-wide text-gray-500">Published</p>
            <p className="text-sm font-semibold text-gray-900 mt-1">{summary.published}</p>
          </div>
          <div className="bg-white/80 border border-green-100 rounded-xl px-3 py-3">
            <p className="text-[10px] uppercase tracking-wide text-gray-500">Drafts</p>
            <p className="text-sm font-semibold text-gray-900 mt-1">{summary.drafts}</p>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        {(
          [
            { key: "all", label: "All" },
            { key: "published", label: "Published" },
            { key: "drafts", label: "Drafts" },
          ] as const
        ).map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setFilter(item.key)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
              filter === item.key
                ? "bg-green-700 text-white"
                : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {filteredPosts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
          {filter === "all"
            ? "No blog posts yet. Add one to get started."
            : `No ${filter === "published" ? "published" : "draft"} posts.`}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPosts.map((post) => (
            <BlogPostCard
              key={post.id}
              post={post}
              onUpdate={(patch) => updateBlogPost(post.id, patch)}
              onRemove={() => {
                removeBlogPost(post.id);
                flash("Post removed.");
              }}
              onNotice={flash}
            />
          ))}
        </div>
      )}
    </div>
  );
}
