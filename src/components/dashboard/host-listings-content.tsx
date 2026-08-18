"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { Link } from "@/i18n/routing";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { HostDashboardShell } from "@/components/dashboard/host-dashboard-shell";
import { STATUS_STYLES } from "@/lib/mock/dashboard-data";
import { useAuth } from "@/components/providers/auth-provider";
import {
  filterHostListings,
  resolveHostId,
  resolveHostName,
  toHostListingRow,
  useListingSubmissions,
} from "@/lib/listings/use-listing-submissions";
import type { ListingReviewStatus } from "@/lib/listings/submission-types";

export function HostListingsContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const submitted = searchParams.get("submitted") === "1";
  const resubmitted = searchParams.get("resubmitted") === "1";
  const roomAdded = searchParams.get("roomAdded") === "1";
  const hostId = resolveHostId(user);
  const hostName = resolveHostName(user);
  const { all, deleteListing, ready, shared } = useListingSubmissions();
  const hostSubmissions = filterHostListings(all, hostId ?? "", hostName);
  const [approvalNotice, setApprovalNotice] = useState("");
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

  const submittedRows = hostSubmissions.map(toHostListingRow);
  const listings = submittedRows;

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

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 font-display">My Listings</h2>
            <p className="text-gray-500 text-sm mt-1">
              Manage property details, photos, rooms, farm info, and house rules.
            </p>
          </div>
          <Link
            href="/host/listings/new"
            className="inline-flex items-center gap-2 border border-gray-300 hover:border-green-400 text-gray-700 hover:text-green-700 text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Property
          </Link>
        </div>

        <div className="grid gap-4">
          {listings.length === 0 ? (
            <div className="bg-white rounded-2xl border p-8 text-center text-sm text-gray-500">
              <p>No listings yet. Create your first property, then add rooms to it.</p>
              <Link
                href="/host/listings/new"
                className="inline-flex items-center gap-2 mt-4 bg-green-700 hover:bg-green-800 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
              >
                <Plus className="w-4 h-4" /> Add Property
              </Link>
            </div>
          ) : (
            listings.map((l) => {
              const roomCount =
                hostSubmissions.find((s) => s.id === l.id)?.rooms?.length ?? 0;
              return (
              <div
                key={l.id}
                className="bg-white rounded-2xl border p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-gray-100 shrink-0 border">
                    {l.coverUrl ? (
                      <Image
                        src={l.coverUrl}
                        alt={l.title}
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
                      <span className="font-semibold text-gray-900 truncate">{l.title}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize shrink-0 ${STATUS_STYLES[l.status]}`}
                      >
                        {l.statusLabel}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      {roomCount} room{roomCount === 1 ? "" : "s"} · {l.bookings} bookings · {l.revenue} ·{" "}
                      {l.rating > 0 ? `${l.rating} ★` : "No reviews yet"}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Link
                    href={`/host/listings/${l.id}/rooms/new`}
                    className="inline-flex items-center gap-1.5 text-xs border border-gray-300 hover:border-green-400 text-gray-600 px-3 py-1.5 rounded-lg font-medium transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add room
                  </Link>
                  <Link
                    href={`/listing/${l.id}`}
                    className="text-xs border border-gray-300 px-3 py-1.5 rounded-lg font-medium text-gray-600 hover:border-green-400"
                  >
                    View
                  </Link>
                  <Link
                    href={`/host/listings/${l.id}/edit`}
                    className="inline-flex items-center gap-1.5 text-xs bg-green-700 hover:bg-green-800 text-white px-3 py-1.5 rounded-lg font-medium transition-colors"
                  >
                    Edit
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleDelete(l.id, l.title)}
                    className="inline-flex items-center gap-1 text-xs border border-red-200 hover:bg-red-50 text-red-600 px-3 py-1.5 rounded-lg font-medium"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                </div>
              </div>
            );
            })
          )}
        </div>
      </div>
    </HostDashboardShell>
  );
}
