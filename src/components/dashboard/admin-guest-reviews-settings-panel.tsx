"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Plus,
  RotateCcw,
  Star,
  Trash2,
} from "lucide-react";
import { useListingSettings } from "@/components/providers/listing-settings-provider";

export function AdminGuestReviewsSettingsPanel() {
  const {
    settings,
    addRatingCategory,
    updateRatingCategory,
    removeRatingCategory,
    reorderRatingCategory,
    resetRatingCategories,
    addGuestReview,
    updateGuestReview,
    removeGuestReview,
    reorderGuestReview,
    resetGuestReviews,
  } = useListingSettings();

  const [message, setMessage] = useState("");
  const [newCatLabel, setNewCatLabel] = useState("");
  const [newCatScore, setNewCatScore] = useState("4.8");
  const [newReview, setNewReview] = useState({
    name: "",
    location: "",
    rating: "5",
    text: "",
    avatar: "",
    date: "",
    helpful: "0",
  });

  function flash(text: string) {
    setMessage(text);
    setTimeout(() => setMessage(""), 2500);
  }

  function initialsFromName(name: string) {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }

  function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    const label = newCatLabel.trim();
    if (!label) return;
    const score = Math.min(5, Math.max(0, Number(newCatScore) || 0));
    addRatingCategory({
      label,
      score,
      enabled: true,
    });
    setNewCatLabel("");
    setNewCatScore("4.8");
    flash("Rating category added.");
  }

  function handleAddReview(e: React.FormEvent) {
    e.preventDefault();
    const name = newReview.name.trim();
    const text = newReview.text.trim();
    if (!name || !text) return;
    addGuestReview({
      name,
      location: newReview.location.trim() || "UAE",
      rating: Math.min(5, Math.max(1, Number(newReview.rating) || 5)),
      text,
      avatar: newReview.avatar.trim() || initialsFromName(name),
      date: newReview.date.trim() || new Date().toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
      helpful: Math.max(0, Number(newReview.helpful) || 0),
      enabled: true,
    });
    setNewReview({
      name: "",
      location: "",
      rating: "5",
      text: "",
      avatar: "",
      date: "",
      helpful: "0",
    });
    flash("Guest review added.");
  }

  return (
    <section className="bg-white rounded-2xl border shadow-sm p-5 space-y-6">
      {message && (
        <div className="bg-green-50 border border-green-200 text-green-800 text-sm rounded-xl px-4 py-3">
          {message}
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h4 className="font-display text-sm font-semibold text-gray-900 flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-500" />
            Rating breakdown
          </h4>
          <button
            type="button"
            onClick={() => {
              resetRatingCategories();
              flash("Restored default rating categories.");
            }}
            className="inline-flex items-center gap-1.5 text-xs border border-gray-200 hover:border-gray-300 text-gray-600 px-3 py-1.5 rounded-lg font-medium"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
        </div>

        <div className="space-y-2">
          {settings.ratingCategories.map((item, index) => (
            <div
              key={item.id}
              className="flex flex-col sm:flex-row sm:items-center gap-3 border border-gray-100 rounded-xl p-3 bg-gray-50/50"
            >
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() => reorderRatingCategory(item.id, "up")}
                  className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-500 hover:text-gray-800 disabled:opacity-30"
                  aria-label="Move up"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  disabled={index === settings.ratingCategories.length - 1}
                  onClick={() => reorderRatingCategory(item.id, "down")}
                  className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-500 hover:text-gray-800 disabled:opacity-30"
                  aria-label="Move down"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2 min-w-0">
                <input
                  value={item.label}
                  onChange={(e) => updateRatingCategory(item.id, { label: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Category (English)"
                />
                <input
                  type="number"
                  min={0}
                  max={5}
                  step={0.1}
                  value={item.score}
                  onChange={(e) =>
                    updateRatingCategory(item.id, {
                      score: Math.min(5, Math.max(0, Number(e.target.value) || 0)),
                    })
                  }
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <label className="inline-flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={item.enabled}
                    onChange={(e) =>
                      updateRatingCategory(item.id, { enabled: e.target.checked })
                    }
                    className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                  Enabled
                </label>
                <button
                  type="button"
                  onClick={() => {
                    removeRatingCategory(item.id);
                    flash("Rating category removed.");
                  }}
                  className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"
                  aria-label="Remove category"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={handleAddCategory} className="border-t pt-4 space-y-3">
          <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
            Add rating category
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              value={newCatLabel}
              onChange={(e) => setNewCatLabel(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="e.g. Cleanliness"
              required
            />
            <input
              type="number"
              min={0}
              max={5}
              step={0.1}
              value={newCatScore}
              onChange={(e) => setNewCatScore(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 bg-green-700 hover:bg-green-800 text-white text-sm font-semibold px-4 py-2 rounded-lg"
          >
            <Plus className="w-4 h-4" />
            Add category
          </button>
        </form>
      </div>

      <div className="space-y-3 border-t pt-5">
        <div className="flex items-center justify-between gap-3">
          <h4 className="font-display text-sm font-semibold text-gray-900">Sample guest reviews</h4>
          <button
            type="button"
            onClick={() => {
              resetGuestReviews();
              flash("Restored default guest reviews.");
            }}
            className="inline-flex items-center gap-1.5 text-xs border border-gray-200 hover:border-gray-300 text-gray-600 px-3 py-1.5 rounded-lg font-medium"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
        </div>

        <div className="space-y-3">
          {settings.guestReviews.map((item, index) => (
            <div
              key={item.id}
              className="border border-gray-100 rounded-xl p-4 bg-gray-50/50 space-y-3"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => reorderGuestReview(item.id, "up")}
                    className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-500 hover:text-gray-800 disabled:opacity-30"
                    aria-label="Move up"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    disabled={index === settings.guestReviews.length - 1}
                    onClick={() => reorderGuestReview(item.id, "down")}
                    className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-500 hover:text-gray-800 disabled:opacity-30"
                    aria-label="Move down"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  <div className="w-9 h-9 rounded-full bg-green-600 text-white text-xs font-bold flex items-center justify-center">
                    {item.avatar}
                  </div>
                  <span className="text-sm font-semibold text-gray-900">{item.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <label className="inline-flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={item.enabled}
                      onChange={(e) =>
                        updateGuestReview(item.id, { enabled: e.target.checked })
                      }
                      className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                    />
                    Enabled
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      removeGuestReview(item.id);
                      flash("Guest review removed.");
                    }}
                    className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"
                    aria-label="Remove review"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                <input
                  value={item.name}
                  onChange={(e) => updateGuestReview(item.id, { name: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
                  placeholder="Guest name"
                />
                <input
                  value={item.location}
                  onChange={(e) => updateGuestReview(item.id, { location: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
                  placeholder="Location"
                />
                <input
                  value={item.date}
                  onChange={(e) => updateGuestReview(item.id, { date: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
                  placeholder="Date"
                />
                <input
                  value={item.avatar}
                  onChange={(e) => updateGuestReview(item.id, { avatar: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
                  placeholder="Avatar initials"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="number"
                  min={1}
                  max={5}
                  step={1}
                  value={item.rating}
                  onChange={(e) =>
                    updateGuestReview(item.id, {
                      rating: Math.min(5, Math.max(1, Number(e.target.value) || 1)),
                    })
                  }
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
                />
                <input
                  type="number"
                  min={0}
                  value={item.helpful}
                  onChange={(e) =>
                    updateGuestReview(item.id, {
                      helpful: Math.max(0, Number(e.target.value) || 0),
                    })
                  }
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
                  placeholder="Helpful count"
                />
              </div>

              <textarea
                value={item.text}
                onChange={(e) => updateGuestReview(item.id, { text: e.target.value })}
                rows={3}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white resize-none"
                placeholder="Review text"
              />
            </div>
          ))}
        </div>

        <form onSubmit={handleAddReview} className="border-t pt-4 space-y-3">
          <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
            Add guest review
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <input
              value={newReview.name}
              onChange={(e) => setNewReview((p) => ({ ...p, name: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Guest name"
              required
            />
            <input
              value={newReview.location}
              onChange={(e) => setNewReview((p) => ({ ...p, location: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Location"
            />
            <input
              value={newReview.date}
              onChange={(e) => setNewReview((p) => ({ ...p, date: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="e.g. 15 Jan 2025"
            />
            <input
              value={newReview.avatar}
              onChange={(e) => setNewReview((p) => ({ ...p, avatar: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Avatar initials (auto)"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="number"
              min={1}
              max={5}
              value={newReview.rating}
              onChange={(e) => setNewReview((p) => ({ ...p, rating: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <input
              type="number"
              min={0}
              value={newReview.helpful}
              onChange={(e) => setNewReview((p) => ({ ...p, helpful: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Helpful count"
            />
          </div>
          <textarea
            value={newReview.text}
            onChange={(e) => setNewReview((p) => ({ ...p, text: e.target.value }))}
            rows={3}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
            placeholder="Review text"
            required
          />
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 bg-green-700 hover:bg-green-800 text-white text-sm font-semibold px-4 py-2 rounded-lg"
          >
            <Plus className="w-4 h-4" />
            Add review
          </button>
        </form>
      </div>
    </section>
  );
}
