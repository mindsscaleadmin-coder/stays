"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/routing";
import {
  AlertTriangle,
  Loader2,
  RotateCcw,
  Settings2,
} from "lucide-react";
import { AdminDashboardShell } from "./admin-dashboard-shell";
import { ActiveListingPanel } from "./active-listing-panel";
import { PendingListingReviewPanel } from "./pending-listing-review-panel";
import { useAuth } from "@/components/providers/auth-provider";
import { useListingQualityRules } from "@/components/providers/listing-quality-rules-provider";
import { findAdminHost, resolveAdminHosts } from "@/lib/admin/host-helpers";
import { useAdminUsers } from "@/lib/admin/use-admin-users";
import { useListingSubmissions } from "@/lib/listings/use-listing-submissions";
import type { SubmittedListing } from "@/lib/listings/submission-types";
import { cn } from "@/lib/utils";
import { toLegacyQualityView } from "@/lib/admin/listing-quality-rules-data";

type TabId = "queue" | "listings" | "quality";

const TABS: { id: TabId; label: string }[] = [
  { id: "queue", label: "Moderation queue" },
  { id: "listings", label: "All listings" },
  { id: "quality", label: "Quality rules" },
];

const inputClass =
  "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500";

function QualityRulesSection() {
  const { rules, updateRules, resetRules } = useListingQualityRules();
  const view = toLegacyQualityView(rules);
  const [message, setMessage] = useState("");

  function flash(text: string) {
    setMessage(text);
    setTimeout(() => setMessage(""), 2500);
  }

  return (
    <div className="space-y-4">
      {message && (
        <div className="bg-green-50 border border-green-200 text-green-800 text-sm rounded-xl px-4 py-3">
          {message}
        </div>
      )}

      <section className="bg-white rounded-2xl border shadow-sm p-5 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-green-700" />
              <h3 className="font-semibold text-gray-900">Platform quality rules</h3>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Minimum standards enforced when hosts submit or edit listings.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              resetRules();
              flash("Quality rules reset to defaults.");
            }}
            className="inline-flex items-center gap-1.5 text-xs border border-gray-200 hover:border-gray-300 text-gray-600 px-3 py-1.5 rounded-lg font-medium"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset defaults
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Minimum photos</span>
            <input
              type="number"
              min={0}
              max={20}
              value={view.minPhotos}
              onChange={(e) => updateRules({ minPhotos: Math.max(0, Number(e.target.value) || 0) })}
              className={cn(inputClass, "mt-1")}
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Min description length</span>
            <input
              type="number"
              min={0}
              max={2000}
              value={view.minDescriptionLength}
              onChange={(e) =>
                updateRules({ minDescriptionLength: Math.max(0, Number(e.target.value) || 0) })
              }
              className={cn(inputClass, "mt-1")}
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Minimum amenities</span>
            <input
              type="number"
              min={0}
              max={20}
              value={view.minAmenities}
              onChange={(e) => updateRules({ minAmenities: Math.max(0, Number(e.target.value) || 0) })}
              className={cn(inputClass, "mt-1")}
            />
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(
            [
              ["requireTitle", "Require title"],
              ["requireDescription", "Require description"],
              ["requireLocation", "Require country & state"],
              ["requireCategory", "Require category"],
              ["requireFarmType", "Require farm type"],
              ["requireAmenities", "Require amenities"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="inline-flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={view[key]}
                onChange={(e) => updateRules({ [key]: e.target.checked })}
                className="rounded border-gray-300 text-green-600 focus:ring-green-500"
              />
              {label}
            </label>
          ))}
        </div>

        <p className="text-xs text-gray-400 flex items-start gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          Changes apply immediately when hosts submit or edit a listing.
        </p>
      </section>
    </div>
  );
}

export function AdminListingControlContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { startImpersonatingHost } = useAuth();
  const { users } = useAdminUsers();
  const tabParam = searchParams.get("tab") as TabId | null;
  const activeTab: TabId = TABS.some((t) => t.id === tabParam) ? tabParam! : "queue";

  const {
    pending,
    all,
    ready,
    pendingCount,
    flaggedCount,
    approve,
    reject,
    unpublish,
    republish,
    adminUpdate,
    bulkUpdate,
    deactivate,
  } = useListingSubmissions();

  const [message, setMessage] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const setTab = useCallback(
    (tab: TabId) => {
      router.replace(`/admin/listings?tab=${tab}`);
    },
    [router]
  );

  useEffect(() => {
    setSelectedIds(new Set());
  }, [activeTab]);

  function flash(text: string) {
    setMessage(text);
    setTimeout(() => setMessage(""), 3000);
  }

  /** Open host listing form so they can edit rooms/details and submit for review. */
  function openHostListingForm(listing: SubmittedListing) {
    const hosts = resolveAdminHosts(users, all);
    const host =
      findAdminHost(hosts, listing.hostId) ??
      hosts.find((h) => h.name.toLowerCase() === listing.hostName.toLowerCase()) ??
      {
        id: listing.hostId,
        name: listing.hostName,
        email: `${listing.hostId}@host.local`,
        roles: ["host"],
        status: "verified" as const,
        joinedAt: listing.submittedAt,
      };

    const result = startImpersonatingHost(host);
    if (result.error) {
      flash(result.error);
      return;
    }
    router.push(`/host/listings/${listing.id}/manage`);
  }

  function toggleOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll(ids: string[]) {
    setSelectedIds((prev) => {
      const allSelected = ids.length > 0 && ids.every((id) => prev.has(id));
      if (allSelected) return new Set();
      return new Set(ids);
    });
  }

  async function runBulk(action: "feature" | "unfeature" | "flag" | "unflag") {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    const patch =
      action === "feature"
        ? { featured: true }
        : action === "unfeature"
          ? { featured: false }
          : action === "flag"
            ? { flaggedForReview: true }
            : { flaggedForReview: false };
    const count = await bulkUpdate(ids, patch);
    flash(`Updated ${count} listing${count === 1 ? "" : "s"}.`);
    setSelectedIds(new Set());
  }

  if (!ready) {
    return (
      <AdminDashboardShell>
        <div className="flex flex-col items-center justify-center min-h-[320px] gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-green-600" />
          <p className="text-sm text-gray-500">Loading listings…</p>
        </div>
      </AdminDashboardShell>
    );
  }

  return (
    <AdminDashboardShell>
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 font-display">Listing Control</h2>
          <p className="text-gray-500 text-sm mt-1">
            Moderate submissions, manage listings, and configure platform-wide listing standards.
            {pendingCount > 0 && (
              <span className="text-amber-600 font-medium"> {pendingCount} awaiting review.</span>
            )}
            {flaggedCount > 0 && (
              <span className="text-orange-600 font-medium"> {flaggedCount} flagged.</span>
            )}
          </p>
        </div>

        {message && (
          <div className="bg-green-50 border border-green-200 text-green-800 text-sm rounded-xl px-4 py-3">
            {message}
          </div>
        )}

        <div className="flex flex-wrap gap-2 border-b pb-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setTab(tab.id)}
              className={cn(
                "text-sm font-medium px-3 py-2 rounded-t-lg border-b-2 -mb-px transition-colors",
                activeTab === tab.id
                  ? "border-green-700 text-green-800 bg-green-50/80"
                  : "border-transparent text-gray-500 hover:text-gray-800"
              )}
            >
              {tab.label}
              {tab.id === "queue" && pendingCount > 0 && (
                <span className="ms-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {activeTab === "queue" && (
          <section>
            <PendingListingReviewPanel listings={pending} onApprove={approve} onReject={reject} />
          </section>
        )}

        {activeTab === "listings" && (
          <section>
            <ActiveListingPanel
              listings={all}
              selectedIds={selectedIds}
              onToggleOne={toggleOne}
              onToggleAll={toggleAll}
              onEdit={openHostListingForm}
              onFeature={(listing) => {
                adminUpdate(listing.id, { featured: !listing.featured });
                flash(listing.featured ? "Listing unfeatured." : "Listing featured.");
              }}
              onFlag={(listing) => {
                adminUpdate(listing.id, { flaggedForReview: !listing.flaggedForReview });
                flash(listing.flaggedForReview ? "Flag cleared." : "Listing flagged.");
              }}
              onUnpublish={(listing) => {
                const reason = prompt("Reason for unpublishing (optional):") ?? "";
                if (reason === null) return;
                unpublish(listing.id, reason);
                flash("Listing unpublished.");
              }}
              onRepublish={(listing) => {
                republish(listing.id);
                flash("Listing republished.");
              }}
              onDeactivate={(id) => {
                deactivate(id);
                flash("Listing deactivated.");
              }}
              onBulk={runBulk}
            />
          </section>
        )}

        {activeTab === "quality" && <QualityRulesSection />}
      </div>
    </AdminDashboardShell>
  );
}
