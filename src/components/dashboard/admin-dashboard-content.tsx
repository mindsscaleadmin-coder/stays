"use client";

import { Link } from "@/i18n/routing";
import {
  Building2,
  Users,
  Calendar,
  CreditCard,
  Star,
  AlertCircle,
  TrendingUp,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { AdminDashboardShell } from "./admin-dashboard-shell";
import { AdminAnalyticsSection } from "./admin-analytics-section";
import {
  ADMIN_STATS,
  REVENUE_DATA,
} from "@/lib/mock/dashboard-data";

const STAT_ICONS = [Building2, Users, Calendar, CreditCard, Star, AlertCircle];

const QUICK_ACTIONS = [
  { label: "Review Listings", href: "/admin/listings?tab=queue", cls: "bg-green-700 hover:bg-green-800 text-white" },
  { label: "Manage Users", href: "/admin/users", cls: "bg-blue-600 hover:bg-blue-700 text-white" },
  { label: "View Bookings", href: "/admin/bookings", cls: "bg-amber-500 hover:bg-amber-600 text-white" },
  { label: "Analytics", href: "/admin/analytics", cls: "bg-gray-700 hover:bg-gray-800 text-white" },
];

export function AdminDashboardContent() {
  const maxRevenue = Math.max(...REVENUE_DATA.map((d) => d.v));
  const { user, signOut } = useAuth();

  return (
    <AdminDashboardShell>
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

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          {ADMIN_STATS.map(({ label, value, change, color }, i) => {
            const Icon = STAT_ICONS[i];
            return (
              <div key={label} className="bg-white rounded-2xl border p-4">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="text-xl font-bold text-gray-900 leading-tight">{value}</div>
                <div className="text-xs font-medium text-gray-600 mt-0.5">{label}</div>
                <div className="text-[10px] text-gray-400 mt-1">{change}</div>
              </div>
            );
          })}
        </div>

        <div className="bg-white rounded-2xl border p-5">
          <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-green-600" /> Revenue (AED &apos;000)
          </h3>
          <div className="flex items-end gap-3 h-48">
            {REVENUE_DATA.map((d) => (
              <div key={d.m} className="flex-1 flex flex-col items-center gap-2">
                <div
                  className="w-full bg-green-600 rounded-t-md transition-all"
                  style={{ height: `${(d.v / maxRevenue) * 100}%`, minHeight: 8 }}
                  title={`AED ${d.v}K`}
                />
                <span className="text-[10px] text-gray-500">{d.m}</span>
              </div>
            ))}
          </div>
        </div>

        <AdminAnalyticsSection compact />

        <div className="bg-white rounded-2xl border p-5">
          <h3 className="font-bold text-gray-900 mb-4">Quick Actions</h3>
          <div className="flex flex-wrap gap-3">
            {QUICK_ACTIONS.map(({ label, href, cls }) => (
              <Link key={label} href={href} className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${cls}`}>
                {label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </AdminDashboardShell>
  );
}
