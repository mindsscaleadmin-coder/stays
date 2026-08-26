"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Link, useRouter } from "@/i18n/routing";
import {
  BadgeDollarSign,
  BedDouble,
  ClipboardList,
  Leaf,
  Loader2,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import { HostDashboardShell } from "@/components/dashboard/host-dashboard-shell";
import { useAuth } from "@/components/providers/auth-provider";
import { getSubmissionById } from "@/lib/listings/submission-data";
import { useListingQualityRules } from "@/components/providers/listing-quality-rules-provider";
import { useListingTags } from "@/components/providers/listing-tags-provider";
import {
  filterHostListings,
  resolveHostId,
  resolveHostName,
  useListingSubmissions,
} from "@/lib/listings/use-listing-submissions";
import {
  validateListingQuality,
  buildQualityChecklist,
  qualityInputFromListing,
} from "@/lib/listings/listing-quality-validation";
import { ListingQualityChecklist } from "@/components/dashboard/listing-quality-checklist";
import { STATUS_STYLES } from "@/lib/mock/dashboard-data";
import { cn } from "@/lib/utils";

export function HostListingManageContent({ listingId }: { listingId: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const hostId = resolveHostId(user);
  const hostName = resolveHostName(user);
  const { all, update, deleteRoom, ready } = useListingSubmissions();
  const hostListings = filterHostListings(all, hostId ?? "", hostName);
  const { farmTypeOptions, activityOptions, amenityOptions } = useListingTags();
  const { rules: qualityRules } = useListingQualityRules();

  const listing = useMemo(
    () => hostListings.find((l) => l.id === listingId) ?? getSubmissionById(listingId) ?? null,
    [hostListings, listingId]
  );

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [amenities, setAmenities] = useState<string[]>([]);
  const [farmType, setFarmType] = useState("");
  const [farmActivities, setFarmActivities] = useState<string[]>([]);
  const [livestockCrops, setLivestockCrops] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!listing) {
      setHydrated(true);
      return;
    }
    setTitle(listing.title);
    setDescription(listing.description);
    setAmenities(listing.amenities ?? []);
    setFarmType(listing.farmType ?? "");
    setFarmActivities(listing.farmActivities ?? []);
    setLivestockCrops(listing.livestockCrops ?? "");
    setHydrated(true);
  }, [listing]);

  function flash(text: string) {
    setMessage(text);
    setTimeout(() => setMessage(""), 2800);
  }

  function toggleAmenity(name: string) {
    setAmenities((prev) =>
      prev.includes(name) ? prev.filter((a) => a !== name) : [...prev, name]
    );
  }

  function toggleActivity(name: string) {
    setFarmActivities((prev) =>
      prev.includes(name) ? prev.filter((a) => a !== name) : [...prev, name]
    );
  }

  const qualityInput = useMemo(
    () =>
      qualityInputFromListing({
        ...(listing ?? {}),
        title,
        description,
        farmType,
        amenities,
        farmActivities,
        livestockCrops,
      }),
    [title, description, listing, farmType, amenities, farmActivities, livestockCrops]
  );

  const qualityChecklist = useMemo(
    () => buildQualityChecklist(qualityInput, qualityRules),
    [qualityInput, qualityRules]
  );

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!listing) return;
    setError("");

    const qualityError = validateListingQuality(
      qualityInputFromListing({
        ...listing,
        title,
        description,
        farmType,
        amenities,
        farmActivities,
        livestockCrops,
      }),
      qualityRules
    );
    if (qualityError) {
      setError(qualityError);
      return;
    }

    setSubmitting(true);

    const ok = await update(listing.id, {
      title: title.trim(),
      description: description.trim(),
      country: listing.country,
      state: listing.state,
      district: listing.district,
      parentCategory: listing.parentCategory,
      category: listing.category,
      subcategory: listing.subcategory,
      type: listing.type,
      city: listing.city,
      customFilters: listing.customFilters,
      advancedFilters: listing.advancedFilters,
      photoUrls: listing.photoUrls,
      photoTags: listing.photoTags,
      photoCount: listing.photoCount,
      highlightIds: listing.highlightIds,
      featureIconIds: listing.featureIconIds,
      amenities,
      farmType: farmType.trim() || undefined,
      farmActivities,
      livestockCrops: livestockCrops.trim() || undefined,
    });

    setSubmitting(false);
    if (!ok) {
      setError("Could not save changes. Please try again.");
      return;
    }
    router.push("/host/listings?resubmitted=1");
  }

  if (!ready || !hydrated) {
    return (
      <HostDashboardShell>
        <div className="flex items-center justify-center min-h-[320px]">
          <Loader2 className="w-8 h-8 animate-spin text-green-600" />
        </div>
      </HostDashboardShell>
    );
  }

  if (!listing) {
    return (
      <HostDashboardShell>
        <div className="bg-white rounded-2xl border p-8 text-center max-w-lg">
          <h2 className="text-lg font-bold text-gray-900 mb-2">Listing not found</h2>
          <Link href="/host/listings" className="text-green-700 font-semibold text-sm hover:underline">
            Back to My Listings
          </Link>
        </div>
      </HostDashboardShell>
    );
  }

  const rooms = listing.rooms ?? [];
  const wasLive = listing.status === "approved";

  return (
    <HostDashboardShell>
      <form onSubmit={handleSave} className="space-y-6 max-w-3xl">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <Link
              href="/host/listings"
              className="text-xs text-gray-500 hover:text-green-700 mb-2 inline-block"
            >
              ← My Listings
            </Link>
            <h2 className="text-xl font-bold text-gray-900 font-display">{listing.title}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={cn(
                  "text-[10px] font-bold px-2 py-0.5 rounded-full capitalize",
                  STATUS_STYLES[listing.status]
                )}
              >
                {listing.status}
              </span>
              <span className="text-xs text-gray-400">
                {rooms.length} room{rooms.length === 1 ? "" : "s"} · {listing.photoCount} photos
              </span>
            </div>
          </div>
          <Link
            href={`/listing/${listing.id}`}
            className="text-xs border border-gray-300 px-3 py-1.5 rounded-lg font-medium text-gray-600 hover:border-green-400 shrink-0"
          >
            Preview listing
          </Link>
        </div>

        {wasLive && (
          <div className="bg-amber-50 border border-amber-200 text-amber-900 text-sm rounded-xl px-4 py-3">
            Saving changes moves this listing back to <strong>Pending</strong> until admin
            re-approves it.
          </div>
        )}

        {message && (
          <div className="bg-green-50 border border-green-200 text-green-800 text-sm rounded-xl px-4 py-3">
            {message}
          </div>
        )}

        <section className="bg-white rounded-2xl border p-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Pencil className="w-4 h-4 text-green-700" />
              <h3 className="text-sm font-semibold text-gray-900">Property details</h3>
            </div>
            <Link
              href={`/host/listings/${listing.id}/edit`}
              className="text-xs font-semibold text-green-700 hover:underline"
            >
              Edit photos & filters →
            </Link>
          </div>
          <label className="block">
            <span className="text-xs font-medium text-gray-600 mb-1 block">Title</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-gray-600 mb-1 block">Description</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={4}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            {(listing.photoUrls ?? []).slice(0, 4).map((url, i) => (
              <div key={url + i} className="relative w-16 h-16 rounded-lg overflow-hidden border">
                <Image src={url} alt="" fill className="object-cover" unoptimized />
              </div>
            ))}
            <Link
              href={`/host/listings/${listing.id}/edit`}
              className="w-16 h-16 rounded-lg border border-dashed border-gray-200 flex items-center justify-center text-xs text-gray-500 hover:border-green-400"
            >
              Photos
            </Link>
          </div>
        </section>

        <section className="bg-white rounded-2xl border p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-green-700" />
            <h3 className="text-sm font-semibold text-gray-900">Amenities</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {amenityOptions.map((name) => (
              <label
                key={name}
                className={cn(
                  "flex items-center gap-2 text-sm px-3 py-2 rounded-xl border cursor-pointer transition-colors",
                  amenities.includes(name)
                    ? "border-green-500 bg-green-50 text-green-900"
                    : "border-gray-200 text-gray-700 hover:border-green-200"
                )}
              >
                <input
                  type="checkbox"
                  checked={amenities.includes(name)}
                  onChange={() => toggleAmenity(name)}
                  className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                />
                {name}
              </label>
            ))}
          </div>
        </section>

        <section className="bg-white rounded-2xl border p-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <BedDouble className="w-4 h-4 text-green-700" />
              <h3 className="text-sm font-semibold text-gray-900">Room / unit inventory</h3>
            </div>
            <Link
              href={`/host/listings/${listing.id}/rooms/new`}
              className="inline-flex items-center gap-1 text-xs font-semibold bg-green-700 hover:bg-green-800 text-white px-3 py-1.5 rounded-lg"
            >
              <Plus className="w-3.5 h-3.5" /> Add room
            </Link>
          </div>
          {rooms.length === 0 ? (
            <p className="text-sm text-gray-500">
              No rooms or cottages yet. Add units if you offer multiple accommodations on one
              property.
            </p>
          ) : (
            <ul className="space-y-2">
              {rooms.map((room) => (
                <li
                  key={room.id}
                  className="flex items-center gap-3 border border-gray-100 rounded-xl p-3 bg-gray-50/50"
                >
                  <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                    {room.img ? (
                      <Image src={room.img} alt={room.name} fill className="object-cover" unoptimized />
                    ) : null}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{room.name}</p>
                    <p className="text-xs text-gray-500">
                      {room.price}/night · {room.capacity} guests · {room.beds} beds ·{" "}
                      {room.baths} baths
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!confirm(`Remove "${room.name}"?`)) return;
                      await deleteRoom(listing.id, room.id);
                      flash("Room removed.");
                    }}
                    className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"
                    aria-label={`Remove ${room.name}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="bg-white rounded-2xl border p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Leaf className="w-4 h-4 text-green-700" />
            <h3 className="text-sm font-semibold text-gray-900">Farm-specific info</h3>
          </div>
          <label className="block">
            <span className="text-xs font-medium text-gray-600 mb-1 block">Type of farm</span>
            <select
              value={farmType}
              onChange={(e) => setFarmType(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">Select farm type</option>
              {farmTypeOptions.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>
          <div>
            <span className="text-xs font-medium text-gray-600 mb-2 block">Activities offered</span>
            <div className="flex flex-wrap gap-2">
              {activityOptions.map((activity) => (
                <button
                  key={activity}
                  type="button"
                  onClick={() => toggleActivity(activity)}
                  className={cn(
                    "text-xs font-medium px-3 py-1.5 rounded-full border transition-colors",
                    farmActivities.includes(activity)
                      ? "bg-green-700 border-green-700 text-white"
                      : "border-gray-200 text-gray-600 hover:border-green-300"
                  )}
                >
                  {activity}
                </button>
              ))}
            </div>
          </div>
          <label className="block">
            <span className="text-xs font-medium text-gray-600 mb-1 block">
              Livestock & crops on site
            </span>
            <textarea
              value={livestockCrops}
              onChange={(e) => setLivestockCrops(e.target.value)}
              rows={3}
              placeholder="e.g. Goats, chickens, date palms, organic vegetables…"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </label>
        </section>

        {/* Pricing link */}
        <section className="bg-white rounded-2xl border p-5 space-y-3">
          <div className="flex items-center gap-2">
            <BadgeDollarSign className="w-4 h-4 text-green-700" />
            <h3 className="text-sm font-semibold text-gray-900">Pricing</h3>
          </div>
          <p className="text-sm text-gray-500">
            Base rates, weekend &amp; seasonal pricing, discounts, and extra charges are managed
            here. Currency and tax follow the listing&apos;s country from Admin → Countries.
          </p>
          <Link
            href="/host/pricing"
            className="inline-flex items-center gap-1.5 text-sm bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded-xl font-semibold transition-colors"
          >
            <BadgeDollarSign className="w-4 h-4" /> Manage pricing
          </Link>
        </section>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
            {error}
          </p>
        )}

        <ListingQualityChecklist items={qualityChecklist} />

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={
              submitting || qualityChecklist.some((i) => i.required && !i.passed)
            }
            className="bg-green-700 hover:bg-green-800 disabled:opacity-60 text-white font-semibold px-6 py-2.5 rounded-xl text-sm"
          >
            {submitting ? "Saving…" : wasLive ? "Save & submit for re-approval" : "Save changes"}
          </button>
          <Link
            href="/host/listings"
            className="border border-gray-300 text-gray-600 font-medium px-6 py-2.5 rounded-xl text-sm"
          >
            Cancel
          </Link>
        </div>
        <p className="text-xs text-gray-400 flex items-start gap-1.5">
          <ClipboardList className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          Edited listings follow the same admin approval rules as before — changes are not live
          until approved.
        </p>
      </form>
    </HostDashboardShell>
  );
}
