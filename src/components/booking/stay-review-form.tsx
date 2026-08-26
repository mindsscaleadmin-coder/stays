"use client";

import { useEffect, useState } from "react";
import { Loader2, Star } from "lucide-react";
import {
  getReviewEligibility,
  getReviewForBooking,
  mergeStayReviews,
  submitStayReview,
} from "@/lib/booking/stay-reviews-data";
import type { ReviewEligibility, StayReview } from "@/lib/booking/stay-reviews-types";
import { looksLikeServerBookingId } from "@/lib/guest/guest-bookings-data";
import { cn } from "@/lib/utils";

export function StayReviewForm({
  bookingId,
  listingId,
  property,
  authorId,
  authorName,
  bookingHint,
  onSubmitted,
}: {
  bookingId: string;
  listingId: string;
  property: string;
  authorId: string;
  authorName: string;
  hostId?: string;
  bookingHint?: {
    status?: string;
    listingId?: string;
    property?: string;
    checkOut?: string;
  };
  onSubmitted?: () => void;
}) {
  const [existing, setExisting] = useState<StayReview | undefined>(() =>
    getReviewForBooking(bookingId)
  );
  const [eligibility, setEligibility] = useState<ReviewEligibility | null>(() =>
    looksLikeServerBookingId(bookingId)
      ? null
      : getReviewEligibility(bookingId, bookingHint)
  );
  const [ready, setReady] = useState(!looksLikeServerBookingId(bookingId));
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(Boolean(getReviewForBooking(bookingId)));
  const [open, setOpen] = useState(false);

  const hintStatus = bookingHint?.status;
  const hintListingId = bookingHint?.listingId;
  const hintProperty = bookingHint?.property;
  const hintCheckOut = bookingHint?.checkOut;

  useEffect(() => {
    let cancelled = false;
    if (!looksLikeServerBookingId(bookingId)) {
      setReady(true);
      return;
    }

    void fetch(`/api/reviews?bookingId=${encodeURIComponent(bookingId)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { review?: StayReview | null; eligibility?: ReviewEligibility | null } | null) => {
        if (cancelled) return;
        if (data?.review) {
          mergeStayReviews([data.review]);
          setExisting(data.review);
          setDone(true);
        }
        if (data?.eligibility) setEligibility(data.eligibility);
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) {
          setEligibility(
            getReviewEligibility(bookingId, {
              status: hintStatus,
              listingId: hintListingId,
              property: hintProperty,
              checkOut: hintCheckOut,
            })
          );
          setReady(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [bookingId, hintStatus, hintListingId, hintProperty, hintCheckOut]);

  if (!ready) {
    return (
      <div className="flex items-center gap-2 text-xs text-gray-500 py-2">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        Checking if this stay can be reviewed…
      </div>
    );
  }

  if (done || existing) {
    return (
      <div className="rounded-xl border border-green-100 bg-green-50 px-4 py-3 text-sm text-green-800">
        Thanks — your review for this stay is in.
        {existing && (
          <span className="block text-xs text-green-700 mt-1">
            {existing.rating}/5 · “{existing.comment.slice(0, 80)}
            {existing.comment.length > 80 ? "…" : ""}”
          </span>
        )}
      </div>
    );
  }

  if (!eligibility?.eligible) return null;

  function pickRating(n: number) {
    setRating(n);
    setOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          listingId: listingId || eligibility!.listingId,
          authorId,
          authorName,
          rating,
          comment,
        }),
      });
      const payload = (await res.json().catch(() => ({}))) as {
        error?: string;
        review?: StayReview;
      };

      if (res.ok && payload.review) {
        mergeStayReviews([payload.review]);
        setExisting(payload.review);
        setDone(true);
        onSubmitted?.();
        return;
      }

      if (!looksLikeServerBookingId(bookingId)) {
        const review = submitStayReview({
          bookingId,
          listingId: listingId || eligibility!.listingId,
          authorId,
          authorName,
          property: property || eligibility!.property,
          rating,
          comment,
          hint: bookingHint,
        });
        setExisting(review);
        setDone(true);
        onSubmitted?.();
        return;
      }

      throw new Error(payload.error || "Could not submit review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit review");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-gray-200 bg-white p-4 space-y-3"
    >
      <div>
        <h4 className="text-sm font-semibold text-gray-900">How was your stay?</h4>
        <p className="text-[11px] text-gray-500 mt-0.5">{property}</p>
      </div>

      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => pickRating(n)}
            className="p-0.5"
            aria-label={`${n} stars`}
          >
            <Star
              className={cn(
                "w-6 h-6",
                open && n <= rating ? "text-amber-400 fill-amber-400" : "text-gray-300"
              )}
            />
          </button>
        ))}
        {open && <span className="text-xs text-gray-500 ms-2">{rating}/5</span>}
      </div>

      {open && (
        <>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            required
            minLength={10}
            placeholder="What stood out? (min 10 characters)"
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-500"
          />

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-2 py-1.5">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy || comment.trim().length < 10}
            className="inline-flex items-center gap-2 bg-green-700 hover:bg-green-800 disabled:bg-gray-300 text-white text-sm font-semibold px-4 py-2 rounded-xl"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Submit review
          </button>
        </>
      )}
    </form>
  );
}
