"use client";

import { useMemo, useState } from "react";
import { BadgeCheck, MessageSquareText, Star } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { StarRating } from "@/components/ui/star-rating";
import type { StayReview } from "@/lib/booking/stay-reviews-types";

const PREVIEW_COUNT = 2;

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "G";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function formatReviewDate(iso: string, locale: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function starDistribution(reviews: StayReview[]) {
  const counts = [0, 0, 0, 0, 0];
  for (const review of reviews) {
    const star = Math.min(5, Math.max(1, Math.round(review.rating)));
    counts[star - 1] += 1;
  }
  return counts;
}

export function ListingReviewsSection({
  reviews,
  ready,
  average,
  count,
}: {
  reviews: StayReview[];
  ready: boolean;
  average: number;
  count: number;
}) {
  const t = useTranslations("listing");
  const locale = useLocale();
  const [expanded, setExpanded] = useState(false);

  const distribution = useMemo(() => starDistribution(reviews), [reviews]);
  const visible = expanded ? reviews : reviews.slice(0, PREVIEW_COUNT);
  const hiddenCount = Math.max(0, reviews.length - PREVIEW_COUNT);

  return (
    <section
      id="section-reviews"
      className="scroll-mt-28 bg-white rounded-2xl border border-gray-200/80 p-5 sm:p-6 mb-5 shadow-sm shadow-gray-100/70"
    >
      <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-green-700/80 mb-1">
            {t("tabs.reviews")}
          </p>
          <h2 className="font-bold text-gray-900 text-lg sm:text-xl font-display tracking-tight">
            {t("reviewsTitle")}
          </h2>
        </div>
        {count > 0 && (
          <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 border border-amber-100 px-3 py-1.5">
            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
            <span className="text-lg font-bold text-gray-900 leading-none">{average.toFixed(1)}</span>
            <span className="text-xs text-gray-500">
              · {count} {count === 1 ? t("reviewSingular") : t("tabs.reviews").toLowerCase()}
            </span>
          </div>
        )}
      </div>

      {!ready ? (
        <div className="animate-pulse grid grid-cols-1 lg:grid-cols-[minmax(0,220px)_1fr] gap-4">
          <div className="h-28 rounded-2xl bg-gray-100" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="h-36 rounded-2xl bg-gray-100" />
            <div className="h-36 rounded-2xl bg-gray-100" />
          </div>
        </div>
      ) : count === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/80 px-5 py-10 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white border border-gray-200 text-gray-400">
            <MessageSquareText className="w-5 h-5" />
          </div>
          <p className="text-sm font-semibold text-gray-900">{t("reviewsEmptyTitle")}</p>
          <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto leading-relaxed">
            {t("reviewsEmptyBody")}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,220px)_1fr] gap-5 lg:gap-6 items-start">
            <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4">
              <div className="text-4xl font-bold text-gray-900 tracking-tight leading-none">
                {average.toFixed(1)}
              </div>
              <StarRating rating={average} size="md" />
              <p className="text-xs text-gray-500 mt-2">{t("reviewsFromGuests", { count })}</p>
              <div className="mt-4 space-y-1.5">
                {[5, 4, 3, 2, 1].map((star) => {
                  const n = distribution[star - 1];
                  const pct = count > 0 ? (n / count) * 100 : 0;
                  return (
                    <div key={star} className="flex items-center gap-2">
                      <span className="w-7 text-[10px] font-medium text-gray-500 tabular-nums">
                        {star}★
                      </span>
                      <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-amber-400"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-4 text-[10px] text-gray-400 tabular-nums text-end">{n}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 min-w-0">
              {visible.map((review) => (
                <article
                  key={review.id}
                  className="flex h-full min-w-0 flex-col rounded-2xl border border-gray-100 bg-gray-50/60 p-4"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-9 h-9 rounded-full bg-green-700 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                      {initials(review.authorName)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-900 text-sm truncate">
                        {review.authorName}
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-gray-500 mt-0.5">
                        <span className="inline-flex items-center gap-0.5 text-green-700 font-medium">
                          <BadgeCheck className="w-3 h-3" />
                          {t("reviewsVerifiedStay")}
                        </span>
                        <span aria-hidden>·</span>
                        <time dateTime={review.createdAt}>
                          {formatReviewDate(review.createdAt, locale)}
                        </time>
                      </div>
                    </div>
                  </div>
                  <StarRating rating={review.rating} />
                  <p className="text-sm text-gray-600 leading-relaxed mt-2.5 line-clamp-4 flex-1">
                    {review.comment}
                  </p>
                </article>
              ))}
            </div>
          </div>

          {hiddenCount > 0 && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="mt-5 w-full border border-gray-200 hover:border-green-400 hover:bg-green-50/50 text-gray-700 hover:text-green-800 text-sm font-semibold py-2.5 rounded-xl transition-colors"
            >
              {expanded ? t("reviewsShowLess") : t("viewAllReviews", { count })}
            </button>
          )}
        </>
      )}
    </section>
  );
}
