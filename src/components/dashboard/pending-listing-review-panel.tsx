"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Link } from "@/i18n/routing";
import { CheckCircle, Clock, Tag, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatSubmittedAt } from "@/lib/listings/submission-data";
import type { SubmittedListing } from "@/lib/listings/submission-types";
import {
  buildQualityChecklist,
  qualityInputFromListing,
} from "@/lib/listings/listing-quality-validation";
import { useListingQualityRules } from "@/components/providers/listing-quality-rules-provider";
import { useAdminTaxonomy } from "@/components/providers/admin-taxonomy-provider";
import { RichTextView } from "@/components/listing/rich-text-view";
import { ListingQualityChecklist } from "./listing-quality-checklist";
import { ListingDetailRow } from "./listing-detail-row";
import { toListingQualityMode } from "@/lib/listings/listing-mode";

export function PendingListingReviewPanel({
  listings,
  onApprove,
  onReject,
}: {
  listings: SubmittedListing[];
  onApprove: (id: string) => void | Promise<void>;
  onReject: (id: string) => void | Promise<void>;
}) {
  const { rulesForParent } = useListingQualityRules();
  const { data: taxonomy } = useAdminTaxonomy();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const [acting, setActing] = useState(false);

  useEffect(() => {
    if (listings.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !listings.some((l) => l.id === selectedId)) {
      setSelectedId(listings[0].id);
    }
  }, [listings, selectedId]);

  const selected = listings.find((l) => l.id === selectedId) ?? null;

  const selectedMode = selected
    ? toListingQualityMode({
        parentCategory: selected.parentCategory,
        type: selected.type,
        category: selected.category,
      })
    : "stay";

  const qualityChecklist = selected
    ? buildQualityChecklist(
        qualityInputFromListing({ ...selected, listingMode: selectedMode }),
        rulesForParent(undefined, selected.parentCategory, taxonomy.parents),
        { listingMode: selectedMode }
      )
    : [];

  async function handleApprove(id: string) {
    if (acting) return;
    setActionError("");
    setActionMessage("");
    setActing(true);
    try {
      await onApprove(id);
      setActionMessage("Listing approved.");
      setTimeout(() => setActionMessage(""), 3000);
    } catch {
      setActionError("Could not approve listing. Try again.");
    } finally {
      setActing(false);
    }
  }

  async function handleReject(id: string) {
    if (acting) return;
    if (!confirm("Reject this listing submission?")) return;
    setActionError("");
    setActionMessage("");
    setActing(true);
    try {
      await onReject(id);
      setActionMessage("Listing rejected.");
      setTimeout(() => setActionMessage(""), 3000);
    } catch {
      setActionError("Could not reject listing. Try again.");
    } finally {
      setActing(false);
    }
  }

  if (listings.length === 0) {
    return (
      <div className="bg-white rounded-2xl border shadow-sm p-8 text-center">
        <Clock className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-sm font-medium text-gray-700">No listings awaiting review</p>
        <p className="text-xs text-gray-400 mt-1">
          New host submissions and edited live listings will appear here for approval.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border shadow-sm overflow-hidden flex flex-col md:flex-row">
      <div className="border-b md:border-b-0 md:border-e bg-gray-50 md:w-56 shrink-0">
        <div className="flex flex-col gap-1 p-3">
          {listings.map((listing) => (
            <button
              key={listing.id}
              type="button"
              onClick={() => setSelectedId(listing.id)}
              className={cn(
                "w-full text-start px-3 py-2 rounded-lg text-xs font-medium transition-colors truncate",
                selectedId === listing.id
                  ? "bg-green-700 text-white"
                  : "text-gray-600 hover:bg-white hover:text-gray-900"
              )}
            >
              {listing.title}
            </button>
          ))}
          <span className="text-xs text-gray-400 pt-2 px-1">
            {listings.length} pending
          </span>
        </div>
      </div>

      {selected && (
        <div className="flex-1 min-w-0 p-5 space-y-5">
          {actionMessage && (
            <p className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2">
              {actionMessage}
            </p>
          )}
          {actionError && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {actionError}
            </p>
          )}

          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900">{selected.title}</h3>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 mt-2">
                <span className="inline-flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> {formatSubmittedAt(selected.submittedAt)}
                </span>
                <span className="inline-flex items-center gap-1 capitalize">
                  <Tag className="w-3.5 h-3.5" /> {selected.type}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Link
                href={`/listing/${selected.id}`}
                className="text-xs border border-gray-300 hover:border-green-400 text-gray-600 px-3 py-1.5 rounded-lg font-medium"
              >
                Preview
              </Link>
              <button
                type="button"
                onClick={() => handleApprove(selected.id)}
                disabled={acting}
                className="flex items-center gap-1 text-xs bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white px-3 py-1.5 rounded-lg font-medium"
              >
                <CheckCircle className="w-3.5 h-3.5" /> {acting ? "Saving…" : "Approve"}
              </button>
              <button
                type="button"
                onClick={() => handleReject(selected.id)}
                disabled={acting}
                className="flex items-center gap-1 text-xs border border-red-200 hover:bg-red-50 disabled:opacity-60 text-red-600 px-3 py-1.5 rounded-lg font-medium"
              >
                <XCircle className="w-3.5 h-3.5" /> Reject
              </button>
            </div>
          </div>

          <ListingQualityChecklist items={qualityChecklist} />

          {selected.photoUrls?.length ? (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Photos ({selected.photoCount})
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {(selected.photoUrls ?? []).map((url, index) => (
                  <div
                    key={`${selected.id}-photo-${index}`}
                    className="relative aspect-[4/3] rounded-xl overflow-hidden border bg-gray-100"
                  >
                    <Image
                      src={url}
                      alt={`${selected.title} photo ${index + 1}`}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Description
            </p>
            <RichTextView value={selected.description} className="text-gray-700" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <ListingDetailRow label="Host" value={selected.hostName} />
            {(selected.customFilters ?? []).map((f) => (
              <ListingDetailRow key={f.label} label={f.label} value={f.value} />
            ))}
          </div>

          {(selected.advancedFilters ?? []).length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Advanced filters
              </p>
              <div className="flex flex-wrap gap-2">
                {(selected.advancedFilters ?? []).map((name) => (
                  <span
                    key={name}
                    className="px-2.5 py-1 rounded-lg bg-green-50 text-green-700 text-xs font-medium"
                  >
                    {name}
                  </span>
                ))}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
