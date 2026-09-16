"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle,
  Loader2,
  Sparkles,
  TrendingUp,
  Zap,
} from "lucide-react";
import { HostDashboardShell } from "@/components/dashboard/host-dashboard-shell";
import { useAuth } from "@/components/providers/auth-provider";
import {
  resolveHostId,
  resolveHostName,
  useHostSubmissions,
} from "@/lib/listings/use-listing-submissions";
import { useHostPromotions } from "@/lib/host/use-host-promotions";
import {
  formatPromoEnds,
  isPromoNearingEnd,
  promoExpiryLabel,
} from "@/lib/host/host-promotions-data";
import { useHostPromotionsSettings } from "@/lib/admin/use-host-promotions-settings";
import type {
  ListingPromotionDurationDays,
  ListingPromotionKind,
} from "@/lib/host/host-promotions-types";
import { isDirectoryListing } from "@/lib/booking/is-directory-listing";
import { isEventsSubscriptionActive } from "@/lib/host/events-subscription";
import { useEventsSubscriptionSettings } from "@/lib/host/use-events-subscription-settings";
import { useHostPublicProfile } from "@/lib/host/use-host-public-profile";
import { cn, formatAmount } from "@/lib/utils";

export function HostPromoteContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const hostId = resolveHostId(user);
  const hostName = resolveHostName(user);
  const submissions = useHostSubmissions(hostId, hostName);
  const { data: hostProfile } = useHostPublicProfile(hostId ?? undefined, hostName);
  const { freeDuringLaunch: eventsFree } = useEventsSubscriptionSettings();
  /** Free launch phase counts as entitled — boosts are sold separately. */
  const eventsSubActive =
    eventsFree || isEventsSubscriptionActive(hostProfile?.eventsSubscriptionExpiresAt);
  const { ready: settingsReady, settings: promoSettings } = useHostPromotionsSettings();

  const listingOptions = useMemo(() => {
    const approved = submissions.filter((l) => l.status === "approved");
    if (approved.length > 0) {
      return approved.map((l) => ({ id: l.id, title: l.title }));
    }
    return submissions.map((l) => ({ id: l.id, title: l.title }));
  }, [submissions]);

  const [listingId, setListingId] = useState(listingOptions[0]?.id ?? "");
  const [kind, setKind] = useState<ListingPromotionKind>("trending");
  const [duration, setDuration] = useState<ListingPromotionDurationDays>(7);
  const [paying, setPaying] = useState(false);
  const [message, setMessage] = useState("");
  const confirmedKey = useRef("");

  useEffect(() => {
    if (!listingOptions.some((l) => l.id === listingId) && listingOptions[0]) {
      setListingId(listingOptions[0].id);
    }
  }, [listingId, listingOptions]);

  const {
    ready,
    promotions,
    activeTrending,
    activeFeatured,
    purchase,
    confirmPayment,
  } = useHostPromotions(listingId || undefined);

  function flash(text: string) {
    setMessage(text);
    setTimeout(() => setMessage(""), 4000);
  }

  useEffect(() => {
    if (searchParams.get("canceled") === "1") {
      if (confirmedKey.current === "canceled") return;
      confirmedKey.current = "canceled";
      flash("Payment canceled. Your listing was not promoted.");
      return;
    }
    const promoId = searchParams.get("promoId");
    const sessionId = searchParams.get("session_id");
    if (!promoId || !sessionId) return;
    const key = `${promoId}:${sessionId}`;
    if (confirmedKey.current === key) return;
    confirmedKey.current = key;
    void confirmPayment(promoId, sessionId).then((promo) => {
      if (promo) {
        flash(
          `${promo.kind === "trending" ? "Trending" : "Featured"} is live until ${formatPromoEnds(promo.endsAt)}.`
        );
      }
    });
  }, [searchParams, confirmPayment]);

  const packages = useMemo(() => {
    if (!promoSettings?.promotionsEnabled) return [];
    return promoSettings.packages.filter((p) => p.enabled && p.kind === kind);
  }, [promoSettings, kind]);

  const selectedPkg =
    packages.find((p) => p.durationDays === duration) ?? packages[0];

  useEffect(() => {
    if (packages.length > 0 && !packages.some((p) => p.durationDays === duration)) {
      setDuration(packages[0].durationDays);
    }
  }, [packages, duration]);

  const selectedListingRow = submissions.find((l) => l.id === listingId);
  const selectedIsDirectory = isDirectoryListing({
    parentCategory: selectedListingRow?.parentCategory,
    type: selectedListingRow?.type,
    category: selectedListingRow?.category,
  });

  async function handlePay() {
    if (!listingId || !hostId || !selectedPkg) return;
    if (selectedIsDirectory && !eventsSubActive) {
      flash("Directory listings need an active yearly subscription before you can buy Featured or Trending.");
      return;
    }
    setPaying(true);
    const saved = await purchase({
      listingId,
      hostId,
      kind: selectedPkg.kind,
      durationDays: selectedPkg.durationDays,
      listingTitle: listingOptions.find((l) => l.id === listingId)?.title,
    });
    setPaying(false);
    if (!saved) {
      flash("Payment failed. Please try again.");
      return;
    }
    if (saved.checkoutUrl) {
      window.location.href = saved.checkoutUrl;
      return;
    }
    const promo = saved.promotion;
    flash(
      `Paid AED ${formatAmount(promo.priceAed)} — ${
        promo.kind === "trending" ? "Trending" : "Featured"
      } is live until ${formatPromoEnds(promo.endsAt)}.`
    );
  }

  if (!ready || !settingsReady || !promoSettings) {
    return (
      <HostDashboardShell>
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-green-600" />
        </div>
      </HostDashboardShell>
    );
  }

  return (
    <HostDashboardShell>
      <div className="space-y-6 max-w-3xl">
        <div>
          <h2 className="text-xl font-bold text-gray-900 font-display">
            {promoSettings.pageTitle}
          </h2>
          <p className="text-gray-500 text-sm mt-1">{promoSettings.pageSubtitle}</p>
        </div>

        {selectedIsDirectory && (
          <div
            className={`text-sm rounded-xl px-4 py-3 border ${
              eventsSubActive
                ? "bg-green-50 border-green-200 text-green-900"
                : "bg-amber-50 border-amber-200 text-amber-950"
            }`}
          >
            {eventsFree
              ? "Event listings are free during launch and already visible to guests. You can buy Featured or Trending to stand out — boosts never take a cut of the venue booking."
              : eventsSubActive
                ? "This Events listing can buy Featured or Trending like other listings. Boosts never take a cut of the venue booking."
                : "This Events listing is hidden from guests until your yearly Events subscription is active. Ask admin to record payment, then you can buy Featured or Trending."}
          </div>
        )}

        {message && (
          <div className="bg-green-50 border border-green-200 text-green-800 text-sm rounded-xl px-4 py-3 flex items-start gap-2">
            <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
            {message}
          </div>
        )}

        {!promoSettings.promotionsEnabled ? (
          <div className="bg-amber-50 border border-amber-100 text-amber-900 text-sm rounded-xl px-4 py-3">
            Paid promotions are temporarily unavailable. Check back later or contact support.
          </div>
        ) : listingOptions.length === 0 ? (
          <div className="bg-white rounded-2xl border p-6 text-sm text-gray-500">
            You need an approved listing before you can buy promotions.
          </div>
        ) : (
          <>
            <section className="bg-white rounded-2xl border p-5 space-y-4">
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5 block">
                  Listing
                </span>
                <select
                  value={listingId}
                  onChange={(e) => setListingId(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  {listingOptions.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.title}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div
                  className={cn(
                    "rounded-xl border p-3 text-sm",
                    activeTrending &&
                      isPromoNearingEnd(activeTrending.endsAt, activeTrending.status)
                      ? "border-red-300 bg-red-50"
                      : activeTrending
                        ? "border-amber-200 bg-amber-50/60"
                        : "border-gray-100 bg-gray-50/50"
                  )}
                >
                  <div className="flex items-center gap-1.5 font-semibold text-gray-900">
                    <TrendingUp className="w-4 h-4 text-amber-500" />
                    Trending
                  </div>
                  {activeTrending ? (
                    <>
                      <p className="text-xs text-red-700 mt-1 font-medium">
                        Ends {formatPromoEnds(activeTrending.endsAt)}
                      </p>
                      {isPromoNearingEnd(activeTrending.endsAt, activeTrending.status) && (
                        <p className="text-xs text-red-800 font-medium mt-1.5 flex items-start gap-1">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          {promoExpiryLabel(activeTrending.endsAt)} — renew to keep Trending.
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-xs text-gray-500 mt-1">Not active</p>
                  )}
                </div>
                <div
                  className={cn(
                    "rounded-xl border p-3 text-sm",
                    activeFeatured &&
                      isPromoNearingEnd(activeFeatured.endsAt, activeFeatured.status)
                      ? "border-red-300 bg-red-50"
                      : activeFeatured
                        ? "border-green-200 bg-green-50/60"
                        : "border-gray-100 bg-gray-50/50"
                  )}
                >
                  <div className="flex items-center gap-1.5 font-semibold text-gray-900">
                    <Sparkles className="w-4 h-4 text-green-600" />
                    Featured
                  </div>
                  {activeFeatured ? (
                    <>
                      <p className="text-xs text-red-700 mt-1 font-medium">
                        Ends {formatPromoEnds(activeFeatured.endsAt)}
                      </p>
                      {isPromoNearingEnd(activeFeatured.endsAt, activeFeatured.status) && (
                        <p className="text-xs text-red-800 font-medium mt-1.5 flex items-start gap-1">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          {promoExpiryLabel(activeFeatured.endsAt)} — renew to stay Featured.
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-xs text-gray-500 mt-1">Not active</p>
                  )}
                </div>
              </div>
            </section>

            <section className="bg-white rounded-2xl border p-5 space-y-4">
              <h3 className="text-sm font-semibold text-gray-900">Choose placement</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setKind("trending");
                    setDuration(7);
                  }}
                  className={cn(
                    "text-start rounded-xl border p-4 transition-colors",
                    kind === "trending"
                      ? "border-amber-400 bg-amber-50 ring-2 ring-amber-200"
                      : "border-gray-200 hover:border-amber-300"
                  )}
                >
                  <TrendingUp className="w-5 h-5 text-amber-500 mb-2" />
                  <p className="font-semibold text-gray-900 text-sm">Trending Farm Stays</p>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                    Show on the homepage Trending section near guests. Paid placement.
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setKind("featured");
                    setDuration(7);
                  }}
                  className={cn(
                    "text-start rounded-xl border p-4 transition-colors",
                    kind === "featured"
                      ? "border-green-500 bg-green-50 ring-2 ring-green-200"
                      : "border-gray-200 hover:border-green-300"
                  )}
                >
                  <Sparkles className="w-5 h-5 text-green-600 mb-2" />
                  <p className="font-semibold text-gray-900 text-sm">Featured listing</p>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                    Featured badge and pinned to the top of search results. Paid placement.
                  </p>
                </button>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
                  Duration
                </p>
                {packages.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    No packages available for this placement. Contact admin.
                  </p>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {packages.map((pkg) => (
                      <button
                        key={pkg.durationDays}
                        type="button"
                        onClick={() => setDuration(pkg.durationDays)}
                        className={cn(
                          "rounded-xl border px-3 py-3 text-center transition-colors",
                          duration === pkg.durationDays
                            ? "border-green-600 bg-green-50"
                            : "border-gray-200 hover:border-gray-300"
                        )}
                      >
                        <div className="text-sm font-bold text-gray-900">
                          {pkg.durationDays} days
                        </div>
                        <div className="text-xs font-semibold text-green-700 mt-0.5">
                          AED {formatAmount(pkg.priceAed)}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {selectedPkg && (
                <div className="rounded-xl border border-gray-100 bg-gray-50/80 px-4 py-3 text-sm space-y-1">
                  <p className="font-semibold text-gray-900">{selectedPkg.label}</p>
                  <p className="text-xs text-gray-500">{selectedPkg.description}</p>
                  {kind === "trending" && activeTrending && (
                    <p className="text-xs text-amber-800 pt-1">
                      Buying again extends your current Trending run.
                    </p>
                  )}
                  {kind === "featured" && activeFeatured && (
                    <p className="text-xs text-green-800 pt-1">
                      Buying again extends your current Featured run.
                    </p>
                  )}
                </div>
              )}

              <button
                type="button"
                disabled={paying || !selectedPkg}
                onClick={() => void handlePay()}
                className="w-full inline-flex items-center justify-center gap-2 bg-green-700 hover:bg-green-800 disabled:opacity-60 text-white font-bold py-3 rounded-xl text-sm transition-colors"
              >
                {paying ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Processing payment…
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    Pay AED {formatAmount(selectedPkg?.priceAed ?? 0)} &amp; go live
                  </>
                )}
              </button>
              <p className="text-[11px] text-gray-400 text-center">
                Demo checkout — no real charge. In production this connects to your payment
                gateway.
              </p>
            </section>

            {promotions.length > 0 && (
              <section className="bg-white rounded-2xl border p-5 space-y-3">
                <h3 className="text-sm font-semibold text-gray-900">Purchase history</h3>
                <ul className="space-y-2">
                  {[...promotions]
                    .sort(
                      (a, b) =>
                        new Date(b.purchasedAt).getTime() -
                        new Date(a.purchasedAt).getTime()
                    )
                    .slice(0, 8)
                    .map((p) => {
                      const nearingEnd = isPromoNearingEnd(p.endsAt, p.status);
                      return (
                        <li
                          key={p.id}
                          className={cn(
                            "rounded-xl px-3 py-3 text-sm border space-y-2",
                            nearingEnd
                              ? "border-red-300 bg-red-50/70"
                              : "border-gray-100 bg-white"
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-medium text-gray-900 truncate">
                                {p.kind === "trending" ? "Trending" : "Featured"} ·{" "}
                                {p.durationDays} days
                              </p>
                              <p className="text-xs text-gray-500 mt-0.5">{p.paymentRef}</p>
                            </div>
                            <div className="text-end shrink-0">
                              <p className="font-semibold text-gray-800">
                                AED {formatAmount(p.priceAed)}
                              </p>
                              <p
                                className={cn(
                                  "text-[10px] font-bold uppercase",
                                  p.status === "active"
                                    ? nearingEnd
                                      ? "text-red-700"
                                      : "text-green-600"
                                    : "text-gray-400"
                                )}
                              >
                                {p.status}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                            <span className="font-medium text-red-700">
                              Ending date:{" "}
                              <span className="text-red-800 font-semibold">
                                {formatPromoEnds(p.endsAt)}
                              </span>
                            </span>
                            {p.status === "active" && (
                              <span
                                className={cn(
                                  "font-semibold",
                                  nearingEnd ? "text-red-700" : "text-red-600"
                                )}
                              >
                                {promoExpiryLabel(p.endsAt)}
                              </span>
                            )}
                          </div>
                          {nearingEnd && (
                            <p className="text-xs text-red-900 font-medium flex items-start gap-1.5 rounded-lg bg-red-50 border border-red-200 px-2.5 py-2">
                              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-red-600" />
                              This placement ends soon. Renew above to keep your listing visible.
                            </p>
                          )}
                        </li>
                      );
                    })}
                </ul>
              </section>
            )}
          </>
        )}
      </div>
    </HostDashboardShell>
  );
}
