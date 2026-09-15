"use client";

import { Link } from "@/i18n/routing";
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Building2,
  CalendarDays,
  Loader2,
  MapPin,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { cn, formatAmount } from "@/lib/utils";
import {
  formatChangePct,
  formatPlatformMoney,
} from "@/lib/admin/platform-analytics-data";
import { useAdminPlatformAnalytics } from "@/lib/admin/use-admin-platform-analytics";
import type { PlatformAnalyticsSnapshot } from "@/lib/admin/platform-analytics-types";

export type AdminAnalyticsSectionData = {
  ready: boolean;
  snapshot: PlatformAnalyticsSnapshot;
  lastUpdatedLabel: string;
};

interface AdminAnalyticsSectionViewProps {
  compact?: boolean;
  showViewAll?: boolean;
  countryFilter?: string;
  analytics: AdminAnalyticsSectionData;
}

interface AdminAnalyticsSectionProps {
  compact?: boolean;
  showViewAll?: boolean;
  /** Country name filter — empty string = all countries */
  countryFilter?: string;
}

function ChangeBadge({ value }: { value: number }) {
  const positive = value >= 0;
  return (
    <span
      className={cn(
        "text-[10px] mt-1 inline-flex items-center gap-0.5 font-medium",
        positive ? "text-green-600" : "text-red-500"
      )}
    >
      {positive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
      {formatChangePct(value)}
    </span>
  );
}

function StatCard({
  label,
  value,
  change,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string;
  change: number;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "default" | "green" | "blue" | "amber" | "purple";
}) {
  const tones = {
    default: "bg-white border-gray-200",
    green: "bg-green-50/80 border-green-100",
    blue: "bg-blue-50/80 border-blue-100",
    amber: "bg-amber-50/80 border-amber-100",
    purple: "bg-purple-50/80 border-purple-100",
  };
  const iconTones = {
    default: "text-gray-500 bg-gray-100",
    green: "text-green-700 bg-green-100",
    blue: "text-blue-700 bg-blue-100",
    amber: "text-amber-700 bg-amber-100",
    purple: "text-purple-700 bg-purple-100",
  };

  return (
    <div className={cn("rounded-2xl border p-4 shadow-sm", tones[tone])}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">{label}</p>
          <p className="text-xl font-bold font-display text-gray-900 mt-1">{value}</p>
          <ChangeBadge value={change} />
        </div>
        <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", iconTones[tone])}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
}

export function AdminAnalyticsSection({
  compact = false,
  showViewAll = true,
  countryFilter = "",
}: AdminAnalyticsSectionProps) {
  const analytics = useAdminPlatformAnalytics(countryFilter);
  return (
    <AdminAnalyticsSectionView
      compact={compact}
      showViewAll={showViewAll}
      countryFilter={countryFilter}
      analytics={analytics}
    />
  );
}

export function AdminAnalyticsSectionView({
  compact = false,
  showViewAll = true,
  countryFilter = "",
  analytics,
}: AdminAnalyticsSectionViewProps) {
  const { ready, snapshot, lastUpdatedLabel } = analytics;
  const { kpis, monthlyTrends, bookingStatusBreakdown, regionalByState } = snapshot;

  if (!ready) {
    return (
      <div className="flex items-center justify-center min-h-[160px]">
        <Loader2 className="w-6 h-6 animate-spin text-green-600" />
      </div>
    );
  }

  const maxBookings = Math.max(...monthlyTrends.map((d) => d.bookings), 1);
  const maxRevenue = Math.max(...monthlyTrends.map((d) => d.revenue), 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-green-600" />
            Platform analytics
          </h3>
          <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-2">
            Synced from live bookings, listings &amp; hosts
            {countryFilter ? (
              <span className="text-gray-700 font-medium">· {countryFilter}</span>
            ) : (
              <span className="text-gray-400">· All countries</span>
            )}
            <span className="inline-flex items-center gap-1 text-green-700">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              {lastUpdatedLabel}
            </span>
          </p>
        </div>
        {showViewAll && (
          <Link
            href="/admin/analytics"
            className="text-green-600 text-xs font-semibold flex items-center gap-1 shrink-0"
          >
            Full dashboard <ArrowUpRight className="w-3 h-3" />
          </Link>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total bookings"
          value={formatAmount(kpis.totalBookings)}
          change={kpis.bookingsChangePct}
          icon={CalendarDays}
          tone="green"
        />
        <StatCard
          label="Platform revenue"
          value={formatPlatformMoney(kpis.totalRevenue)}
          change={kpis.revenueChangePct}
          icon={Wallet}
          tone="purple"
        />
        <StatCard
          label="Active hosts"
          value={formatAmount(kpis.activeHosts)}
          change={kpis.hostsChangePct}
          icon={Users}
          tone="blue"
        />
        <StatCard
          label="Active listings"
          value={formatAmount(kpis.activeListings)}
          change={kpis.listingsChangePct}
          icon={Building2}
          tone="amber"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border p-5">
          <h4 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-green-600" />
            Bookings trend
          </h4>
          <div className="flex items-end gap-2 h-40">
            {monthlyTrends.map((d) => (
              <div key={d.month} className="flex-1 flex flex-col items-center gap-2">
                <span className="text-[9px] text-gray-400 font-medium">{d.bookings}</span>
                <div
                  className="w-full bg-green-600 rounded-t-md"
                  style={{ height: `${(d.bookings / maxBookings) * 100}%`, minHeight: 8 }}
                  title={`${d.bookings} bookings`}
                />
                <span className="text-[10px] text-gray-500">{d.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border p-5">
          <h4 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
            <Wallet className="w-4 h-4 text-purple-600" />
            Revenue trend
          </h4>
          <div className="flex items-end gap-2 h-40">
            {monthlyTrends.map((d) => (
              <div key={d.month} className="flex-1 flex flex-col items-center gap-2">
                <span className="text-[9px] text-gray-400 font-medium">
                  {(d.revenue / 1000).toFixed(0)}k
                </span>
                <div
                  className="w-full bg-purple-500 rounded-t-md"
                  style={{ height: `${(d.revenue / maxRevenue) * 100}%`, minHeight: 8 }}
                  title={formatPlatformMoney(d.revenue)}
                />
                <span className="text-[10px] text-gray-500">{d.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {!compact && (
        <>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border p-5">
              <h4 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
                <MapPin className="w-4 h-4 text-blue-600" />
                Top regions (by revenue)
              </h4>
              <div className="space-y-3">
                {regionalByState.slice(0, 6).map((dest, i) => (
                  <div key={dest.state} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-gray-400 w-4">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="font-medium text-gray-800 truncate">{dest.state}</span>
                        <span className="text-gray-500 text-xs shrink-0 ms-2">
                          {formatPlatformMoney(dest.revenue)}
                        </span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${dest.sharePct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border p-5">
              <h4 className="font-semibold text-gray-900 mb-4">Booking status</h4>
              <div className="space-y-3">
                {bookingStatusBreakdown.map((item) => (
                  <div key={item.status}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-medium text-gray-700 capitalize">{item.status}</span>
                      <span className="text-gray-500">
                        {formatAmount(item.count)} ({item.pct}%)
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={cn("h-full rounded-full", item.color)}
                        style={{ width: `${item.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
