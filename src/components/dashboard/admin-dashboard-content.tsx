"use client";

import { type ComponentType } from "react";
import { Link } from "@/i18n/routing";
import {
  Building2,
  Users,
  CalendarDays,
  CreditCard,
  ClipboardCheck,
  FileCheck2,
  Loader2,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { AdminAnalyticsSectionView } from "./admin-analytics-section";
import { useAdminPlatformAnalytics } from "@/lib/admin/use-admin-platform-analytics";
import { useAdminUsers } from "@/lib/admin/use-admin-users";
import { usePendingListingBadgeCount } from "@/lib/admin/use-pending-listing-badge";
import { usePendingRefundBadgeCount } from "@/lib/admin/use-pending-refund-badge";
import { useHostVerification } from "@/lib/host/use-host-verification";
import { formatAmount } from "@/lib/utils";
import { formatPlatformMoney } from "@/lib/admin/platform-analytics-data";

const QUICK_ACTIONS = [
  { label: "Review Listings", href: "/admin/listings?tab=queue", cls: "bg-green-700 hover:bg-green-800 text-white" },
  { label: "Review Host IDs", href: "/admin/hosts?verification=pending", cls: "bg-purple-600 hover:bg-purple-700 text-white" },
  { label: "Manage Users", href: "/admin/users", cls: "bg-blue-600 hover:bg-blue-700 text-white" },
  { label: "View Bookings", href: "/admin/bookings", cls: "bg-amber-500 hover:bg-amber-600 text-white" },
  { label: "Pending Refunds", href: "/admin/financial?tab=refunds", cls: "bg-orange-600 hover:bg-orange-700 text-white" },
  { label: "Analytics", href: "/admin/analytics", cls: "bg-gray-700 hover:bg-gray-800 text-white" },
];

function OverviewCard({
  label,
  value,
  detail,
  href,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  tone: string;
}) {
  return (
    <Link
      href={href}
      className="group min-w-0 rounded-xl border border-gray-200 bg-white p-2.5 shadow-sm transition hover:-translate-y-0.5 hover:border-green-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-green-500 sm:p-3"
    >
      <div className="flex items-center gap-1.5">
        <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${tone}`}>
          <Icon className="h-3.5 w-3.5" />
        </span>
        <p
          className="truncate text-[10px] font-semibold uppercase tracking-wide text-gray-500"
          title={label}
        >
          {label}
        </p>
      </div>
      <p className="mt-1 text-lg font-bold leading-tight text-gray-900">{value}</p>
      <p
        className="mt-0.5 truncate text-[10px] text-gray-400 group-hover:text-green-700"
        title={detail}
      >
        {detail}
      </p>
    </Link>
  );
}

export function AdminDashboardContent() {
  const { user, signOut } = useAuth();
  const { users } = useAdminUsers();
  const pendingListings = usePendingListingBadgeCount();
  const { pendingCount: pendingVerifications, ready: verificationsReady } =
    useHostVerification();
  const analytics = useAdminPlatformAnalytics();
  const { ready: analyticsReady, snapshot } = analytics;
  const { kpis } = snapshot;

  const pendingRefunds = usePendingRefundBadgeCount();
  const pendingUsers = users.filter((account) => account.status === "pending").length;
  const pendingListingCount = pendingListings ?? 0;
  const pendingRefundCount = pendingRefunds ?? 0;
  const operationalQueue =
    pendingListingCount + pendingVerifications + pendingUsers + pendingRefundCount;
  const ready = verificationsReady && analyticsReady;

  const cards = [
    {
      label: "Active listings",
      value: formatAmount(kpis.activeListings),
      detail: `${pendingListingCount} awaiting review`,
      href: "/admin/listings",
      icon: Building2,
      tone: "bg-blue-50 text-blue-600",
    },
    {
      label: "Total users",
      value: formatAmount(users.length),
      detail: `${pendingUsers} pending approval`,
      href: "/admin/users",
      icon: Users,
      tone: "bg-green-50 text-green-600",
    },
    {
      label: "Total bookings",
      value: formatAmount(kpis.totalBookings),
      detail: "Open booking oversight",
      href: "/admin/bookings",
      icon: CalendarDays,
      tone: "bg-amber-50 text-amber-600",
    },
    {
      label: "Platform revenue",
      value: formatPlatformMoney(kpis.totalRevenue),
      detail:
        pendingRefundCount > 0
          ? `${pendingRefundCount} refund${pendingRefundCount === 1 ? "" : "s"} awaiting approval`
          : "Open financial control",
      href: "/admin/financial?tab=refunds",
      icon: CreditCard,
      tone: "bg-purple-50 text-purple-600",
    },
    {
      label: "Active hosts",
      value: formatAmount(kpis.activeHosts),
      detail: `${pendingVerifications} ID checks pending`,
      href: "/admin/hosts",
      icon: ShieldCheck,
      tone: "bg-cyan-50 text-cyan-700",
    },
    {
      label: "Action queue",
      value: formatAmount(operationalQueue),
      detail: "Listings, users, and ID checks",
      href: "/admin/alerts",
      icon: ClipboardCheck,
      tone: "bg-red-50 text-red-600",
    },
  ];

  return (
          <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 font-display">
              Welcome back, {user?.fullName ?? "Admin"} 👋
            </h2>
            <p className="text-gray-500 text-sm mt-1">
              Here&apos;s what&apos;s happening on Greenfield Farm Stays today.
            </p>
          </div>
          <button
            type="button"
            onClick={() => signOut().then(() => (window.location.href = "/admin/login"))}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-600 shrink-0"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>

        {!ready ? (
          <div className="flex min-h-32 items-center justify-center rounded-2xl border bg-white">
            <Loader2 className="h-6 w-6 animate-spin text-green-600" />
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 sm:gap-3">
            {cards.map((card) => (
              <OverviewCard key={card.label} {...card} />
            ))}
          </div>
        )}

        <AdminAnalyticsSectionView compact analytics={analytics} />

        <div className="rounded-2xl border bg-white p-5">
          <div className="mb-4 flex items-center gap-2">
            <FileCheck2 className="h-4 w-4 text-green-700" />
            <h3 className="font-bold text-gray-900">Quick actions</h3>
          </div>
          <div className="grid grid-cols-5 gap-2 sm:gap-3">
            {QUICK_ACTIONS.map(({ label, href, cls }) => (
              <Link key={label} href={href} className={`px-2 py-2.5 sm:px-3 rounded-xl text-center text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap ${cls}`}>
                {label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    
  );
}
