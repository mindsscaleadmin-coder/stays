"use client";

import { useEffect } from "react";
import { Power, Zap } from "lucide-react";
import { CountdownTimer } from "@/components/ui/star-rating";
import { useHostPricing } from "@/lib/host/use-host-pricing";
import {
  defaultFlashDealEndsAt,
  flashDealEndsAtToIso,
  flashDealEndsAtToLocalInput,
  isFlashDealActive,
  remainingCountdown,
} from "@/lib/host/flash-deal-utils";

const fieldClass =
  "w-full border border-gray-200/90 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-400/30 focus:border-red-300";

export function HostListingFlashDealBar({ listingId }: { listingId: string }) {
  const { settings, save, ready } = useHostPricing(listingId);

  useEffect(() => {
    if (!ready || !settings?.flashDealEnabled || !settings.flashDealEndsAt) return;
    const ends = new Date(settings.flashDealEndsAt).getTime();
    if (Number.isNaN(ends)) return;
    const timer = setTimeout(() => {
      save({ flashDealEnabled: false }, { immediate: true });
    }, Math.max(0, ends - Date.now()));
    return () => clearTimeout(timer);
  }, [ready, settings?.flashDealEnabled, settings?.flashDealEndsAt, save]);

  if (!ready || !settings) return null;

  const pricing = settings;

  function toggle() {
    const turningOn = !pricing.flashDealEnabled;
    const endsAt = turningOn
      ? flashDealEndsAtToIso(defaultFlashDealEndsAt(48))
      : pricing.flashDealEndsAt;
    save(
      {
        discountsEnabled: turningOn ? true : pricing.discountsEnabled,
        flashDealEnabled: turningOn,
        flashDealEndsAt: endsAt,
        flashDealDiscountPct:
          pricing.flashDealDiscountPct > 0
            ? pricing.flashDealDiscountPct
            : pricing.lastMinuteDiscountPct || 15,
      },
      { immediate: true }
    );
  }

  const live = isFlashDealActive(settings);
  const countdown =
    live && settings.flashDealEndsAt
      ? remainingCountdown(settings.flashDealEndsAt)
      : null;

  return (
    <div className="rounded-xl border border-red-100 bg-red-50/40 p-3 sm:p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2 min-w-0">
          <Zap className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-gray-900">Last flash deal</p>
            <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
              Time-boxed promo on the homepage Flash Deals section. Guests get this discount
              until it ends.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={toggle}
          className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition-colors shrink-0 ${
            settings.flashDealEnabled
              ? "border-green-300 bg-green-50 text-green-800 hover:bg-green-100"
              : "border-gray-200 text-gray-500 hover:bg-gray-50"
          }`}
          aria-pressed={settings.flashDealEnabled}
        >
          <Power
            className={`w-3.5 h-3.5 ${settings.flashDealEnabled ? "text-green-700" : "text-gray-400"}`}
          />
          {settings.flashDealEnabled ? "On" : "Off"}
        </button>
      </div>

      {settings.flashDealEnabled && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs font-medium text-gray-600 mb-1.5 block">
              Flash discount (%)
            </span>
            <input
              type="number"
              min={1}
              max={100}
              value={settings.flashDealDiscountPct}
              onChange={(e) =>
                save({
                  flashDealDiscountPct: Math.min(100, Math.max(1, Number(e.target.value) || 0)),
                })
              }
              className={fieldClass}
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-gray-600 mb-1.5 block">Ends at</span>
            <input
              type="datetime-local"
              value={flashDealEndsAtToLocalInput(settings.flashDealEndsAt)}
              min={flashDealEndsAtToLocalInput(new Date().toISOString())}
              onChange={(e) => save({ flashDealEndsAt: flashDealEndsAtToIso(e.target.value) })}
              className={fieldClass}
            />
          </label>
          <div className="sm:col-span-2 flex flex-wrap items-center gap-3 text-xs">
            {live ? (
              <>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500 text-white font-semibold px-2.5 py-1">
                  Live · −{settings.flashDealDiscountPct}%
                </span>
                {countdown && settings.flashDealEndsAt && (
                  <div>
                    <p className="text-[10px] text-gray-500 mb-1">Ends in</p>
                    <CountdownTimer
                      key={settings.flashDealEndsAt}
                      d={countdown.d}
                      h={countdown.h}
                      m={countdown.m}
                    />
                  </div>
                )}
              </>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-200 text-gray-600 font-medium px-2.5 py-1">
                Not live — set a future end time
              </span>
            )}
            <span className="text-gray-500">
              Deal nightly ≈ {settings.currency}{" "}
              {Math.round(
                settings.basePrice * (1 - Math.min(100, settings.flashDealDiscountPct) / 100)
              ).toLocaleString()}
            </span>
            <button
              type="button"
              onClick={() =>
                save({ flashDealEndsAt: flashDealEndsAtToIso(defaultFlashDealEndsAt(48)) })
              }
              className="text-red-700 font-semibold hover:underline"
            >
              Set end +48h
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
