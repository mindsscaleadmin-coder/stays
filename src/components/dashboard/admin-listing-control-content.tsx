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
import {
  createQualityRule,
  LISTING_QUALITY_FIELD_CATALOG,
} from "@/lib/admin/listing-quality-fields";

import { useAdminTaxonomy } from "@/components/providers/admin-taxonomy-provider";
import { toListingQualityMode } from "@/lib/listings/listing-mode";
import type { ListingQualityFieldDef } from "@/lib/admin/listing-quality-rules-types";

type TabId = "queue" | "listings" | "quality";

const TABS: { id: TabId; label: string }[] = [
  { id: "queue", label: "Moderation queue" },
  { id: "listings", label: "All listings" },
  { id: "quality", label: "Quality rules" },
];

const inputClass =
  "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500";

function fieldsForParent(parentName: string): {
  details: ListingQualityFieldDef[];
  manage: ListingQualityFieldDef[];
} {
  const mode = toListingQualityMode({ parentCategory: parentName });
  const visible = LISTING_QUALITY_FIELD_CATALOG.filter(
    (f) => !f.modes?.length || f.modes.includes(mode)
  );
  return {
    details: visible.filter((f) => f.form === "details"),
    manage: visible.filter((f) => f.form === "manage"),
  };
}

function QualityRulesSection() {
  const { data: taxonomy } = useAdminTaxonomy();
  const {
    store,
    rulesForParent,
    addParentRule,
    updateParentRule,
    removeParentRule,
    updateParentRules,
    resetParentRules,
    resetAllRules,
  } = useListingQualityRules();

  const parents = taxonomy.parents.filter((p) => p.enabled !== false);
  const [parentId, setParentId] = useState(parents[0]?.id ?? "");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!parents.length) return;
    if (!parents.some((p) => p.id === parentId)) {
      setParentId(parents[0].id);
    }
  }, [parents, parentId]);

  const activeParent = parents.find((p) => p.id === parentId) ?? parents[0];
  const activeParentId = activeParent?.id ?? "";
  const activeParentName = activeParent?.name ?? "";

  const rules = rulesForParent(activeParentId, activeParentName, parents);
  const view = toLegacyQualityView(rules);
  const catalog = fieldsForParent(activeParentName);
  const hasOverride = Boolean(store.byParentId[activeParentId]);

  function flash(text: string) {
    setMessage(text);
    setTimeout(() => setMessage(""), 2500);
  }

  function toggleField(fieldId: Parameters<typeof createQualityRule>[0]) {
    if (!activeParentId) return;
    const existing = rules.items.find((item) => item.fieldId === fieldId);
    if (existing) {
      removeParentRule(activeParentId, existing.id);
      flash(`“${existing.label ?? fieldId}” off for ${activeParentName}.`);
      return;
    }
    const created = createQualityRule(fieldId);
    addParentRule(activeParentId, created);
    flash(`“${created.label}” on for ${activeParentName}.`);
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
              Separate standards for each parent category. Hosts are checked against the
              parent they select on the listing form.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              resetAllRules();
              flash("All parent quality rules reset to defaults.");
            }}
            className="inline-flex items-center gap-1.5 text-xs border border-gray-200 hover:border-gray-300 text-gray-600 px-3 py-1.5 rounded-lg font-medium"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset all
          </button>
        </div>

        {parents.length === 0 ? (
          <p className="text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
            Add parent categories in Admin → Filter first.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {parents.map((parent) => {
                const customized = Boolean(store.byParentId[parent.id]);
                const active = parent.id === activeParentId;
                return (
                  <button
                    key={parent.id}
                    type="button"
                    onClick={() => setParentId(parent.id)}
                    className={cn(
                      "inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-xl border transition-colors",
                      active
                        ? "bg-green-700 border-green-700 text-white"
                        : "border-gray-200 text-gray-700 hover:border-green-300"
                    )}
                  >
                    {parent.name}
                    {customized ? (
                      <span
                        className={cn(
                          "text-[10px] font-semibold uppercase tracking-wide",
                          active ? "text-green-100" : "text-green-700"
                        )}
                      >
                        set
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gray-100 bg-gray-50/80 px-3 py-2">
              <p className="text-sm text-gray-700">
                Editing rules for <span className="font-semibold">{activeParentName}</span>
                {!hasOverride ? (
                  <span className="text-gray-400"> · using shared defaults until you change them</span>
                ) : null}
              </p>
              <button
                type="button"
                onClick={() => {
                  resetParentRules(activeParentId, activeParentName);
                  flash(`Reset ${activeParentName} to defaults.`);
                }}
                className="text-xs font-medium text-gray-600 hover:text-green-800"
              >
                Reset this parent
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Minimum photos
                </span>
                <input
                  type="number"
                  min={0}
                  max={20}
                  value={view.minPhotos}
                  onChange={(e) =>
                    updateParentRules(activeParentId, {
                      minPhotos: Math.max(0, Number(e.target.value) || 0),
                    })
                  }
                  className={cn(inputClass, "mt-1")}
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Min description length
                </span>
                <input
                  type="number"
                  min={0}
                  max={2000}
                  value={view.minDescriptionLength}
                  onChange={(e) =>
                    updateParentRules(activeParentId, {
                      minDescriptionLength: Math.max(0, Number(e.target.value) || 0),
                    })
                  }
                  className={cn(inputClass, "mt-1")}
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Minimum amenities
                </span>
                <input
                  type="number"
                  min={0}
                  max={20}
                  value={view.minAmenities}
                  onChange={(e) =>
                    updateParentRules(activeParentId, {
                      minAmenities: Math.max(0, Number(e.target.value) || 0),
                    })
                  }
                  className={cn(inputClass, "mt-1")}
                />
              </label>
            </div>

            {(
              [
                { title: "Listing details", fields: catalog.details },
                { title: "Manage / inventory", fields: catalog.manage },
              ] as const
            ).map((group) =>
              group.fields.length === 0 ? null : (
                <div key={group.title} className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {group.title}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {group.fields.map((field) => {
                      const item = rules.items.find((r) => r.fieldId === field.id);
                      const on = Boolean(item);
                      return (
                        <div
                          key={field.id}
                          className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-100 px-3 py-2"
                        >
                          <label className="inline-flex items-center gap-2 text-sm text-gray-700 cursor-pointer flex-1 min-w-0">
                            <input
                              type="checkbox"
                              checked={on}
                              onChange={() => toggleField(field.id)}
                              className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                            />
                            <span className="truncate">{field.label}</span>
                          </label>
                          {on && field.kind !== "required" && item ? (
                            <input
                              type="number"
                              min={1}
                              max={100}
                              value={item.min ?? field.defaultMin ?? 1}
                              onChange={(e) =>
                                updateParentRule(activeParentId, item.id, {
                                  min: Math.max(1, Number(e.target.value) || 1),
                                })
                              }
                              className="w-16 border border-gray-200 rounded-lg px-2 py-1 text-xs"
                              aria-label={field.minLabel ?? "Minimum"}
                              title={field.minLabel}
                            />
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )
            )}
          </>
        )}

        <p className="text-xs text-gray-400 flex items-start gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          Changes apply when hosts create, manage, or submit a listing under that parent
          category.
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
