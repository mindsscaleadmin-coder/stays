"use client";

import { Link } from "@/i18n/routing";
import { Building2, Calendar, CreditCard, Plus, Star } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { HostDashboardShell } from "./host-dashboard-shell";
import { useHostVerification } from "@/lib/host/use-host-verification";
import { useHostAnalytics } from "@/lib/host/use-host-analytics";
import { resolveHostId } from "@/lib/listings/host-listings-utils";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { HostAnalyticsPanel } from "./host-analytics-content";
import { HostDailyOpsPanel } from "./host-daily-ops-panel";
import { HostOverviewAnnouncements } from "./host-overview-announcements";
import { cn, formatPrice } from "@/lib/utils";
import { emptyOverview } from "@/lib/host/compute-host-analytics";
import type { HostOverviewStats } from "@/lib/host/host-analytics-types";

function overviewCards(stats: HostOverviewStats) {
  return [
    {
      label: "Active Listings",
      value: String(stats.activeListings),
      change:
        stats.pendingListings > 0
          ? `${stats.pendingListings} pending approval`
          : "No listings waiting",
      color: "bg-blue-50 text-blue-600",
      href: "/host/listings",
      icon: Building2,
    },
    {
      label: "Bookings",
      value: String(stats.bookings),
      change:
        stats.bookingsThisWeek > 0
          ? `+${stats.bookingsThisWeek} this week`
          : "No new bookings this week",
      color: "bg-green-50 text-green-600",
      href: "/host/bookings",
      icon: Calendar,
    },
    {
      label: "Earnings",
      value: formatPrice(stats.earnings, "AED"),
      change:
        stats.earningsThisMonth > 0
          ? `+${formatPrice(stats.earningsThisMonth, "AED")} this month`
          : "No paid stays this month",
      color: "bg-purple-50 text-purple-600",
      href: "/host/accounts",
      icon: CreditCard,
    },
    {
      label: "Avg. Rating",
      value: stats.reviewCount > 0 ? stats.avgRating.toFixed(1) : "—",
      change:
        stats.reviewCount > 0
          ? `${stats.reviewCount} review${stats.reviewCount === 1 ? "" : "s"}`
          : "No reviews yet",
      color: "bg-amber-50 text-amber-600",
      href: "/host/reviews",
      icon: Star,
    },
  ];
}

export function HostDashboardContent() {
  const { user } = useAuth();
  const hostId = resolveHostId(user);
  const { request, ready } = useHostVerification(user?.id);
  const { data, ready: analyticsReady } = useHostAnalytics(hostId);
  const stats = data?.overview ?? emptyOverview();
  const cards = overviewCards(stats);

  return (
    <HostDashboardShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 font-display">Host Dashboard</h2>
            <p className="text-gray-500 text-sm mt-1">
              Today’s guests and what still needs a listing to go live.
            </p>
          </div>
          <Link
            href="/host/new-listing"
            className="inline-flex items-center gap-2 bg-green-700 hover:bg-green-800 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" /> Add New Listing
          </Link>
        </div>

        <HostOverviewAnnouncements hostId={hostId} hostName={user?.fullName} />

        {ready && request?.status === "pending" && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                <VerifiedBadge size="md" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-amber-900">Verification request pending</p>
                <p className="text-xs text-amber-800/80 mt-0.5">
                  Your documents are with admin for review. You can view the request on your
                  verification page.
                </p>
              </div>
            </div>
            <Link
              href="/host/profile#verification"
              className="inline-flex items-center justify-center text-xs font-semibold bg-white border border-amber-300 text-amber-900 px-3 py-2 rounded-lg hover:bg-amber-100/60 shrink-0"
            >
              View request
            </Link>
          </div>
        )}

        {ready && request?.status === "verified" && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-center gap-3">
            <VerifiedBadge size="md" />
            <p className="text-sm text-blue-800 font-medium">Your host profile is verified.</p>
          </div>
        )}

        {ready && (!request || request.status === "rejected") && (
          <div className="bg-white border rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
                <VerifiedBadge size="md" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900">
                  {request?.status === "rejected"
                    ? "Verification was declined — resubmit"
                    : "Get your host profile verified"}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Upload ID documents so admins can approve your host account.
                </p>
              </div>
            </div>
            <Link
              href="/host/profile#verification"
              className={cn(
                "inline-flex items-center justify-center text-xs font-semibold px-3 py-2 rounded-lg shrink-0",
                "bg-green-700 hover:bg-green-800 text-white"
              )}
            >
              Get verified
            </Link>
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.label}
                href={card.href}
                className="bg-white rounded-2xl border p-4 hover:border-green-300 hover:shadow-sm transition-colors"
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${card.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="text-xl font-bold text-gray-900 leading-tight">
                  {analyticsReady ? card.value : "—"}
                </div>
                <div className="text-xs font-medium text-gray-600 mt-0.5">{card.label}</div>
                <div className="text-[10px] text-gray-400 mt-1">
                  {analyticsReady ? card.change : "Loading…"}
                </div>
              </Link>
            );
          })}
        </div>

        <HostDailyOpsPanel />

        <HostAnalyticsPanel data={data} ready={analyticsReady} />
      </div>
    </HostDashboardShell>
  );
}
