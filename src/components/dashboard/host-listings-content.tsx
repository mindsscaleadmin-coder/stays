"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { Link } from "@/i18n/routing";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { HostDashboardShell } from "@/components/dashboard/host-dashboard-shell";
import { HostListingFlashDealBar } from "@/components/dashboard/host-listing-flash-deal-bar";
import { STATUS_STYLES } from "@/lib/mock/dashboard-data";
import { useAuth } from "@/components/providers/auth-provider";
import { useAdminTaxonomy } from "@/components/providers/admin-taxonomy-provider";
import { nightlyFromListing } from "@/lib/listings/submission-to-stay";
import {
  filterHostListings,
  resolveHostId,
  resolveHostName,
  toHostListingRow,
  useListingSubmissions,
} from "@/lib/listings/use-listing-submissions";
import type {
  ListingReviewStatus,
  SubmittedListing,
} from "@/lib/listings/submission-types";
import { useHostPublicProfile } from "@/lib/host/use-host-public-profile";
import { isEventsSubscriptionActive, formatSubscriptionExpiry } from "@/lib/host/events-subscription";
import { useEventsSubscriptionSettings } from "@/lib/host/use-events-subscription-settings";
import { isEventListing } from "@/lib/booking/is-event-listing";
import { getListingMode } from "@/lib/listings/listing-mode";
import { cn } from "@/lib/utils";

const UNCATEGORIZED = "Uncategorized";

function parentHeading(listing: SubmittedListing): string {
  return listing.parentCategory?.trim() || UNCATEGORIZED;
}

function statusRank(status: ListingReviewStatus): number {
  if (status === "pending") return 0;
  if (status === "approved") return 1;
  return 2;
}

export function HostListingsContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const { data: taxonomy } = useAdminTaxonomy();
  const submitted = searchParams.get("submitted") === "1";
  const resubmitted = searchParams.get("resubmitted") === "1";
  const roomAdded = searchParams.get("roomAdded") === "1";
  const hostId = resolveHostId(user);
  const hostName = resolveHostName(user);
  const { all, deleteListing, ready, shared } = useListingSubmissions({ load: true });
  const hostSubmissions = filterHostListings(all, hostId ?? "", hostName);
  const [approvalNotice, setApprovalNotice] = useState("");
  const [parentFilter, setParentFilter] = useState("all");
  const prevStatusRef = useRef<Map<string, ListingReviewStatus>>(new Map());

  useEffect(() => {
    for (const listing of hostSubmissions) {
      const prev = prevStatusRef.current.get(listing.id);
      if (prev === "pending" && listing.status === "approved") {
        setApprovalNotice(`"${listing.title}" has been approved and is now live.`);
        setTimeout(() => setApprovalNotice(""), 5000);
      }
      prevStatusRef.current.set(listing.id, listing.status);
    }
  }, [hostSubmissions]);

  const { data: hostProfile } = useHostPublicProfile(hostId ?? undefined, hostName);
  const eventsSubActive = isEventsSubscriptionActive(hostProfile?.eventsSubscriptionExpiresAt);
  const {
    freeDuringLaunch: eventsFree,
    planForListingCount,
  } = useEventsSubscriptionSettings();
  const eventListingCount = hostSubmissions.filter((l) =>
    isEventListing({
      parentCategory: l.parentCategory,
      type: l.type,
      category: l.category,
    })
  ).length;
  const hasEventListings = eventListingCount > 0;
  const eventPlan = hasEventListings ? planForListingCount(eventListingCount) : null;

  const parentOrder = useMemo(() => {
    const names = taxonomy.parents.map((p) => p.name.trim()).filter(Boolean);
    return names.length ? names : ["Stays", "Experiences", "Events"];
  }, [taxonomy.parents]);

  const parentCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const listing of hostSubmissions) {
      const key = parentHeading(listing);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return counts;
  }, [hostSubmissions]);

  const filterOptions = useMemo(() => {
    const fromTaxonomy = parentOrder.filter((name) => (parentCounts.get(name) ?? 0) > 0);
    const extras = Array.from(parentCounts.keys()).filter(
      (name) => !parentOrder.some((p) => p.toLowerCase() === name.toLowerCase())
    );
    extras.sort((a, b) => a.localeCompare(b));
    return [...fromTaxonomy, ...extras];
  }, [parentOrder, parentCounts]);

  useEffect(() => {
    if (parentFilter === "all") return;
    if (!parentCounts.has(parentFilter)) setParentFilter("all");
  }, [parentCounts, parentFilter]);

  const filteredSubmissions = useMemo(() => {
    if (parentFilter === "all") return hostSubmissions;
    return hostSubmissions.filter(
      (listing) => parentHeading(listing).toLowerCase() === parentFilter.toLowerCase()
    );
  }, [hostSubmissions, parentFilter]);

  const grouped = useMemo(() => {
    const buckets = new Map<string, SubmittedListing[]>();
    for (const listing of filteredSubmissions) {
      const key = parentHeading(listing);
      const list = buckets.get(key) ?? [];
      list.push(listing);
      buckets.set(key, list);
    }
    buckets.forEach((list) => {
      list.sort((a, b) => {
        const rank = statusRank(a.status) - statusRank(b.status);
        if (rank !== 0) return rank;
        return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
      });
    });
    const orderedKeys = [
      ...parentOrder.filter((name) => buckets.has(name)),
      ...Array.from(buckets.keys()).filter(
        (name) => !parentOrder.some((p) => p.toLowerCase() === name.toLowerCase())
      ),
    ];
    return orderedKeys.map((heading) => ({
      heading,
      listings: buckets.get(heading) ?? [],
    }));
  }, [filteredSubmissions, parentOrder]);

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    const ok = await deleteListing(id);
    if (!ok) {
      alert("Could not delete this listing. Please try again.");
    }
  }

  if (!ready) {
    return (
      <HostDashboardShell>
        <div className="flex items-center justify-center min-h-[280px]">
          <Loader2 className="w-7 h-7 animate-spin text-green-600" />
        </div>
      </HostDashboardShell>
    );
  }

  return (
    <HostDashboardShell>
      <div className="space-y-6">
        {shared && (
          <p className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
            Changes sync to every host and admin signed in — not just this browser.
          </p>
        )}
        {submitted && (
          <div className="bg-green-50 border border-green-200 text-green-800 text-sm rounded-xl px-4 py-3">
            Your listing was submitted and is pending admin review.
          </div>
        )}

        {resubmitted && (
          <div className="bg-amber-50 border border-amber-200 text-amber-900 text-sm rounded-xl px-4 py-3">
            Your edits were saved. The listing is pending re-approval and is not live until an
            admin approves it again.
          </div>
        )}

        {roomAdded && (
          <div className="bg-green-50 border border-green-200 text-green-800 text-sm rounded-xl px-4 py-3">
            Room added. Guests will see it on the property detail page.
          </div>
        )}

        {approvalNotice && (
          <div className="bg-green-50 border border-green-200 text-green-800 text-sm rounded-xl px-4 py-3">
            {approvalNotice}
          </div>
        )}

        {hasEventListings && (
          <div
            className={`text-sm rounded-xl px-4 py-3 border ${
              eventsFree || eventsSubActive
                ? "bg-green-50 border-green-200 text-green-900"
                : "bg-amber-50 border-amber-200 text-amber-950"
            }`}
          >
            {eventsFree ? (
              <>
                Listing event venues is <strong>free during launch</strong> — approved venues go
                live in the public Events section straight away. Guests send you availability
                requests and you deal with them directly, with no booking fees.
                {eventPlan ? (
                  <>
                    {" "}
                    When launch pricing starts, {eventListingCount}{" "}
                    {eventListingCount === 1 ? "venue" : "venues"} falls under{" "}
                    <strong>{eventPlan.name}</strong> at AED{" "}
                    {eventPlan.yearlyFeeAed.toLocaleString()}/year.
                  </>
                ) : null}
              </>
            ) : eventsSubActive ? (
              `Events subscription is active until ${formatSubscriptionExpiry(hostProfile?.eventsSubscriptionExpiresAt)}. Guests contact you directly — no booking fees.`
            ) : (
              <>
                Event listings stay off the public Events section until your yearly subscription
                is recorded.
                {eventPlan ? (
                  <>
                    {" "}
                    Your {eventListingCount}{" "}
                    {eventListingCount === 1 ? "venue" : "venues"} falls under{" "}
                    <strong>{eventPlan.name}</strong> — AED{" "}
                    {eventPlan.yearlyFeeAed.toLocaleString()}/year.
                  </>
                ) : null}{" "}
                Featured and Trending boosts are available after that.
              </>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 font-display">My Listings</h2>
            <p className="text-gray-500 text-sm mt-1">
              Grouped by parent category. Filter to jump between Stays, Experiences, and Events.
            </p>
          </div>
          <Link
            href="/host/new-listing"
            className="inline-flex items-center gap-2 border border-gray-300 hover:border-green-400 text-gray-700 hover:text-green-700 text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Property
          </Link>
        </div>

        {hostSubmissions.length > 0 && (
          <div
            className="flex flex-wrap gap-2"
            role="tablist"
            aria-label="Filter listings by parent category"
          >
            <FilterChip
              label="All"
              count={hostSubmissions.length}
              active={parentFilter === "all"}
              onClick={() => setParentFilter("all")}
            />
            {filterOptions.map((name) => (
              <FilterChip
                key={name}
                label={name}
                count={parentCounts.get(name) ?? 0}
                active={parentFilter === name}
                onClick={() => setParentFilter(name)}
              />
            ))}
          </div>
        )}

        <div className="space-y-8">
          {hostSubmissions.length === 0 ? (
            <div className="bg-white rounded-2xl border p-8 text-center text-sm text-gray-500">
              <p>No listings yet. Create your first property, then add rooms to it.</p>
              <Link
                href="/host/new-listing"
                className="inline-flex items-center gap-2 mt-4 bg-green-700 hover:bg-green-800 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
              >
                <Plus className="w-4 h-4" /> Add Property
              </Link>
            </div>
          ) : grouped.length === 0 ? (
            <div className="bg-white rounded-2xl border p-8 text-center text-sm text-gray-500">
              No listings in this category.
            </div>
          ) : (
            grouped.map((group) => (
              <section key={group.heading} className="space-y-3">
                <div className="flex items-center gap-3">
                  <h3 className="text-sm font-bold text-gray-900 font-display tracking-tight">
                    {group.heading}
                  </h3>
                  <span className="text-[11px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                    {group.listings.length}
                  </span>
                  <div className="h-px flex-1 bg-gray-200" />
                </div>
                <div className="grid gap-4">
                  {group.listings.map((submission) => (
                    <ListingCard
                      key={submission.id}
                      listing={toHostListingRow(submission)}
                      submission={submission}
                      roomCount={submission.rooms?.length ?? 0}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              </section>
            ))
          )}
        </div>
      </div>
    </HostDashboardShell>
  );
}

function FilterChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors",
        active
          ? "bg-green-700 text-white border-green-700"
          : "bg-white text-gray-700 border-gray-200 hover:border-green-400 hover:text-green-800"
      )}
    >
      {label}
      <span
        className={cn(
          "tabular-nums rounded-full px-1.5 py-px text-[10px]",
          active ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"
        )}
      >
        {count}
      </span>
    </button>
  );
}

function ListingCard({
  listing,
  submission,
  roomCount,
  onDelete,
}: {
  listing: ReturnType<typeof toHostListingRow>;
  submission?: SubmittedListing;
  roomCount: number;
  onDelete: (id: string, title: string) => void;
}) {
  const nightly = submission ? nightlyFromListing(submission) : 0;
  const isEvent = submission
    ? getListingMode({
        parentCategory: submission.parentCategory,
        type: submission.type,
        category: submission.category,
      }) === "event"
    : false;
  const rateLabel =
    nightly > 0
      ? isEvent
        ? `AED ${Math.round(nightly).toLocaleString()} display`
        : `AED ${Math.round(nightly).toLocaleString()}/night`
      : "AED —";
  const categoryBits = [submission?.category, submission?.subcategory].filter(Boolean);

  return (
    <div className="bg-white rounded-2xl border p-5 flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-gray-100 shrink-0 border">
            {listing.coverUrl ? (
              <Image
                src={listing.coverUrl}
                alt={listing.title}
                fill
                className="object-cover"
                unoptimized
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-[10px] text-gray-400 text-center px-1">
                No photo
              </div>
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-900 truncate">{listing.title}</span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize shrink-0 ${STATUS_STYLES[listing.status]}`}
              >
                {listing.statusLabel}
              </span>
            </div>
            <div className="text-sm text-gray-500 mt-1">
              {categoryBits.length > 0 ? `${categoryBits.join(" · ")} · ` : null}
              {!isEvent && (
                <>
                  {roomCount} room{roomCount === 1 ? "" : "s"} · {listing.bookings} bookings ·{" "}
                </>
              )}
              {rateLabel}
              {listing.rating > 0 ? ` · ${listing.rating} ★` : " · No reviews yet"}
              {submission?.propertyReference && (
                <>
                  {" · "}
                  <span
                    className="font-mono text-xs font-semibold text-green-800"
                    title="Property reference"
                    aria-label={`Property reference ${submission.propertyReference}`}
                  >
                    {submission.propertyReference}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {!isEvent && (
            <Link
              href={`/host/listings/${listing.id}/rooms/new`}
              className="inline-flex items-center gap-1.5 text-xs border border-gray-300 hover:border-green-400 text-gray-600 px-3 py-1.5 rounded-lg font-medium transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add room
            </Link>
          )}
          <Link
            href={`/listing/${listing.id}`}
            className="text-xs border border-gray-300 px-3 py-1.5 rounded-lg font-medium text-gray-600 hover:border-green-400"
          >
            View
          </Link>
          <Link
            href={`/host/listings/${listing.id}/edit`}
            className="inline-flex items-center gap-1.5 text-xs bg-green-700 hover:bg-green-800 text-white px-3 py-1.5 rounded-lg font-medium transition-colors"
          >
            Edit
          </Link>
          <button
            type="button"
            onClick={() => onDelete(listing.id, listing.title)}
            className="inline-flex items-center gap-1 text-xs border border-red-200 hover:bg-red-50 text-red-600 px-3 py-1.5 rounded-lg font-medium"
          >
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </button>
        </div>
      </div>
      {listing.status === "approved" && !isEvent && (
        <HostListingFlashDealBar listingId={listing.id} />
      )}
    </div>
  );
}
