"use client";

import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/routing";
import {
  AlertTriangle,
  Award,
  CheckCircle2,
  Flag,
  Loader2,
  MessageSquare,
  Plus,
  RotateCcw,
  Search,
  ShieldAlert,
  Star,
  Trash2,
  XCircle,
} from "lucide-react";
import { AdminDashboardShell } from "./admin-dashboard-shell";
import { useAdminTrust } from "@/lib/admin/use-admin-trust";
import type { FlatHostReview, TrustBadgeDefinition } from "@/lib/admin/trust-data";
import { newBadgeCatalogId } from "@/lib/admin/trust-data";
import { cn } from "@/lib/utils";

type TabId = "reviews" | "hosts" | "certificates" | "badges";

const TABS: { id: TabId; label: string }[] = [
  { id: "reviews", label: "Moderate reviews" },
  { id: "hosts", label: "Flagged hosts" },
  { id: "certificates", label: "Certificates" },
  { id: "badges", label: "Badge catalog" },
];

const inputClass =
  "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-green-500";

const MOD_STYLES: Record<string, string> = {
  visible: "bg-green-100 text-green-700",
  flagged: "bg-orange-100 text-orange-700",
  removed: "bg-red-100 text-red-700",
};

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5 text-amber-600">
      <Star className="w-3.5 h-3.5 fill-current" />
      <span className="text-xs font-bold">{rating}</span>
    </span>
  );
}

function ReviewCard({
  review,
  onRemove,
  onRestore,
  onFlag,
}: {
  review: FlatHostReview;
  onRemove: () => void;
  onRestore: () => void;
  onFlag: () => void;
}) {
  const status = review.moderationStatus ?? "visible";

  return (
    <article className={cn("bg-white rounded-2xl border p-4 sm:p-5 space-y-3", status === "removed" && "opacity-70")}>
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-gray-900">{review.guestName}</h3>
            <StarRating rating={review.rating} />
            <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full capitalize", MOD_STYLES[status])}>
              {status}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {review.property} · {review.hostName} · {review.date}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          {status !== "removed" && (
            <>
              <button type="button" onClick={onFlag} className="text-xs font-semibold text-orange-700 border border-orange-200 hover:bg-orange-50 px-3 py-1.5 rounded-lg inline-flex items-center gap-1">
                <Flag className="w-3.5 h-3.5" /> Flag
              </button>
              <button
                type="button"
                onClick={onRemove}
                className="text-xs font-semibold text-red-600 border border-red-200 hover:bg-red-50 px-3 py-1.5 rounded-lg inline-flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" /> Remove
              </button>
            </>
          )}
          {status === "removed" && (
            <button type="button" onClick={onRestore} className="text-xs font-semibold text-green-700 border border-green-200 hover:bg-green-50 px-3 py-1.5 rounded-lg inline-flex items-center gap-1">
              <RotateCcw className="w-3.5 h-3.5" /> Restore
            </button>
          )}
        </div>
      </div>
      <p className="text-sm text-gray-700">{review.text}</p>
      {review.removedReason && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          Removed: {review.removedReason}
        </p>
      )}
      {review.hostResponse && (
        <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
          Host response: {review.hostResponse}
        </p>
      )}
    </article>
  );
}

export function AdminTrustContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab") as TabId | null;
  const activeTab: TabId = TABS.some((t) => t.id === tabParam) ? tabParam! : "reviews";

  const {
    ready,
    settings,
    reviews,
    hostFlags,
    pendingCerts,
    flaggedReviewCount,
    flaggedHostCount,
    pendingCertCount,
    removeReview,
    restoreReview,
    flagReview,
    toggleHostFlag,
    approveCert,
    rejectCert,
    saveBadges,
  } = useAdminTrust();

  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [modFilter, setModFilter] = useState<"" | "flagged" | "removed" | "visible">("");
  const [newBadge, setNewBadge] = useState({ label: "", description: "" });

  const setTab = useCallback(
    (tab: TabId) => router.replace(`/admin/trust?tab=${tab}`),
    [router]
  );

  function flash(text: string) {
    setMessage(text);
    setTimeout(() => setMessage(""), 3000);
  }

  const filteredReviews = useMemo(() => {
    const q = query.trim().toLowerCase();
    return reviews.filter((r) => {
      if (modFilter && (r.moderationStatus ?? "visible") !== modFilter) return false;
      if (!q) return true;
      return [r.guestName, r.hostName, r.property, r.text].join(" ").toLowerCase().includes(q);
    });
  }, [reviews, query, modFilter]);

  if (!ready) {
    return (
      <AdminDashboardShell>
        <div className="flex items-center justify-center min-h-[320px]">
          <Loader2 className="w-8 h-8 animate-spin text-green-600" />
        </div>
      </AdminDashboardShell>
    );
  }

  return (
    <AdminDashboardShell>
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 font-display">Reviews & Trust Management</h2>
          <p className="text-gray-500 text-sm mt-1">
            Moderate guest reviews, flag unreliable hosts, and approve verification badges.
            {(flaggedReviewCount > 0 || pendingCertCount > 0) && (
              <span className="text-amber-600 font-medium">
                {flaggedReviewCount > 0 && ` ${flaggedReviewCount} flagged review${flaggedReviewCount === 1 ? "" : "s"}.`}
                {pendingCertCount > 0 && ` ${pendingCertCount} certificate${pendingCertCount === 1 ? "" : "s"} pending.`}
              </span>
            )}
          </p>
        </div>

        {message && (
          <div className="bg-green-50 border border-green-200 text-green-800 text-sm rounded-xl px-4 py-3">{message}</div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Total reviews", value: reviews.length, icon: MessageSquare },
            { label: "Flagged reviews", value: flaggedReviewCount, icon: Flag },
            { label: "Flagged hosts", value: flaggedHostCount, icon: ShieldAlert },
            { label: "Pending certs", value: pendingCertCount, icon: Award },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border bg-white p-4 shadow-sm">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">{s.label}</p>
              <p className="text-2xl font-bold font-display text-gray-900 mt-1">{s.value}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 border-b pb-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setTab(tab.id)}
              className={cn(
                "text-sm font-medium px-3 py-2 rounded-t-lg border-b-2 -mb-px transition-colors whitespace-nowrap",
                activeTab === tab.id
                  ? "border-green-700 text-green-800 bg-green-50/80"
                  : "border-transparent text-gray-500 hover:text-gray-800"
              )}
            >
              {tab.label}
              {tab.id === "reviews" && flaggedReviewCount > 0 && (
                <span className="ms-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700">{flaggedReviewCount}</span>
              )}
              {tab.id === "certificates" && pendingCertCount > 0 && (
                <span className="ms-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">{pendingCertCount}</span>
              )}
            </button>
          ))}
        </div>

        {activeTab === "reviews" && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute start-3 top-1/2 -translate-y-1/2" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search reviews…" className={cn(inputClass, "ps-9")} />
              </div>
              <select value={modFilter} onChange={(e) => setModFilter(e.target.value as typeof modFilter)} className={inputClass}>
                <option value="">All statuses</option>
                <option value="visible">Visible</option>
                <option value="flagged">Flagged</option>
                <option value="removed">Removed</option>
              </select>
            </div>
            <div className="space-y-3">
              {filteredReviews.length === 0 ? (
                <div className="bg-white rounded-2xl border p-8 text-center text-sm text-gray-400">No reviews match.</div>
              ) : (
                filteredReviews.map((r) => (
                  <ReviewCard
                    key={`${r.hostId}-${r.id}`}
                    review={r}
                    onFlag={() => { flagReview(r.hostId, r.id); flash("Review flagged."); }}
                    onRemove={() => {
                      const reason = prompt("Reason for removal (fake, abusive, etc.):") ?? "";
                      if (reason === null) return;
                      removeReview(r.hostId, r.id, reason);
                      flash("Review removed.");
                    }}
                    onRestore={() => { restoreReview(r.hostId, r.id); flash("Review restored."); }}
                  />
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === "hosts" && (
          <div className="space-y-3">
            <p className="text-xs text-gray-500 flex items-start gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              Hosts are auto-flagged with 2+ poor reviews (≤2★) or average below 3.5★ with 3+ reviews.
            </p>
            {hostFlags.length === 0 ? (
              <div className="bg-white rounded-2xl border p-8 text-center text-sm text-gray-400">No host review data.</div>
            ) : (
              hostFlags.map((h) => (
                <article key={h.hostId} className={cn("bg-white rounded-2xl border p-4 sm:p-5", h.flagged && "border-orange-200 bg-orange-50/30")}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-gray-900">{h.hostName}</h3>
                        {h.flagged && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 inline-flex items-center gap-1">
                            <ShieldAlert className="w-3 h-3" /> Flagged
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {h.totalReviews} reviews · avg {h.avgRating}★ · {h.poorReviewCount} poor
                      </p>
                      {h.flagged && h.reason && (
                        <p className="text-xs text-orange-700 mt-1.5">{h.reason}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        toggleHostFlag(h.hostId);
                        flash(h.flagged ? "Manual flag cleared." : "Host manually flagged.");
                      }}
                      className="text-xs font-semibold border px-3 py-1.5 rounded-lg shrink-0"
                    >
                      {settings.manualHostFlags.includes(h.hostId) ? "Clear manual flag" : "Flag manually"}
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        )}

        {activeTab === "certificates" && (
          <div className="space-y-3">
            {pendingCerts.length === 0 ? (
              <div className="bg-white rounded-2xl border p-8 text-center">
                <Award className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-700">No pending certificate submissions</p>
                <p className="text-xs text-gray-400 mt-1">Host-submitted badges appear here for approval.</p>
              </div>
            ) : (
              pendingCerts.map(({ hostId, hostName, certification: cert }) => (
                <article key={`${hostId}-${cert.id}`} className="bg-white rounded-2xl border p-5 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-gray-900">{cert.label}</h3>
                      <p className="text-sm text-gray-500">{hostName}</p>
                      <p className="text-sm text-gray-700 mt-2">{cert.description}</p>
                      {cert.documentName && (
                        <p className="text-xs text-gray-500 mt-1">Document: {cert.documentName}</p>
                      )}
                      {cert.submittedAt && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          Submitted {new Date(cert.submittedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          approveCert(hostId, cert.id, "Certificate verified");
                          flash(`Badge approved for ${hostName}.`);
                        }}
                        className="text-xs font-semibold text-green-700 border border-green-200 hover:bg-green-50 px-4 py-2 rounded-lg inline-flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const note = prompt("Rejection reason:") ?? "";
                          if (note === null) return;
                          rejectCert(hostId, cert.id, note.trim() || "Not accepted");
                          flash("Certificate rejected.");
                        }}
                        className="text-xs font-semibold text-red-600 border border-red-200 hover:bg-red-50 px-4 py-2 rounded-lg inline-flex items-center gap-1"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Reject
                      </button>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        )}

        {activeTab === "badges" && (
          <div className="space-y-4">
            <p className="text-xs text-gray-500">
              Master badge types hosts can apply for on Verification &amp; Trust. Add, edit, enable,
              or delete types here.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const label = newBadge.label.trim();
                if (!label) return;
                const badge: TrustBadgeDefinition = {
                  id: newBadgeCatalogId(),
                  label,
                  description: newBadge.description.trim() || "Certification badge.",
                  enabled: true,
                };
                saveBadges([...settings.badgeCatalog, badge]);
                setNewBadge({ label: "", description: "" });
                flash(`Badge “${badge.label}” added.`);
              }}
              className="bg-white rounded-xl border p-4 space-y-3"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Add badge type
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  value={newBadge.label}
                  onChange={(e) => setNewBadge((p) => ({ ...p, label: e.target.value }))}
                  placeholder="Badge label"
                  required
                  className={inputClass}
                />
                <input
                  value={newBadge.description}
                  onChange={(e) => setNewBadge((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Short description"
                  className={inputClass}
                />
              </div>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 text-sm font-semibold bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded-xl"
              >
                <Plus className="w-4 h-4" /> Add badge
              </button>
            </form>

            {settings.badgeCatalog.length === 0 ? (
              <div className="bg-white rounded-xl border p-8 text-center">
                <Award className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-700">No badge types yet</p>
                <p className="text-xs text-gray-400 mt-1">Add your first certification badge above.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {settings.badgeCatalog.map((badge, index) => (
                  <article
                    key={badge.id}
                    className="bg-white rounded-xl border p-4 flex flex-col gap-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <label className="block">
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1 block">
                            Label
                          </span>
                          <input
                            value={badge.label}
                            onChange={(e) => {
                              const next = [...settings.badgeCatalog];
                              next[index] = { ...badge, label: e.target.value };
                              saveBadges(next);
                            }}
                            className={inputClass}
                          />
                        </label>
                        <label className="block">
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1 block">
                            Description
                          </span>
                          <input
                            value={badge.description}
                            onChange={(e) => {
                              const next = [...settings.badgeCatalog];
                              next[index] = { ...badge, description: e.target.value };
                              saveBadges(next);
                            }}
                            className={inputClass}
                          />
                        </label>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 sm:pt-5">
                        <label className="inline-flex items-center gap-2 text-xs text-gray-600">
                          <input
                            type="checkbox"
                            checked={badge.enabled}
                            onChange={(e) => {
                              const next = [...settings.badgeCatalog];
                              next[index] = { ...badge, enabled: e.target.checked };
                              saveBadges(next);
                              flash(
                                `${badge.label || "Badge"} ${e.target.checked ? "enabled" : "disabled"}.`
                              );
                            }}
                            className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                          />
                          Enabled
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            if (
                              !window.confirm(
                                `Delete badge “${badge.label || badge.id}”? Hosts will no longer see it unless they already applied.`
                              )
                            ) {
                              return;
                            }
                            saveBadges(settings.badgeCatalog.filter((b) => b.id !== badge.id));
                            flash("Badge deleted.");
                          }}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 border border-red-200 hover:bg-red-50 px-3 py-2 rounded-lg"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Delete
                        </button>
                      </div>
                    </div>
                    <p className="text-[10px] text-gray-400 font-mono">id: {badge.id}</p>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </AdminDashboardShell>
  );
}
