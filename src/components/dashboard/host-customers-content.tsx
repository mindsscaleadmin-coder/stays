"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/routing";
import { ChevronLeft, ChevronRight, Loader2, Mail, Phone, Search, Users } from "lucide-react";
import { HostDashboardShell } from "@/components/dashboard/host-dashboard-shell";
import { useAuth } from "@/components/providers/auth-provider";
import { useHostCustomers } from "@/lib/host/use-host-customers";
import { resolveHostId } from "@/lib/listings/host-listings-utils";

function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function HostCustomersContent() {
  const { user } = useAuth();
  const hostId = resolveHostId(user);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setQuery(searchInput.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const { data, ready, error } = useHostCustomers(hostId, { page, q: query });

  if (!ready) {
    return (
      <HostDashboardShell>
        <div className="flex items-center justify-center min-h-[320px]">
          <Loader2 className="w-8 h-8 animate-spin text-green-600" />
        </div>
      </HostDashboardShell>
    );
  }

  const customers = data?.customers ?? [];
  const total = data?.total ?? 0;
  const pageSize = data?.pageSize ?? 50;
  const hasMore = data?.hasMore ?? false;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <HostDashboardShell>
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 font-display">Customers</h2>
          <p className="text-gray-500 text-sm mt-1">
            Guests who booked or confirmed an enquiry with you — aggregated across stays,
            experiences, dining, and events.
          </p>
        </div>

        <div className="bg-white rounded-2xl border p-4 sm:p-5">
          <label className="block relative">
            <span className="sr-only">Search customers</span>
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by name or email prefix…"
              className="w-full h-10 ps-10 pe-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </label>
        </div>

        {error ? (
          <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
            {error}
          </p>
        ) : null}

        <div className="bg-white rounded-2xl border divide-y divide-gray-50">
          {customers.length === 0 ? (
            <div className="p-10 text-center text-sm text-gray-500">
              <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              No customers match this search yet.
            </div>
          ) : (
            customers.map((customer) => (
              <div
                key={customer.guestId}
                className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900">{customer.guestName}</p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-gray-500">
                    {customer.guestEmail ? (
                      <span className="inline-flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {customer.guestEmail}
                      </span>
                    ) : null}
                    {customer.guestPhone ? (
                      <span className="inline-flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {customer.guestPhone}
                      </span>
                    ) : null}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Last activity {formatWhen(customer.lastActivityAt)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {customer.bookingCount > 0 ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-800">
                      {customer.bookingCount} booking{customer.bookingCount === 1 ? "" : "s"}
                    </span>
                  ) : null}
                  {customer.enquiryCount > 0 ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                      {customer.enquiryCount} enquir{customer.enquiryCount === 1 ? "y" : "ies"}
                    </span>
                  ) : null}
                  <Link
                    href="/host/bookings"
                    className="text-xs font-semibold text-green-700 hover:underline"
                  >
                    View bookings
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>

        {total > pageSize ? (
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-gray-500">
              Page {page} of {totalPages} · {total} customers
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1 text-xs font-semibold border border-gray-200 rounded-lg px-2.5 py-1.5 disabled:opacity-50"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Prev
              </button>
              <button
                type="button"
                disabled={!hasMore}
                onClick={() => setPage((p) => p + 1)}
                className="inline-flex items-center gap-1 text-xs font-semibold border border-gray-200 rounded-lg px-2.5 py-1.5 disabled:opacity-50"
              >
                Next
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </HostDashboardShell>
  );
}
