"use client";

import { Link } from "@/i18n/routing";
import { Building2, Calendar, CreditCard, Plus, Star } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { HostDashboardShell } from "./host-dashboard-shell";
import { HOST_NAV } from "@/lib/host/host-nav";
import { HOST_STATS } from "@/lib/mock/dashboard-data";
import { useHostVerification } from "@/lib/host/use-host-verification";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { cn } from "@/lib/utils";

const STAT_ICONS = [Building2, Calendar, CreditCard, Star];

export function HostDashboardContent() {
  const { user } = useAuth();
  const { request, ready } = useHostVerification(user?.id);
  const quickLinks = HOST_NAV.filter((item) => item.href !== "/host");

  return (
    <HostDashboardShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 font-display">Host Dashboard</h2>
            <p className="text-gray-500 text-sm mt-1">Manage listings, bookings, and earnings.</p>
          </div>
          <Link
            href="/host/listings/new"
            className="inline-flex items-center gap-2 bg-green-700 hover:bg-green-800 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" /> Add New Listing
          </Link>
        </div>

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
          {HOST_STATS.map(({ label, value, change, color }, i) => {
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

        <section className="bg-white rounded-2xl border p-5 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Host sections</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Same destinations as the sidebar — open any section below.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {quickLinks.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 rounded-xl border border-gray-100 hover:border-green-300 hover:bg-green-50/40 px-3.5 py-3 transition-colors"
                >
                  {Icon && (
                    <span className="w-9 h-9 rounded-lg bg-gray-50 text-green-700 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4" strokeWidth={1.75} />
                    </span>
                  )}
                  <span className="text-sm font-medium text-gray-800">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </HostDashboardShell>
  );
}
