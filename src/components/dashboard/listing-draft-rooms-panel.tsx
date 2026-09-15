"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { BedDouble, Building2, Check, Home, ImagePlus, Layers, Plus, Trash2 } from "lucide-react";
import { usePhotoTagsCatalog } from "@/lib/admin/use-photo-tags-catalog";
import { cn } from "@/lib/utils";

export const MAX_ROOM_PHOTOS = 4;

export type DraftRoomPhoto = {
  id: string;
  file: File | null;
  preview: string;
  tag: string;
};

export type ListingPricingMode = "whole_property" | "multi_rate_rooms";

export type DraftListingRoom = {
  key: string;
  name: string;
  description: string;
  price: string;
  /** Paying guest ceiling (adults + children at booking). Infants are excluded. */
  maxGuests: number;
  maxAdults: number;
  maxChildren: number;
  maxInfants: number;
  beds: number;
  baths: number;
  photos: DraftRoomPhoto[];
};

function clampDraftRoomGuests(
  room: DraftListingRoom,
  patch: Partial<Pick<DraftListingRoom, "maxGuests" | "maxAdults" | "maxChildren" | "maxInfants">>
): Pick<DraftListingRoom, "maxGuests" | "maxAdults" | "maxChildren" | "maxInfants"> {
  const maxInfants = Math.max(0, patch.maxInfants ?? room.maxInfants);
  const changingTotal = patch.maxGuests !== undefined;
  const changingAdults = patch.maxAdults !== undefined;
  const changingChildren = patch.maxChildren !== undefined;

  if (changingAdults) {
    const maxGuests = room.maxGuests;
    const maxAdults = Math.min(Math.max(1, patch.maxAdults!), maxGuests);
    return { maxGuests, maxAdults, maxChildren: maxGuests - maxAdults, maxInfants };
  }

  if (changingChildren) {
    const maxGuests = room.maxGuests;
    const maxChildren = Math.min(Math.max(0, patch.maxChildren!), maxGuests - 1);
    const maxAdults = Math.max(1, maxGuests - maxChildren);
    return { maxGuests, maxAdults, maxChildren: maxGuests - maxAdults, maxInfants };
  }

  if (changingTotal) {
    const maxGuests = Math.max(1, patch.maxGuests!);
    const maxAdults = Math.min(Math.max(1, room.maxAdults), maxGuests);
    return { maxGuests, maxAdults, maxChildren: maxGuests - maxAdults, maxInfants };
  }

  const maxGuests = room.maxGuests;
  const maxAdults = Math.min(Math.max(1, room.maxAdults), maxGuests);
  return { maxGuests, maxAdults, maxChildren: maxGuests - maxAdults, maxInfants };
}

export function draftRoomPhotosFromListing(
  room: { id: string; name: string; img: string },
  photoUrls: string[],
  photoTags: string[]
): DraftRoomPhoto[] {
  const roomName = room.name.trim();
  const photos: DraftRoomPhoto[] = [];
  photoUrls.forEach((url, index) => {
    const tag = photoTags[index] ?? "";
    if (url === room.img || (roomName && tag === roomName)) {
      photos.push({
        id: `existing-${room.id}-${index}`,
        file: null,
        preview: url,
        tag,
      });
    }
  });
  if (photos.length === 0 && room.img) {
    photos.push({
      id: `existing-${room.id}-cover`,
      file: null,
      preview: room.img,
      tag: roomName,
    });
  }
  return photos.slice(0, MAX_ROOM_PHOTOS);
}

export function createEmptyDraftRoom(): DraftListingRoom {
  return {
    key: `room-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: "",
    description: "",
    price: "",
    maxGuests: 2,
    maxAdults: 2,
    maxChildren: 0,
    maxInfants: 0,
    beds: 1,
    baths: 1,
    photos: [],
  };
}

function revokeRoomPhoto(photo: DraftRoomPhoto) {
  if (photo.preview.startsWith("blob:")) URL.revokeObjectURL(photo.preview);
}

function revokeRoomPhotos(photos: DraftRoomPhoto[]) {
  photos.forEach(revokeRoomPhoto);
}

const STAY_PRICING_OPTIONS: {
  id: ListingPricingMode;
  title: string;
  description: string;
  icon: typeof Home;
}[] = [
  {
    id: "whole_property",
    title: "One rate for whole property",
    description:
      "You may have several rooms, but guests book and pay one nightly rate for the entire place.",
    icon: Home,
  },
  {
    id: "multi_rate_rooms",
    title: "Multiple rooms, Multiple rates",
    description: "Each room type is booked separately with its own nightly rate.",
    icon: BedDouble,
  },
];

const VENUE_PRICING_OPTIONS: {
  id: ListingPricingMode;
  title: string;
  description: string;
  icon: typeof Home;
}[] = [
  {
    id: "whole_property",
    title: "One rate for whole venue",
    description:
      "Guests enquire for the entire venue at one starting price — halls and spaces are not priced separately.",
    icon: Building2,
  },
  {
    id: "multi_rate_rooms",
    title: "Multiple venues, Multiple rates",
    description:
      "Each hall, lawn, or space is booked separately with its own indicative rate.",
    icon: Layers,
  },
];

export function ListingPricingModePicker({
  mode,
  onModeChange,
  variant = "stay",
}: {
  mode: ListingPricingMode;
  onModeChange: (mode: ListingPricingMode) => void;
  variant?: "stay" | "venue";
}) {
  const options = variant === "venue" ? VENUE_PRICING_OPTIONS : STAY_PRICING_OPTIONS;

  return (
    <div
      role="radiogroup"
      aria-label={variant === "venue" ? "Venue pricing model" : "Property pricing model"}
      className="grid grid-cols-1 sm:grid-cols-2 gap-3"
    >
      {options.map((option) => {
        const selected = mode === option.id;
        const Icon = option.icon;
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onModeChange(option.id)}
            className={cn(
              "relative flex items-start gap-3 rounded-xl border px-4 py-3.5 text-start transition-all",
              selected
                ? "border-green-700 bg-green-50 shadow-sm ring-2 ring-green-700/15"
                : "border-gray-200 bg-white hover:border-green-500 hover:bg-gray-50"
            )}
          >
            <span
              className={cn(
                "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                selected
                  ? "border-green-700 bg-green-700 text-white"
                  : "border-gray-300 bg-white text-transparent"
              )}
            >
              <Check className="h-3 w-3" strokeWidth={3} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <Icon className="h-4 w-4 shrink-0 text-green-700" />
                <span className="text-sm font-semibold text-gray-900">{option.title}</span>
              </span>
              <span className="block text-xs text-gray-500 mt-1 leading-relaxed">
                {option.description}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function ListingDraftRoomsEditor({
  rooms,
  onRoomsChange,
  currency,
  currencySymbol,
}: {
  rooms: DraftListingRoom[];
  onRoomsChange: (rooms: DraftListingRoom[]) => void;
  currency: string;
  currencySymbol?: string;
}) {
  const roomsRef = useRef(rooms);
  roomsRef.current = rooms;

  useEffect(() => {
    return () => {
      roomsRef.current.forEach((room) => revokeRoomPhotos(room.photos));
    };
  }, []);

  function patchRoom(key: string, partial: Partial<DraftListingRoom>) {
    onRoomsChange(rooms.map((room) => (room.key === key ? { ...room, ...partial } : room)));
  }

  function removeRoom(key: string) {
    const target = rooms.find((room) => room.key === key);
    if (target) revokeRoomPhotos(target.photos);
    onRoomsChange(rooms.filter((room) => room.key !== key));
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50/40 p-4 space-y-3">
      <div>
        <p className="text-sm font-semibold text-gray-900">Room types & rates</p>
        <p className="text-xs text-gray-500 mt-0.5">
          Add each bookable room with its own description, photos (up to {MAX_ROOM_PHOTOS}), and
          nightly rate.
        </p>
      </div>

      {rooms.map((room, index) => (
        <DraftRoomCard
          key={room.key}
          room={room}
          index={index}
          currency={currency}
          currencySymbol={currencySymbol}
          onPatch={(partial) => patchRoom(room.key, partial)}
          onRemove={() => removeRoom(room.key)}
          canRemove={rooms.length > 1}
        />
      ))}

      <button
        type="button"
        onClick={() => onRoomsChange([...rooms, createEmptyDraftRoom()])}
        className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-green-300 bg-green-50/50 px-3 py-2.5 text-sm font-semibold text-green-800 hover:bg-green-50 transition-colors"
      >
        <Plus className="w-4 h-4" />
        Add another room
      </button>
    </div>
  );
}

export function DraftRoomPhotosEditor({
  roomName,
  photos,
  onChange,
}: {
  roomName: string;
  photos: DraftRoomPhoto[];
  onChange: (photos: DraftRoomPhoto[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { enabledItems: photoTags } = usePhotoTagsCatalog();
  const chipTags = photoTags.filter((t) => t.value !== "other");
  const roomNameTag = roomName.trim();

  function addFiles(files: FileList | File[]) {
    const incoming = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (!incoming.length) return;
    const remaining = MAX_ROOM_PHOTOS - photos.length;
    const next = incoming.slice(0, Math.max(0, remaining)).map((file) => ({
      id: `room-photo-${file.name}-${file.lastModified}-${Math.random()}`,
      file,
      preview: URL.createObjectURL(file),
      tag: roomNameTag,
    }));
    onChange([...photos, ...next]);
  }

  function removeAt(index: number) {
    const target = photos[index];
    if (target) revokeRoomPhoto(target);
    onChange(photos.filter((_, i) => i !== index));
  }

  function setTag(index: number, tag: string) {
    onChange(photos.map((photo, i) => (i === index ? { ...photo, tag } : photo)));
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="block text-xs font-medium text-gray-600">Room photos</span>
        <span className="text-[10px] text-gray-400">{photos.length}/{MAX_ROOM_PHOTOS}</span>
      </div>
      <p className="text-[10px] text-gray-500 mb-2 leading-tight">
        Up to {MAX_ROOM_PHOTOS} photos. Tag with the room name or a space (Bedroom, Balcony, etc.).
      </p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) addFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {photos.map((photo, index) => (
          <div
            key={photo.id}
            className="rounded-lg border border-gray-200 bg-gray-50/60 p-2 space-y-1.5"
          >
            <div className="relative aspect-[4/3] rounded-md overflow-hidden border bg-gray-100">
              <Image src={photo.preview} alt="" fill className="object-cover" unoptimized />
              {index === 0 ? (
                <span className="absolute top-1 start-1 bg-green-700 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                  Cover
                </span>
              ) : null}
              <button
                type="button"
                onClick={() => removeAt(index)}
                className="absolute top-1 end-1 rounded-full bg-black/55 text-white p-0.5"
                aria-label="Remove photo"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
            <input
              type="text"
              value={photo.tag}
              onChange={(e) => setTag(index, e.target.value)}
              list={`room-photo-tags-${photo.id}`}
              placeholder="Tag"
              className="w-full border border-gray-200 rounded-md px-2 py-1 text-[11px] focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
            />
            <datalist id={`room-photo-tags-${photo.id}`}>
              {photoTags.map((tag) => (
                <option key={tag.id} value={tag.label} />
              ))}
              {roomNameTag ? <option value={roomNameTag} /> : null}
            </datalist>
            <div className="flex flex-wrap gap-1">
              {roomNameTag ? (
                <button
                  type="button"
                  onClick={() => setTag(index, roomNameTag)}
                  className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded-full border",
                    photo.tag === roomNameTag
                      ? "bg-green-700 text-white border-green-700"
                      : "bg-white text-gray-600 border-gray-200"
                  )}
                >
                  {roomNameTag}
                </button>
              ) : null}
              {chipTags.slice(0, 4).map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => setTag(index, tag.label)}
                  className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded-full border",
                    photo.tag === tag.label
                      ? "bg-green-700 text-white border-green-700"
                      : "bg-white text-gray-600 border-gray-200"
                  )}
                >
                  {tag.label}
                </button>
              ))}
            </div>
          </div>
        ))}
        {photos.length < MAX_ROOM_PHOTOS ? (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="aspect-[4/3] rounded-lg border-2 border-dashed border-gray-200 hover:border-green-400 hover:bg-green-50/40 flex flex-col items-center justify-center gap-1 text-gray-500"
          >
            <ImagePlus className="w-5 h-5" />
            <span className="text-[10px] font-medium">Add photo</span>
          </button>
        ) : null}
      </div>
    </div>
  );
}

function DraftRoomCard({
  room,
  index,
  currency,
  currencySymbol,
  onPatch,
  onRemove,
  canRemove,
}: {
  room: DraftListingRoom;
  index: number;
  currency: string;
  currencySymbol?: string;
  onPatch: (partial: Partial<DraftListingRoom>) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3 space-y-3 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
          Room {index + 1}
        </p>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Remove
          </button>
        )}
      </div>

      <label className="block">
        <span className="block text-xs font-medium text-gray-600 mb-1">Room name</span>
        <input
          value={room.name}
          onChange={(e) => onPatch({ name: e.target.value })}
          placeholder="Garden cottage"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </label>

      <label className="block">
        <span className="block text-xs font-medium text-gray-600 mb-1">Room description</span>
        <textarea
          value={room.description}
          onChange={(e) => onPatch({ description: e.target.value })}
          rows={4}
          placeholder="What makes this room unique?"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-y min-h-[96px]"
        />
      </label>

      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="block text-xs font-medium text-gray-600 mb-1">Nightly rate</span>
          <div className="flex items-stretch">
            <div className="inline-flex items-center gap-1 rounded-s-lg border border-gray-200 border-e-0 bg-gray-50 px-2 text-[11px] text-gray-700 shrink-0">
              <span className="font-semibold">{currency}</span>
              {currencySymbol ? <span className="text-gray-400">{currencySymbol}</span> : null}
            </div>
            <input
              type="number"
              min={0}
              value={room.price}
              onChange={(e) => onPatch({ price: e.target.value })}
              placeholder="0"
              className="w-full min-w-0 border border-gray-200 rounded-e-lg rounded-s-none px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="block text-xs font-medium text-gray-600 mb-1">Beds</span>
            <input
              type="number"
              min={1}
              value={room.beds}
              onChange={(e) => onPatch({ beds: Math.max(1, Number(e.target.value) || 1) })}
              className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </label>
          <label className="block">
            <span className="block text-xs font-medium text-gray-600 mb-1">Baths</span>
            <input
              type="number"
              min={1}
              value={room.baths}
              onChange={(e) => onPatch({ baths: Math.max(1, Number(e.target.value) || 1) })}
              className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </label>
        </div>
      </div>

      <div>
        <p className="text-[10px] text-gray-500 mb-1 leading-tight">
          Total guests = adults + children. Set the split (e.g. 6 adults + 4 children = 10). Infants
          are separate.
        </p>
        <div className="grid grid-cols-4 gap-1.5 items-end">
          <label className="block min-w-0">
            <span className="block text-[10px] font-medium text-gray-500 mb-0.5 leading-tight truncate">
              Total guests
            </span>
            <input
              type="number"
              min={1}
              value={room.maxGuests}
              onChange={(e) =>
                onPatch(
                  clampDraftRoomGuests(room, {
                    maxGuests: Math.max(1, Number(e.target.value) || 1),
                  })
                )
              }
              className="w-full h-7 border border-gray-200 rounded-md px-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </label>
          {(
            [
              { key: "maxAdults" as const, label: "Adults", min: 1 },
              { key: "maxChildren" as const, label: "Children", min: 0 },
              { key: "maxInfants" as const, label: "Infants", min: 0 },
            ] as const
          ).map((field) => (
            <label key={field.key} className="block min-w-0">
              <span className="block text-[10px] font-medium text-gray-500 mb-0.5 leading-tight truncate">
                {field.label}
              </span>
              <input
                type="number"
                min={field.min}
                max={field.key === "maxChildren" ? room.maxGuests - 1 : room.maxGuests}
                value={room[field.key]}
                onChange={(e) =>
                  onPatch(
                    clampDraftRoomGuests(room, {
                      [field.key]: Math.max(field.min, Number(e.target.value) || field.min),
                    })
                  )
                }
                className="w-full h-7 border border-gray-200 rounded-md px-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </label>
          ))}
        </div>
      </div>

      <DraftRoomPhotosEditor
        roomName={room.name}
        photos={room.photos}
        onChange={(photos) => onPatch({ photos })}
      />
    </div>
  );
}
