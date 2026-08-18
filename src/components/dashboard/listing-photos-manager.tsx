"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  ArrowDown,
  ArrowUp,
  ImagePlus,
  Star,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { usePhotoTagsCatalog } from "@/lib/admin/use-photo-tags-catalog";
import { cn } from "@/lib/utils";

export interface ManagedListingPhoto {
  id: string;
  /** Object URL or persisted data URL */
  src: string;
  file?: File;
  tag: string;
  /** True when photo is already saved on the listing */
  persisted: boolean;
}

interface ListingPhotosManagerProps {
  open: boolean;
  onClose: () => void;
  photos: ManagedListingPhoto[];
  maxPhotos: number;
  onChange: (photos: ManagedListingPhoto[]) => void;
}

export function ListingPhotosManager({
  open,
  onClose,
  photos,
  maxPhotos,
  onChange,
}: ListingPhotosManagerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const { enabledItems: photoTags } = usePhotoTagsCatalog();
  /** Chips for quick-pick — hide generic "Other" from the chip row */
  const chipTags = photoTags.filter((t) => t.value !== "other");

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  function addFiles(files: FileList | File[]) {
    const incoming = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (!incoming.length) return;
    const remaining = maxPhotos - photos.length;
    const next = incoming.slice(0, Math.max(0, remaining)).map((file) => ({
      id: `new-${file.name}-${file.lastModified}-${Math.random()}`,
      src: URL.createObjectURL(file),
      file,
      tag: "",
      persisted: false,
    }));
    onChange([...photos, ...next]);
  }

  function removeAt(index: number) {
    const target = photos[index];
    if (target && !target.persisted && target.src.startsWith("blob:")) {
      URL.revokeObjectURL(target.src);
    }
    onChange(photos.filter((_, i) => i !== index));
  }

  function move(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= photos.length) return;
    const copy = [...photos];
    [copy[index], copy[nextIndex]] = [copy[nextIndex], copy[index]];
    onChange(copy);
  }

  function setCover(index: number) {
    if (index === 0) return;
    const copy = [...photos];
    const [item] = copy.splice(index, 1);
    copy.unshift(item);
    onChange(copy);
  }

  function setTag(index: number, tag: string) {
    onChange(photos.map((p, i) => (i === index ? { ...p, tag } : p)));
  }

  function onDragStart(index: number) {
    setDragIndex(index);
  }

  function onDragOverItem(e: React.DragEvent, index: number) {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    const copy = [...photos];
    const [item] = copy.splice(dragIndex, 1);
    copy.splice(index, 0, item);
    setDragIndex(index);
    onChange(copy);
  }

  function onDragEnd() {
    setDragIndex(null);
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label="Close photo manager"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="photo-manager-title"
        className="relative bg-white w-full sm:max-w-3xl sm:rounded-2xl shadow-2xl max-h-[92vh] flex flex-col rounded-t-2xl"
      >
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b shrink-0">
          <div>
            <h2 id="photo-manager-title" className="font-bold text-gray-900 font-display">
              Manage photos
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Upload more, set a cover, rearrange, then name each photo (Kitchen, Balcony,
              etc.) — {photos.length}/{maxPhotos}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-4">
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
            onClick={() => photos.length < maxPhotos && inputRef.current?.click()}
            className={cn(
              "border-2 border-dashed rounded-xl p-5 text-center transition-colors cursor-pointer",
              dragOver
                ? "border-green-500 bg-green-50"
                : "border-gray-200 hover:border-green-400 hover:bg-gray-50",
              photos.length >= maxPhotos && "opacity-50 pointer-events-none"
            )}
          >
            <Upload className="w-7 h-7 text-gray-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-700">Upload more photos</p>
            <p className="text-xs text-gray-400 mt-1">
              PNG, JPG, WEBP — drag photos here or click to browse
            </p>
          </div>

          {photos.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">
              No photos yet. Upload at least one image to continue.
            </p>
          ) : (
            <ul className="space-y-3">
              {photos.map((photo, index) => (
                <li
                  key={photo.id}
                  draggable
                  onDragStart={() => onDragStart(index)}
                  onDragOver={(e) => onDragOverItem(e, index)}
                  onDragEnd={onDragEnd}
                  className={cn(
                    "flex flex-col sm:flex-row gap-3 p-3 rounded-xl border bg-white",
                    dragIndex === index && "opacity-70 ring-2 ring-green-400",
                    index === 0 && "border-green-300 bg-green-50/40"
                  )}
                >
                  <div className="relative w-full sm:w-36 aspect-[4/3] rounded-lg overflow-hidden bg-gray-100 shrink-0 cursor-grab active:cursor-grabbing">
                    <Image
                      src={photo.src}
                      alt={`Photo ${index + 1}`}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                    {index === 0 && (
                      <span className="absolute top-2 start-2 bg-green-700 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                        Cover
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0 flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-gray-800">
                        Photo {index + 1}
                        {index === 0 ? (
                          <span className="ms-2 text-xs font-medium text-green-700">
                            (cover photo)
                          </span>
                        ) : null}
                      </p>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => move(index, -1)}
                          className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:text-gray-800 disabled:opacity-30"
                          aria-label="Move up"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          disabled={index === photos.length - 1}
                          onClick={() => move(index, 1)}
                          className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:text-gray-800 disabled:opacity-30"
                          aria-label="Move down"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <label className="block">
                      <span className="block text-[10px] font-semibold uppercase tracking-wide text-gray-500 mb-1">
                        Photo name / tag
                      </span>
                      <input
                        type="text"
                        value={photo.tag}
                        onChange={(e) => setTag(index, e.target.value)}
                        list={`photo-tag-suggestions-${photo.id}`}
                        placeholder="e.g. Kitchen, Master bedroom, River view"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                      />
                      <datalist id={`photo-tag-suggestions-${photo.id}`}>
                        {photoTags.map((tag) => (
                          <option key={tag.id} value={tag.label} />
                        ))}
                      </datalist>
                    </label>

                    {chipTags.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {chipTags.map((tag) => {
                          const active =
                            photo.tag === tag.label ||
                            photo.tag.toLowerCase() === tag.label.toLowerCase() ||
                            photo.tag === tag.value;
                          return (
                            <button
                              key={tag.id}
                              type="button"
                              onClick={() => setTag(index, tag.label)}
                              className={cn(
                                "text-[11px] px-2 py-1 rounded-full border transition-colors",
                                active
                                  ? "bg-green-700 text-white border-green-700"
                                  : "bg-white text-gray-600 border-gray-200 hover:border-green-400 hover:text-green-700"
                              )}
                            >
                              {tag.label}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1.5">
                        No photo tags configured. An admin can add them under Settings → Photo
                        tags.
                      </p>
                    )}

                    <div className="flex flex-wrap gap-2 mt-auto pt-1">
                      {index !== 0 && (
                        <button
                          type="button"
                          onClick={() => setCover(index)}
                          className="inline-flex items-center gap-1.5 text-xs font-medium border border-green-200 text-green-700 hover:bg-green-50 px-3 py-1.5 rounded-lg"
                        >
                          <Star className="w-3.5 h-3.5" />
                          Set as cover
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => removeAt(index)}
                        className="inline-flex items-center gap-1.5 text-xs font-medium border border-red-200 text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Remove
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {photos.length > 0 && photos.length < maxPhotos && (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 hover:border-green-400 hover:bg-green-50 rounded-xl py-3 text-sm font-medium text-gray-600 transition-colors"
            >
              <ImagePlus className="w-4 h-4" />
              Add more photos
            </button>
          )}
        </div>

        <div className="px-5 py-4 border-t shrink-0 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="bg-green-700 hover:bg-green-800 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
