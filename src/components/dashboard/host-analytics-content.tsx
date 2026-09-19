"use client";

import { BarChart3, Globe2, Loader2, Repeat, TrendingUp } from "lucide-react";
import { HostDashboardShell } from "@/components/dashboard/host-dashboard-shell";
import { useAuth } from "@/components/providers/auth-provider";
import { resolveHostId } from "@/lib/listings/use-listing-submissions";
import { useHostAnalytics } from "@/lib/host/use-host-analytics";
import type { HostAnalyticsData } from "@/lib/host/host-analytics-types";
import { cn, formatPrice } from "@/lib/utils";

function BarRow({
  label,
  value,
  max,
  suffix = "",
}: {
  label: string;
  value: number;
  max: number;
  suffix?: string;
}) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-600">{label}</span>
        <span className="font-semibold text-gray-900">
          {value}
          {suffix}
        </span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-green-600 rounded-full"
          style={{ width: `${Math.min(100, (value / max) * 100)}%` }}
        />
      </div>
    </div>
  );
}

export function HostAnalyticsPanel({
  className,
}: {
  className?: string;
}) {
  const { user } = useAuth();
  const hostId = resolveHostId(user);
  const { data, ready } = useHostAnalytics(hostId);
  return <HostAnalyticsPanelView className={className} data={data} ready={ready} />;
}

export function HostAnalyticsPanelView({
  className,
  data,
  ready,
}: {
  className?: string;
  data?: HostAnalyticsData | null;
  ready: boolean;
}) {
  if (!ready || !data) {
    return (
      <div className={cn("flex items-center justify-center min-h-[240px]", className)}>
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  const maxBookings = Math.max(...data.bookingTrend.map((b) => b.bookings), 1);

  return (
    <div className={cn("space-y-6", className)}>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border p-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
              <TrendingUp className="w-3.5 h-3.5" />
              Occupancy rate
            </div>
            <p className="text-3xl font-bold text-gray-900">{data.occupancyRatePct}%</p>
            <div className="mt-4 space-y-2">
              {data.occupancyTrend.map((p) => (
                <BarRow key={p.month} label={p.month} value={p.ratePct} max={100} suffix="%" />
              ))}
            </div>
          </div>
          <div className="bg-white rounded-2xl border p-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
              <BarChart3 className="w-3.5 h-3.5" />
              Booking trends
            </div>
            <div className="space-y-2">
              {data.bookingTrend.map((p) => (
                <BarRow key={p.month} label={p.month} value={p.bookings} max={maxBookings} />
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="bg-white rounded-2xl border p-5 space-y-4">
            <h3 className="font-display text-sm font-semibold text-gray-900">Revenue reports</h3>
            <div>
              <p className="text-xs font-semibold uppercase text-gray-400 mb-2">Monthly</p>
              <ul className="space-y-2">
                {data.revenueMonthly.map((r) => (
                  <li
                    key={r.period}
                    className="flex justify-between text-sm border-b border-gray-50 pb-2"
                  >
                    <span className="text-gray-600">{r.period}</span>
                    <span className="font-semibold text-gray-900">
                      {formatPrice(r.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-gray-400 mb-2">Yearly</p>
              <ul className="space-y-2">
                {data.revenueYearly.map((r) => (
                  <li
                    key={r.period}
                    className="flex justify-between text-sm border-b border-gray-50 pb-2"
                  >
                    <span className="text-gray-600">{r.period}</span>
                    <span className="font-semibold text-gray-900">
                      {formatPrice(r.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="bg-white rounded-2xl border p-5 space-y-4">
            <h3 className="font-display text-sm font-semibold text-gray-900">Guest demographics</h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <Globe2 className="w-4 h-4 text-green-700 mx-auto mb-1" />
                <p className="text-lg font-bold text-gray-900">{data.demographics.domesticPct}%</p>
                <p className="text-[10px] text-gray-500 uppercase">Domestic</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <Globe2 className="w-4 h-4 text-blue-600 mx-auto mb-1" />
                <p className="text-lg font-bold text-gray-900">
                  {data.demographics.internationalPct}%
                </p>
                <p className="text-[10px] text-gray-500 uppercase">International</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <Repeat className="w-4 h-4 text-amber-600 mx-auto mb-1" />
                <p className="text-lg font-bold text-gray-900">
                  {data.demographics.repeatGuestPct}%
                </p>
                <p className="text-[10px] text-gray-500 uppercase">Repeat</p>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 mb-2">Top guest countries</p>
              {data.demographics.topCountries.length > 0 ? (
                <ul className="space-y-1.5">
                  {data.demographics.topCountries.map((c) => (
                    <li key={c.country} className="flex justify-between text-sm">
                      <span className="text-gray-600">{c.country}</span>
                      <span className="font-medium text-gray-900">{c.pct}%</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-gray-400">Guest origin is not stored on bookings yet.</p>
              )}
            </div>
          </section>
        </div>

        <section className="bg-white rounded-2xl border p-5 space-y-4">
          <h3 className="font-display text-sm font-semibold text-gray-900">
            Benchmarking — similar listings nearby
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-gray-400 border-b">
                  <th className="pb-2 pr-4">Metric</th>
                  <th className="pb-2 pr-4">Your property</th>
                  <th className="pb-2 pr-4">Nearby avg</th>
                  <th className="pb-2">vs avg</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.benchmarks.map((b) => {
                  const diff = b.yours - b.nearbyAvg;
                  const better = diff > 0 || (b.label.includes("Response") && diff < 0);
                  return (
                    <tr key={b.label}>
                      <td className="py-3 pr-4 text-gray-700">{b.label}</td>
                      <td className="py-3 pr-4 font-semibold text-gray-900">
                        {b.yours}
                        {b.unit}
                      </td>
                      <td className="py-3 pr-4 text-gray-500">
                        {b.nearbyAvg}
                        {b.unit}
                      </td>
                      <td className="py-3">
                        <span
                          className={cn(
                            "text-xs font-bold",
                            better ? "text-green-700" : "text-amber-600"
                          )}
                        >
                          {diff > 0 ? "+" : ""}
                          {diff}
                          {b.unit}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
    </div>
  );
}

export function HostAnalyticsContent() {
  return (
    <HostDashboardShell>
      <HostAnalyticsPanel />
    </HostDashboardShell>
  );
}
