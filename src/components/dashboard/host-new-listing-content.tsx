"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Link, useRouter } from "@/i18n/routing";
import { ImagePlus, MapPin, Pencil, Upload } from "lucide-react";
import { HostDashboardShell } from "@/components/dashboard/host-dashboard-shell";
import { ListingFilterFields } from "@/components/dashboard/listing-filter-fields";
import {
  ListingPhotosManager,
  type ManagedListingPhoto,
} from "@/components/dashboard/listing-photos-manager";
import { ListingQualityChecklist } from "@/components/dashboard/listing-quality-checklist";
import { useAuth } from "@/components/providers/auth-provider";
import { useAdminTaxonomy } from "@/components/providers/admin-taxonomy-provider";
import { useListingQualityRules } from "@/components/providers/listing-quality-rules-provider";
import { filesToDataUrls, getSubmissionById } from "@/lib/listings/submission-data";
import {
  filterHostListings,
  useListingSubmissions,
} from "@/lib/listings/use-listing-submissions";
import { EMPTY_LISTING_FILTERS } from "@/lib/listings/submission-types";
import { resolveHostId, resolveHostName } from "@/lib/listings/host-listings-utils";
import {
  listingToFilterValues,
  resolveListingLabels,
} from "@/lib/listings/validate-listing-filters";
import { resolveCountryPricingConfig } from "@/lib/admin/country-utils";
import { seedPricingFromListingForm } from "@/lib/host/host-pricing-data";
import { loadAllSubmissions } from "@/lib/listings/submission-data";
import { parseMapEmbedUrl } from "@/lib/listings/map-embed";
import {
  buildQualityChecklist,
  validateListingQuality,
} from "@/lib/listings/listing-quality-validation";
import { isExperienceListing } from "@/lib/booking/is-experience-listing";
import {
  defaultExperienceSessions,
} from "@/lib/booking/experience-session-types";
import {
  LISTING_TITLE_MAX_CHARS,
  LISTING_TITLE_MAX_WORDS,
  clampListingTitle,
  listingTitleWordCount,
} from "@/lib/listings/listing-title";
import { RichTextEditor } from "@/components/dashboard/rich-text-editor";

const MAX_PHOTOS = 12;

type ItineraryStep = { step: number; title: string; description?: string };

export function HostNewListingContent({ listingId }: { listingId?: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const { data: taxonomy } = useAdminTaxonomy();
  const { rules: qualityRules } = useListingQualityRules();
  const { all, submit, update } = useListingSubmissions();
  const hostId = resolveHostId(user);
  const hostName = resolveHostName(user);
  const hostListings = filterHostListings(all, hostId ?? "", hostName);

  const existing = useMemo(() => {
    if (!listingId) return null;
    return (
      hostListings.find((l) => l.id === listingId) ?? getSubmissionById(listingId) ?? null
    );
  }, [hostListings, listingId]);

  const isEdit = Boolean(listingId);
  const wasLive = existing?.status === "approved";

  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const photosRef = useRef<ManagedListingPhoto[]>([]);
  const [photos, setPhotos] = useState<ManagedListingPhoto[]>([]);
  const [managerOpen, setManagerOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [filterValues, setFilterValues] = useState(EMPTY_LISTING_FILTERS);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [mapEmbedInput, setMapEmbedInput] = useState("");
  const [meetingPoint, setMeetingPoint] = useState("");
  const [requirements, setRequirements] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [groupSizeMin, setGroupSizeMin] = useState(1);
  const [itinerary, setItinerary] = useState<ItineraryStep[]>([
    { step: 1, title: "", description: "" },
  ]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [hydrated, setHydrated] = useState(!listingId);

  const mapEmbedPreview = useMemo(
    () => parseMapEmbedUrl(mapEmbedInput),
    [mapEmbedInput]
  );

  const draftLabels = useMemo(
    () => resolveListingLabels(taxonomy, filterValues),
    [taxonomy, filterValues]
  );

  const isExperience = isExperienceListing({
    parentCategory: draftLabels.parentCategory,
    type: draftLabels.type,
  });

  const qualityInput = useMemo(
    () => ({
      title,
      description,
      photoCount: photos.length,
      country: draftLabels.country,
      state: draftLabels.state,
      district: draftLabels.district,
      parentCategory: draftLabels.parentCategory,
      category: draftLabels.category,
      subcategory: draftLabels.subcategory,
      highlightCount: filterValues.highlightIds.length,
      featureIconCount: filterValues.featureIconIds.length,
      advancedCount: filterValues.advancedIds.length,
      mapEmbedUrl: mapEmbedPreview ?? "",
      customSelections: filterValues.customSelections,
      customFilters: draftLabels.customFilters,
    }),
    [title, description, photos.length, draftLabels, filterValues, mapEmbedPreview]
  );

  const qualityChecklist = useMemo(
    () => buildQualityChecklist(qualityInput, qualityRules, { form: "details" }),
    [qualityInput, qualityRules]
  );

  photosRef.current = photos;

  useEffect(() => {
    return () => {
      photosRef.current.forEach((photo) => {
        if (!photo.persisted && photo.src.startsWith("blob:")) {
          URL.revokeObjectURL(photo.src);
        }
      });
    };
  }, []);

  useEffect(() => {
    if (!listingId) return;
    if (!existing) {
      setHydrated(true);
      return;
    }

    setTitle(clampListingTitle(existing.title));
    setDescription(existing.description);
    setMapEmbedInput(existing.mapEmbedUrl ?? "");
    setMeetingPoint(existing.meetingPoint ?? "");
    setRequirements(existing.requirements ?? "");
    setLicenseNumber(existing.licenseNumber ?? "");
    setGroupSizeMin(Math.max(1, existing.groupSizeMin ?? 1));
    setItinerary(
      existing.itinerary?.length
        ? existing.itinerary.map((s, i) => ({
            step: s.step || i + 1,
            title: s.title ?? "",
            description: s.description ?? "",
          }))
        : [{ step: 1, title: "", description: "" }]
    );
    const tags = existing.photoTags ?? [];
    setPhotos(
      (existing.photoUrls ?? []).map((url, index) => ({
        id: `existing-${index}-${url.slice(0, 24)}`,
        src: url,
        tag: tags[index] ?? "",
        persisted: true,
      }))
    );
    setFilterValues(listingToFilterValues(taxonomy, existing));
    setHydrated(true);
  }, [listingId, existing, taxonomy]);

  function addFiles(files: FileList | File[]) {
    const incoming = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (!incoming.length) return;

    setPhotos((prev) => {
      const remaining = MAX_PHOTOS - prev.length;
      const next = incoming.slice(0, Math.max(0, remaining)).map((file) => ({
        id: `new-${file.name}-${file.lastModified}-${Math.random()}`,
        src: URL.createObjectURL(file),
        file,
        tag: "",
        persisted: false,
      }));
      return [...prev, ...next];
    });
    setManagerOpen(true);
  }

  function handlePhotosChange(next: ManagedListingPhoto[]) {
    setPhotos(next);
  }

  async function handleNext(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    const labels = resolveListingLabels(taxonomy, filterValues);
    const mapEmbedUrl = parseMapEmbedUrl(mapEmbedInput);
    if (mapEmbedInput.trim() && !mapEmbedUrl) {
      setError(
        "Map embed looks invalid. Paste a Google Maps embed URL or iframe (Share → Embed a map)."
      );
      return;
    }

    const qualityError = validateListingQuality(
      {
        title: title.trim(),
        description: description.trim(),
        photoCount: photos.length,
        country: labels.country,
        state: labels.state,
        district: labels.district,
        parentCategory: labels.parentCategory,
        category: labels.category,
        subcategory: labels.subcategory,
        highlightCount: filterValues.highlightIds.length,
        featureIconCount: filterValues.featureIconIds.length,
        advancedCount: filterValues.advancedIds.length,
        mapEmbedUrl: mapEmbedUrl ?? "",
        customSelections: filterValues.customSelections,
        customFilters: labels.customFilters,
      },
      qualityRules,
      { form: "details" }
    );
    if (qualityError) {
      setError(qualityError);
      return;
    }

    setSubmitting(true);
    try {
      const photoUrls: string[] = [];
      const photoTags: string[] = [];

      for (const photo of photos) {
        photoTags.push(photo.tag || "");
        if (photo.persisted) {
          photoUrls.push(photo.src);
        } else if (photo.file) {
          const [dataUrl] = await filesToDataUrls([photo.file]);
          photoUrls.push(dataUrl);
        }
      }

      const payload = {
        title: clampListingTitle(title).trim() || "Untitled listing",
        description: description.trim() || "",
        ...labels,
        photoUrls,
        photoTags,
        photoCount: photoUrls.length,
        highlightIds: filterValues.highlightIds,
        featureIconIds: filterValues.featureIconIds.slice(0, 4),
        mapEmbedUrl: mapEmbedUrl || "",
        ...(isExperienceListing({
          parentCategory: labels.parentCategory,
          type: labels.type,
        })
          ? {
              meetingPoint: meetingPoint.trim(),
              requirements: requirements.trim(),
              licenseNumber: licenseNumber.trim() || undefined,
              groupSizeMin: Math.max(1, groupSizeMin),
              itinerary: itinerary
                .filter((s) => s.title.trim())
                .map((s, i) => ({
                  step: i + 1,
                  title: s.title.trim(),
                  description: s.description?.trim() || undefined,
                })),
            }
          : {}),
      };

      let savedId = listingId ?? "";

      if (isEdit && listingId) {
        const ok = await update(listingId, payload);
        if (!ok) {
          setError("Could not update listing. Please try again.");
          setSubmitting(false);
          return;
        }
        savedId = listingId;
      } else {
        savedId = await submit({
          ...payload,
          hostId: resolveHostId(user) ?? "demo-host",
          hostName: resolveHostName(user),
        });
      }

      const countryConfig = resolveCountryPricingConfig(
        taxonomy.countries,
        labels.country
      );

      const similarListingIds = loadAllSubmissions()
        .filter(
          (l) =>
            l.id !== savedId &&
            ((labels.country && l.country === labels.country) ||
              (labels.parentCategory && l.parentCategory === labels.parentCategory))
        )
        .map((l) => l.id);

      seedPricingFromListingForm({
        listingId: savedId,
        country: countryConfig,
        similarListingIds,
        seedSessions: isExperienceListing({
          parentCategory: labels.parentCategory,
          type: labels.type,
        })
          ? defaultExperienceSessions()
          : undefined,
      });

      router.push(`/host/pricing?listing=${encodeURIComponent(savedId)}&from=listing`);
    } catch (err) {
      const detail = err instanceof Error ? err.message : "";
      const fallback = isEdit
        ? "Could not update listing. Please try again."
        : "Could not save listing. Please try again.";
      setError(
        detail && detail !== "Listing request failed" && detail !== "Failed to save listing"
          ? `${fallback} ${detail}`
          : fallback
      );
      setSubmitting(false);
    }
  }

  if (isEdit && hydrated && !existing) {
    return (
      <HostDashboardShell>
        <div className="bg-white rounded-2xl border p-8 text-center max-w-lg">
          <h2 className="text-lg font-bold text-gray-900 mb-2">Listing not found</h2>
          <p className="text-sm text-gray-500 mb-4">
            This listing may have been removed or the link is invalid.
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
          <h2 className="text-xl font-bold text-gray-900 font-display">
            {isEdit ? "Edit Listing" : "New listing"}
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            {isEdit
              ? wasLive
                ? "Update details, then continue to Pricing. Live listings stay pending until admin re-approves."
                : "Update details, then continue to Pricing."
              : "Step 1 of 2 — listing details. Next opens Pricing."}
          </p>
        </div>

        {isEdit && wasLive && (
          <div className="bg-amber-50 border border-amber-200 text-amber-900 text-sm rounded-xl px-4 py-3">
            This listing is currently live. Saving edits moves it back to{" "}
            <strong>Pending</strong> and hides it from guests until an admin approves the
            changes.
          </div>
        )}

        <form
          ref={formRef}
          className="bg-white rounded-2xl border p-6 space-y-5"
          onSubmit={handleNext}
          noValidate
        >
          <div>
            <div className="flex items-center justify-between gap-3 mb-1.5">
              <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                Title
              </label>
              <span className="text-xs text-gray-400">
                {listingTitleWordCount(title)}/{LISTING_TITLE_MAX_WORDS} words
              </span>
            </div>
            <input
              id="title"
              name="title"
              value={title}
              onChange={(e) => setTitle(clampListingTitle(e.target.value))}
              maxLength={LISTING_TITLE_MAX_CHARS}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Green Valley Farmhouse"
            />
            <p className="text-xs text-gray-400 mt-1">
              Short titles stay on one line on the listing page.
            </p>
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1.5">
              Description
            </label>
            <RichTextEditor
              id="description"
              name="description"
              rows={8}
              value={description}
              onChange={setDescription}
              placeholder="Describe your property..."
            />
          </div>

          <div>
            <div className="flex items-center justify-between gap-3 mb-1.5">
              <label className="block text-sm font-medium text-gray-700">
                Photos
              </label>
              <span className="text-xs text-gray-400">
                {photos.length}/{MAX_PHOTOS} uploaded
              </span>
            </div>

            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files) addFiles(e.target.files);
                e.target.value = "";
              }}
            />

            {photos.length === 0 ? (
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
                    : "border-amber-300 bg-amber-50/40"
                }`}
              >
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-700">
                  Click to upload or drag and drop
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  PNG, JPG, WEBP — up to {MAX_PHOTOS} photos
                </p>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => setManagerOpen(true)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold bg-green-700 hover:bg-green-800 text-white px-3 py-1.5 rounded-lg"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Manage photos
                  </button>
                  {photos.length < MAX_PHOTOS && (
                    <button
                      type="button"
                      onClick={() => inputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 text-xs font-medium border border-gray-200 hover:border-green-400 text-gray-600 px-3 py-1.5 rounded-lg"
                    >
                      <ImagePlus className="w-3.5 h-3.5" />
                      Upload more
                    </button>
                  )}
                  <p className="text-xs text-gray-400">
                    First photo is the cover. Tag rooms and rearrange in Manage photos.
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {photos.map((photo, index) => (
                    <button
                      key={photo.id}
                      type="button"
                      onClick={() => setManagerOpen(true)}
                      className="relative group aspect-[4/3] rounded-xl overflow-hidden border bg-gray-100 text-start"
                    >
                      <Image
                        src={photo.src}
                        alt={`Listing photo ${index + 1}`}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                      {index === 0 && (
                        <span className="absolute top-2 start-2 bg-green-700 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                          Cover
                        </span>
                      )}
                      {photo.tag ? (
                        <span className="absolute bottom-2 start-2 end-2 truncate bg-black/65 text-white text-[10px] font-medium px-2 py-0.5 rounded-full text-center">
                          {photo.tag}
                        </span>
                      ) : null}
                    </button>
                  ))}

                  {photos.length < MAX_PHOTOS && (
                    <button
                      type="button"
                      onClick={() => inputRef.current?.click()}
                      className="aspect-[4/3] rounded-xl border-2 border-dashed border-gray-200 hover:border-green-400 hover:bg-green-50 flex flex-col items-center justify-center gap-1 text-gray-500 transition-colors"
                    >
                      <ImagePlus className="w-6 h-6" />
                      <span className="text-xs font-medium">Add more</span>
                    </button>
                  )}
                </div>
              </>
            )}
          </div>

          <ListingFilterFields values={filterValues} onChange={setFilterValues} />

          {isExperience && (
            <div className="space-y-4 border border-green-100 rounded-xl p-4 bg-green-50/40">
              <div>
                <p className="text-sm font-semibold text-gray-900">Experience details</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Guests see these on the listing before they pick a session.
                </p>
              </div>
              <label className="block">
                <span className="text-sm font-medium text-gray-700">Meeting point / pickup</span>
                <textarea
                  value={meetingPoint}
                  onChange={(e) => setMeetingPoint(e.target.value)}
                  rows={2}
                  className="mt-1.5 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Hotel lobby pickup within 30 minutes of agreed time"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-gray-700">Requirements / safety</span>
                <textarea
                  value={requirements}
                  onChange={(e) => setRequirements(e.target.value)}
                  rows={3}
                  className="mt-1.5 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Age limits, clothing advice, health notes…"
                />
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-sm font-medium text-gray-700">License / certification</span>
                  <input
                    value={licenseNumber}
                    onChange={(e) => setLicenseNumber(e.target.value)}
                    className="mt-1.5 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="DCT license number"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-gray-700">Min group size</span>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={groupSizeMin}
                    onChange={(e) => setGroupSizeMin(Math.max(1, Number(e.target.value) || 1))}
                    className="mt-1.5 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </label>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-gray-700">Itinerary</span>
                  <button
                    type="button"
                    onClick={() =>
                      setItinerary((prev) => [
                        ...prev,
                        { step: prev.length + 1, title: "", description: "" },
                      ])
                    }
                    className="text-xs font-semibold text-green-700 hover:text-green-800"
                  >
                    Add step
                  </button>
                </div>
                {itinerary.map((step, index) => (
                  <div
                    key={`step-${index}`}
                    className="grid grid-cols-1 sm:grid-cols-[2rem_1fr] gap-2 items-start bg-white border border-gray-100 rounded-lg p-3"
                  >
                    <span className="text-xs font-bold text-green-700 pt-2.5">{index + 1}</span>
                    <div className="space-y-2">
                      <input
                        value={step.title}
                        onChange={(e) =>
                          setItinerary((prev) =>
                            prev.map((s, i) =>
                              i === index ? { ...s, title: e.target.value } : s
                            )
                          )
                        }
                        placeholder="Pickup from hotel"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                      <input
                        value={step.description ?? ""}
                        onChange={(e) =>
                          setItinerary((prev) =>
                            prev.map((s, i) =>
                              i === index ? { ...s, description: e.target.value } : s
                            )
                          )
                        }
                        placeholder="Optional detail"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-3 border border-gray-100 rounded-xl p-4 bg-gray-50/60">
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-green-700 mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900">Embed map</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Optional. In Google Maps open your place → Share → Embed a map → copy the
                  iframe or embed URL. Guests will see it on the listing location section.
                </p>
              </div>
            </div>
            <textarea
              value={mapEmbedInput}
              onChange={(e) => setMapEmbedInput(e.target.value)}
              rows={3}
              placeholder='Paste iframe HTML or https://www.google.com/maps/embed?…'
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white font-mono focus:outline-none focus:ring-2 focus:ring-green-500 resize-y min-h-[72px]"
            />
            {mapEmbedInput.trim() && !mapEmbedPreview ? (
              <p className="text-xs text-amber-700">
                Could not read an embed URL yet. Use Share → Embed a map (not the normal share
                link).
              </p>
            ) : null}
            {mapEmbedPreview ? (
              <div className="relative w-full h-48 rounded-xl overflow-hidden border border-gray-200 bg-white">
                <iframe
                  title="Map preview"
                  src={mapEmbedPreview}
                  className="absolute inset-0 w-full h-full border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  allowFullScreen
                />
              </div>
            ) : null}
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <ListingQualityChecklist items={qualityChecklist} />

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={
                submitting ||
                (isEdit && !hydrated) ||
                qualityChecklist.some((i) => i.required && !i.passed)
              }
              className="bg-green-700 hover:bg-green-800 disabled:opacity-60 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-colors"
            >
              {submitting ? "Saving…" : "Next"}
            </button>
          </div>
          <p className="text-xs text-gray-400">
            Next saves this listing and opens Pricing. Currency and tax come from the
            selected country; rates copy from a similar listing when available.
          </p>
        </form>
      </div>

      <ListingPhotosManager
        open={managerOpen}
        onClose={() => setManagerOpen(false)}
        photos={photos}
        maxPhotos={MAX_PHOTOS}
        onChange={handlePhotosChange}
      />
    </HostDashboardShell>
  );
}
