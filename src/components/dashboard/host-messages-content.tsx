"use client";

import { useState } from "react";
import { Link } from "@/i18n/routing";
import { ChevronLeft, ChevronRight, Loader2, MessageSquare } from "lucide-react";
import { HostDashboardShell } from "@/components/dashboard/host-dashboard-shell";
import { useAuth } from "@/components/providers/auth-provider";
import { useHostMessages } from "@/lib/host/use-host-messages";
import { resolveHostId } from "@/lib/listings/host-listings-utils";
import { formatBookingDate } from "@/lib/mock/dashboard-data";
import { cn } from "@/lib/utils";

function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function HostMessagesContent() {
  const { user } = useAuth();
  const hostId = resolveHostId(user);
  const [page, setPage] = useState(1);
  const { data, ready, error } = useHostMessages(hostId, page);

  if (!ready) {
    return (
      <HostDashboardShell>
        <div className="flex items-center justify-center min-h-[320px]">
          <Loader2 className="w-8 h-8 animate-spin text-green-600" />
        </div>
      </HostDashboardShell>
    );
  }

  const threads = data?.threads ?? [];
  const total = data?.total ?? 0;
  const pageSize = data?.pageSize ?? 50;
  const hasMore = data?.hasMore ?? false;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <HostDashboardShell>
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 font-display">Messages</h2>
          <p className="text-gray-500 text-sm mt-1">
            Latest message per paid booking. Open a thread from the booking detail page to reply.
          </p>
        </div>

        {error ? (
          <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
            {error}
          </p>
        ) : null}

        <div className="bg-white rounded-2xl border divide-y divide-gray-50">
          {threads.length === 0 ? (
            <div className="p-10 text-center text-sm text-gray-500">
              <MessageSquare className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              No booking messages yet. Threads appear here once a guest messages you on a booking.
            </div>
          ) : (
            threads.map((thread) => (
              <Link
                key={thread.bookingId}
                href={`/host/bookings/${encodeURIComponent(thread.bookingId)}`}
                className="block p-5 hover:bg-gray-50/80 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-gray-900">{thread.guestName}</p>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                        {thread.property}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {formatBookingDate(thread.checkIn)} ·{" "}
                      <span className="font-mono">{thread.bookingReference}</span>
                    </p>
                    <p className="text-sm text-gray-700 mt-2 line-clamp-2">{thread.lastMessageBody}</p>
                  </div>
                  <div className="shrink-0 text-end">
                    <time className="text-[11px] text-gray-400">{formatWhen(thread.lastMessageAt)}</time>
                    <p
                      className={cn(
                        "text-[10px] font-semibold mt-1 capitalize",
                        thread.lastSenderRole === "guest" ? "text-green-700" : "text-gray-500"
                      )}
                    >
                      {thread.lastSenderRole === "guest" ? "Guest replied" : "You replied"}
                    </p>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>

        {total > pageSize ? (
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-gray-500">
              Page {page} of {totalPages} · {total} conversations
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
