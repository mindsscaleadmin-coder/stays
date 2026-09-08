"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Link, useRouter } from "@/i18n/routing";
import { Check, Trash2, Upload } from "lucide-react";
import { HostDashboardShell } from "@/components/dashboard/host-dashboard-shell";
import { useAdminTaxonomy } from "@/components/providers/admin-taxonomy-provider";
import { useAuth } from "@/components/providers/auth-provider";
import { resolveCountryPricingConfig } from "@/lib/admin/country-utils";
import { usePhotoTagsCatalog } from "@/lib/admin/use-photo-tags-catalog";
import {
  DEFAULT_CUSTOM_ITEMS,
  resolvePropertyTabId,
  type FilterTab,
} from "@/lib/admin/taxonomy-types";
import { initRoomPricing } from "@/lib/host/host-pricing-data";
import { filesToDataUrls, getSubmissionById } from "@/lib/listings/submission-data";
import { photoTagLabel } from "@/lib/listings/photo-tags";
import {
  filterHostListings,
  resolveHostId,
  resolveHostName,
  useListingSubmissions,
} from "@/lib/listings/use-listing-submissions";

const CUSTOM_CATEGORY = "__custom__";

type RoomPhoto =
  | { id: string; kind: "upload"; file: File; preview: string }
  | { id: string; kind: "listing"; listingIndex: number; preview: string };

export function HostAddRoomContent({ listingId }: { listingId: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const { data: taxonomy } = useAdminTaxonomy();
  const { enabledItems: photoTags } = usePhotoTagsCatalog();
  const hostId = resolveHostId(user);
  const hostName = resolveHostName(user);
  const { all, addRoom, adminUpdate, ready } = useListingSubmissions();
  const hostListings = filterHostListings(all, hostId ?? "", hostName);

  const listing = useMemo(() => {
    return hostListings.find((l) => l.id === listingId) ?? getSubmissionById(listingId);
  }, [hostListings, listingId]);

  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const photosRef = useRef<RoomPhoto[]>([]);
  const [photos, setPhotos] = useState<RoomPhoto[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successNote, setSuccessNote] = useState("");
  const [roomTypeId, setRoomTypeId] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [roomName, setRoomName] = useState("");
  const [tagSavingIndex, setTagSavingIndex] = useState<number | null>(null);
  const submitModeRef = useRef<"pricing" | "another">("pricing");

  const roomTypeTab = useMemo(() => {
    return (
      taxonomy.mainTabs.find((t) => {
        if (t.enabled === false) return false;
        return t.id === "roomType" || resolvePropertyTabId(t) === "roomType";
      }) ?? ({ id: "roomType", label: "Room type" } satisfies FilterTab)
    );
  }, [taxonomy.mainTabs]);

  const roomTypeOptions = useMemo(() => {
    const fromTaxonomy = [...(taxonomy.customItems[roomTypeTab.id] ?? [])]
      .filter((i) => i.enabled !== false)
      .sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" })
      );
    if (fromTaxonomy.length > 0) return fromTaxonomy;
    return [...(DEFAULT_CUSTOM_ITEMS.roomType ?? [])];
  }, [roomTypeTab.id, taxonomy.customItems]);

  const bedroomTags = useMemo(
    () =>
      photoTags.filter(
        (t) => t.value === "bedroom" || t.value === "master-bedroom" || /bedroom/i.test(t.label)
      ),
    [photoTags]
  );

  const listingPhotos = listing?.photoUrls ?? [];
  const existingRooms = listing?.rooms ?? [];

  photosRef.current = photos;

  useEffect(() => {
    return () => {
      photosRef.current.forEach((photo) => {
        if (photo.kind === "upload") URL.revokeObjectURL(photo.preview);
      });
    };
  }, []);

  function addFiles(files: FileList | File[]) {
    const incoming = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (!incoming.length) return;

    setPhotos((prev) => {
      prev.forEach((photo) => {
        if (photo.kind === "upload") URL.revokeObjectURL(photo.preview);
      });
      const file = incoming[0];
      return [
        {
          id: `upload-${file.name}-${file.lastModified}-${Math.random()}`,
          kind: "upload" as const,
          file,
          preview: URL.createObjectURL(file),
        },
      ];
    });
  }

  function removePhoto(id: string) {
    setPhotos((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target?.kind === "upload") URL.revokeObjectURL(target.preview);
      return prev.filter((p) => p.id !== id);
    });
  }

  function toggleListingPhoto(index: number, url: string) {
    setPhotos((prev) => {
      const existing = prev.find((p) => p.kind === "listing" && p.listingIndex === index);
      if (existing) return prev.filter((p) => p.id !== existing.id);
      const next: RoomPhoto = {
        id: `listing-${index}`,
        kind: "listing",
        listingIndex: index,
        preview: url,
      };
      // Single-photo mode: replace whatever was selected/uploaded
      prev.forEach((photo) => {
        if (photo.kind === "upload") URL.revokeObjectURL(photo.preview);
      });
      return [next];
    });
  }

  async function handleListingPhotoTag(index: number, tag: string) {
    if (!listing) return;
    const nextTags = listing.photoUrls.map((_, i) => listing.photoTags?.[i] ?? "");
    nextTags[index] = tag;
    setTagSavingIndex(index);
    try {
      await adminUpdate(listingId, { photoTags: nextTags });
    } finally {
      setTagSavingIndex(null);
    }
  }

  function resetForm() {
    formRef.current?.reset();
    photosRef.current.forEach((photo) => {
      if (photo.kind === "upload") URL.revokeObjectURL(photo.preview);
    });
    setPhotos([]);
    setRoomTypeId("");
    setCustomCategory("");
    setRoomName("");
    setError("");
    if (inputRef.current) inputRef.current.value = "";
  }

  function selectedCategoryName(): string {
    if (roomTypeId === CUSTOM_CATEGORY) return customCategory.trim();
    return roomTypeOptions.find((o) => o.id === roomTypeId)?.name.trim() ?? "";
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccessNote("");

    if (!listing) {
      setError("Property not found.");
      return;
    }
    if (!formRef.current?.reportValidity()) return;
    if (!roomTypeId) {
      setError("Please select a room category.");
      return;
    }
    const typeName = selectedCategoryName();
    if (!typeName) {
      setError(
        roomTypeId === CUSTOM_CATEGORY
          ? "Enter a custom room category."
          : "Please select a room category."
      );
      return;
    }
    if (photos.length === 0) {
      setError("Please upload or select a room photo.");
      return;
    }

    const form = new FormData(formRef.current);
    const name = roomName.trim() || typeName;
    const price = Number(form.get("price"));
    const maxAdults = Math.max(1, Number(form.get("maxAdults")) || 1);
    const maxChildren = Math.max(0, Number(form.get("maxChildren")) || 0);
    const maxInfants = Math.max(0, Number(form.get("maxInfants")) || 0);
    const capacity = maxAdults + maxChildren;
    const beds = Number(form.get("beds"));
    const baths = Number(form.get("baths"));
    const mode = submitModeRef.current;

    if (!Number.isFinite(price) || price <= 0) {
      setError("Enter a nightly rate for this room.");
      return;
    }

    setSubmitting(true);
    try {
      const first = photos[0];
      let img = first.preview;
      if (first.kind === "upload") {
        const urls = await filesToDataUrls([first.file], 1);
        img = urls[0] ?? first.preview;
      }

      const roomId = await addRoom(listingId, {
        name,
        description: "",
        price,
        capacity: capacity || 2,
        maxAdults,
        maxChildren,
        maxInfants,
        beds: beds || 1,
        baths: baths || 1,
        img,
        typeId: roomTypeId === CUSTOM_CATEGORY ? "custom" : roomTypeId,
        typeName,
      });

      if (!roomId) {
        setError("Could not add room. Please try again.");
        setSubmitting(false);
        return;
      }

      const countryConfig = resolveCountryPricingConfig(taxonomy.countries, listing.country);
      initRoomPricing(listingId, roomId, price, countryConfig);

      if (mode === "another") {
        resetForm();
        setSuccessNote(`“${name}” added. Pick another category below, or continue to Pricing.`);
        setSubmitting(false);
        return;
      }

      router.push(`/host/pricing?listing=${listingId}&room=${roomId}`);
    } catch {
      setError("Could not add room. Please try again.");
      setSubmitting(false);
    }
  }

  if (ready && !listing) {
    return (
      <HostDashboardShell>
        <div className="bg-white rounded-2xl border p-8 text-center max-w-lg">
          <h2 className="text-lg font-bold text-gray-900 mb-2">Property not found</h2>
          <p className="text-sm text-gray-500 mb-4">
            Add rooms only works on properties you have already listed.
          </p>
          <Link href="/host/listings" className="text-green-700 font-semibold text-sm hover:underline">
            Back to My Listings
          </Link>
        </div>
      </HostDashboardShell>
    );
  }

  return (
    <HostDashboardShell>
      <div className="space-y-6 max-w-2xl">
        <div>
          <p className="text-xs font-medium text-green-700 mb-1">
            <Link href="/host/listings" className="hover:underline">
              My Listings
            </Link>
            {" / "}
            {listing?.title ?? "…"}
          </p>
          <h2 className="text-xl font-bold text-gray-900 font-display">Add Room</h2>
          <p className="text-gray-500 text-sm mt-1">
            Add as many rooms as you need. Each can be a different category with its own
            nightly rate.
          </p>
        </div>

        {existingRooms.length > 0 && (
          <div className="bg-white rounded-2xl border p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-gray-900">
                Rooms on this property ({existingRooms.length})
              </p>
              <Link
                href={`/host/pricing?listing=${listingId}`}
                className="text-xs font-semibold text-green-700 hover:text-green-800"
              >
                Set prices →
              </Link>
            </div>
            <ul className="space-y-2">
              {existingRooms.map((room) => (
                <li
                  key={room.id}
                  className="flex items-center justify-between gap-3 text-sm border border-gray-100 rounded-xl px-3 py-2 bg-gray-50/60"
                >
                  <span className="font-medium text-gray-900 truncate">
                    {room.name}
                    {room.typeName && room.typeName !== room.name ? (
                      <span className="font-normal text-gray-500"> · {room.typeName}</span>
                    ) : null}
                  </span>
                  <span className="text-xs text-gray-500 shrink-0">
                    {room.price}/night · {room.capacity} guests
                    {room.maxAdults != null || room.maxChildren != null || room.maxInfants != null
                      ? ` (${room.maxAdults ?? room.capacity} adults${
                          (room.maxChildren ?? 0) > 0 ? `, ${room.maxChildren} children` : ""
                        }${
                          (room.maxInfants ?? 0) > 0 ? `, ${room.maxInfants} infants` : ""
                        })`
                      : ""}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {successNote && (
          <div className="bg-green-50 border border-green-200 text-green-800 text-sm rounded-xl px-4 py-3">
            {successNote}
          </div>
        )}

        <form
          ref={formRef}
          className="bg-white rounded-2xl border p-6 space-y-5"
          onSubmit={handleSubmit}
        >
          <div>
            <label
              htmlFor="listing-roomType"
              className="block text-sm font-medium text-gray-700 mb-1.5"
            >
              Room category <span className="text-red-500">*</span>
            </label>
            <select
              id="listing-roomType"
              value={roomTypeId}
              onChange={(e) => {
                const next = e.target.value;
                setRoomTypeId(next);
                if (next && next !== CUSTOM_CATEGORY && !roomName.trim()) {
                  const label = roomTypeOptions.find((o) => o.id === next)?.name ?? "";
                  setRoomName(label);
                }
              }}
              required
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">Select a category</option>
              {roomTypeOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.name}
                </option>
              ))}
              <option value={CUSTOM_CATEGORY}>Other / custom category</option>
            </select>
            <p className="text-xs text-gray-400 mt-1.5">
              Cottage, deluxe, dorm — each room can be a different category.
            </p>
          </div>

          {roomTypeId === CUSTOM_CATEGORY && (
            <div>
              <label
                htmlFor="custom-category"
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                Custom category <span className="text-red-500">*</span>
              </label>
              <input
                id="custom-category"
                value={customCategory}
                onChange={(e) => {
                  setCustomCategory(e.target.value);
                  if (!roomName.trim()) setRoomName(e.target.value);
                }}
                required
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="e.g. Garden cottage"
              />
            </div>
          )}

          <div>
            <label htmlFor="room-name" className="block text-sm font-medium text-gray-700 mb-1.5">
              Room name
            </label>
            <input
              id="room-name"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Defaults to the category name"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1.5">
                Nightly rate <span className="text-red-500">*</span>
              </label>
              <input
                id="price"
                name="price"
                type="number"
                min={1}
                required
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="This room’s rate"
              />
            </div>
            <div>
              <label htmlFor="beds" className="block text-sm font-medium text-gray-700 mb-1.5">
                Beds
              </label>
              <input
                id="beds"
                name="beds"
                type="number"
                min={1}
                defaultValue={1}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label htmlFor="baths" className="block text-sm font-medium text-gray-700 mb-1.5">
                Baths
              </label>
              <input
                id="baths"
                name="baths"
                type="number"
                min={1}
                defaultValue={1}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-700 mb-1.5">Guest capacity</p>
            <p className="text-xs text-gray-500 mb-2">
              Paying guests = adults + children. Infants do not count toward the room limit.
            </p>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label htmlFor="maxAdults" className="block text-xs font-medium text-gray-600 mb-1">
                  Adults
                </label>
                <input
                  id="maxAdults"
                  name="maxAdults"
                  type="number"
                  min={1}
                  max={20}
                  defaultValue={2}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label htmlFor="maxChildren" className="block text-xs font-medium text-gray-600 mb-1">
                  Children
                </label>
                <input
                  id="maxChildren"
                  name="maxChildren"
                  type="number"
                  min={0}
                  max={20}
                  defaultValue={0}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label htmlFor="maxInfants" className="block text-xs font-medium text-gray-600 mb-1">
                  Infants
                </label>
                <input
                  id="maxInfants"
                  name="maxInfants"
                  type="number"
                  min={0}
                  max={10}
                  defaultValue={0}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between gap-3 mb-1.5">
              <label className="block text-sm font-medium text-gray-700">
                Room photo <span className="text-red-500">*</span>
              </label>
              <span className="text-xs text-gray-400">1 photo</span>
            </div>

            {listingPhotos.length > 0 && (
              <div className="mb-4 space-y-2">
                <p className="text-xs font-medium text-gray-600">
                  Choose from listing photos — tag bedrooms, then select for this room
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {listingPhotos.map((url, index) => {
                    const selected = photos.some(
                      (p) => p.kind === "listing" && p.listingIndex === index
                    );
                    const tag = listing?.photoTags?.[index] ?? "";
                    const isBedroom =
                      tag === "bedroom" ||
                      tag === "master-bedroom" ||
                      /bedroom/i.test(photoTagLabel(tag));
                    return (
                      <div
                        key={`listing-photo-${index}`}
                        className={`rounded-xl border overflow-hidden bg-gray-50 ${
                          selected
                            ? "border-green-500 ring-2 ring-green-200"
                            : isBedroom
                              ? "border-green-200"
                              : "border-gray-200"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => toggleListingPhoto(index, url)}
                          className="relative block w-full aspect-[4/3]"
                        >
                          <Image
                            src={url}
                            alt={`Listing photo ${index + 1}`}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                          {selected && (
                            <span className="absolute top-2 start-2 inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-700 text-white">
                              <Check className="w-3.5 h-3.5" />
                            </span>
                          )}
                          {tag ? (
                            <span className="absolute bottom-2 start-2 end-2 truncate text-[10px] font-semibold bg-black/60 text-white px-1.5 py-0.5 rounded">
                              {photoTagLabel(tag)}
                            </span>
                          ) : null}
                        </button>
                        <div className="p-1.5 border-t border-gray-100 bg-white">
                          <select
                            value={tag}
                            disabled={tagSavingIndex === index}
                            onChange={(e) => void handleListingPhotoTag(index, e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full text-[11px] border border-gray-200 rounded-lg px-1.5 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-green-500"
                            aria-label={`Tag for listing photo ${index + 1}`}
                          >
                            <option value="">Tag photo…</option>
                            {(bedroomTags.length > 0 ? bedroomTags : photoTags).map((t) => (
                              <option key={t.id} value={t.value}>
                                {t.label}
                              </option>
                            ))}
                            {bedroomTags.length > 0 &&
                              photoTags
                                .filter((t) => !bedroomTags.some((b) => b.id === t.id))
                                .map((t) => (
                                  <option key={t.id} value={t.value}>
                                    {t.label}
                                  </option>
                                ))}
                          </select>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              multiple={false}
              className="hidden"
              onChange={(e) => {
                if (e.target.files) addFiles(e.target.files);
                e.target.value = "";
              }}
            />

            <div
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
              }}
              onClick={() => inputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer ${
                dragOver
                  ? "border-green-500 bg-green-50"
                  : photos.length === 0
                    ? "border-amber-300 bg-amber-50/40"
                    : "border-gray-200 hover:border-green-400 hover:bg-gray-50"
              }`}
            >
              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-700">
                {listingPhotos.length > 0 ? "Or upload a room photo" : "Upload room photo"}
              </p>
              <p className="text-xs text-gray-400 mt-1">PNG, JPG — 1 photo required</p>
            </div>

            {photos.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                {photos.map((photo, index) => (
                  <div
                    key={photo.id}
                    className="relative group aspect-[4/3] rounded-xl overflow-hidden border bg-gray-100"
                  >
                    <Image
                      src={photo.preview}
                      alt={`Room photo ${index + 1}`}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                    {photo.kind === "listing" && (
                      <span className="absolute bottom-2 start-2 text-[10px] font-semibold bg-black/60 text-white px-1.5 py-0.5 rounded">
                        From listing
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => removePhoto(photo.id)}
                      className="absolute top-2 end-2 p-1.5 bg-white/90 hover:bg-red-50 text-red-600 rounded-lg"
                      aria-label={`Remove photo ${index + 1}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting || !listing}
              onClick={() => {
                submitModeRef.current = "pricing";
              }}
              className="bg-green-700 hover:bg-green-800 disabled:opacity-60 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-colors"
            >
              {submitting && submitModeRef.current === "pricing"
                ? "Saving…"
                : "Save & go to Pricing"}
            </button>
            <button
              type="submit"
              disabled={submitting || !listing}
              onClick={() => {
                submitModeRef.current = "another";
              }}
              className="border border-green-700 text-green-800 hover:bg-green-50 disabled:opacity-60 font-semibold px-6 py-2.5 rounded-xl text-sm transition-colors"
            >
              {submitting && submitModeRef.current === "another"
                ? "Saving…"
                : "Save & add another"}
            </button>
            <button
              type="button"
              onClick={() =>
                router.push(
                  `/host/pricing?listing=${encodeURIComponent(listingId)}`
                )
              }
              className="border border-gray-300 hover:border-gray-400 text-gray-600 font-medium px-6 py-2.5 rounded-xl text-sm transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </HostDashboardShell>
  );
}
