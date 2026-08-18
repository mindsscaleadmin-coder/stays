"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Link, useRouter } from "@/i18n/routing";
import {
  AlertTriangle,
  Ban,
  Building2,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  Loader2,
  RefreshCw,
  Scale,
  Search,
  SlidersHorizontal,
  User,
  UserX,
  X,
} from "lucide-react";
import { AdminDashboardShell } from "./admin-dashboard-shell";
import { BookingMessageThread } from "@/components/booking/booking-message-thread";
import { formatBookingDate, STATUS_STYLES } from "@/lib/mock/dashboard-data";
import { formatRate } from "@/lib/admin/booking-oversight-utils";
import { useAdminBookings } from "@/lib/admin/use-admin-bookings";
import type { HostBookingRecord } from "@/lib/host/host-booking-types";
import { useAuth } from "@/components/providers/auth-provider";
import { cn } from "@/lib/utils";

type TabId = "bookings" | "metrics";

const TABS: { id: TabId; label: string }[] = [
  { id: "bookings", label: "All bookings" },
  { id: "metrics", label: "Host metrics" },
];

const inputClass =
  "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-green-500";

const selectClass =
  "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-green-500";

function guestInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function statusLabel(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function StatCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: number | string;
  hint?: string;
  tone?: "default" | "amber" | "green" | "orange" | "gray";
}) {
  const tones = {
    default: "bg-white border-gray-200",
    amber: "bg-amber-50/80 border-amber-100",
    green: "bg-green-50/80 border-green-100",
    orange: "bg-orange-50/80 border-orange-100",
    gray: "bg-gray-50 border-gray-200",
  };
  const valueTones = {
    default: "text-gray-900",
    amber: "text-amber-700",
    green: "text-green-700",
    orange: "text-orange-700",
    gray: "text-gray-700",
  };

  return (
    <div className={cn("rounded-2xl border p-4 shadow-sm", tones[tone])}>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className={cn("text-2xl font-bold font-display mt-1", valueTones[tone])}>{value}</p>
      {hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
    </div>
  );
}

function FilterField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block min-w-0">
      <span className="block text-[10px] font-semibold uppercase tracking-wide text-gray-500 mb-1">
        {label}
      </span>
      {children}
    </label>
  );
}

function BookingRowCard({
  booking,
  onManage,
}: {
  booking: HostBookingRecord;
  onManage: () => void;
}) {
  const nights = booking.nights;

  return (
    <article className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-green-100 transition-all p-4 sm:p-5">
      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-green-600 to-green-700 text-white flex items-center justify-center text-sm font-bold shrink-0 shadow-sm">
            {guestInitials(booking.guest)}
          </div>

          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-bold text-gray-900 truncate">{booking.guest}</h3>
              <span className="text-[10px] font-mono text-gray-400 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-md">
                {booking.id}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-gray-500">
              <span className="inline-flex items-center gap-1.5 min-w-0">
                <Building2 className="w-3.5 h-3.5 shrink-0 text-green-700" />
                <span className="truncate">{booking.property}</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 shrink-0 text-gray-400" />
                {booking.hostName ?? "Unknown host"}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="w-3.5 h-3.5 shrink-0 text-gray-400" />
                {formatBookingDate(booking.checkIn)} – {formatBookingDate(booking.checkOut)}
                {nights > 0 && <span className="text-gray-400">· {nights} nights</span>}
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              <span
                className={cn(
                  "text-[10px] font-bold px-2.5 py-1 rounded-full capitalize",
                  STATUS_STYLES[booking.status]
                )}
              >
                {statusLabel(booking.status)}
              </span>
              {booking.disputeStatus === "open" && (
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 inline-flex items-center gap-1">
                  <Scale className="w-3 h-3" /> Dispute open
                </span>
              )}
              {booking.disputeStatus === "resolved" && (
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700">
                  Dispute resolved
                </span>
              )}
              {booking.noShow && (
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-gray-200 text-gray-700 inline-flex items-center gap-1">
                  <UserX className="w-3 h-3" /> No-show
                </span>
              )}
              <span className="text-[10px] font-medium px-2.5 py-1 rounded-full bg-gray-50 text-gray-500 border border-gray-100">
                {booking.paymentStatus}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between lg:justify-end gap-4 shrink-0 border-t lg:border-t-0 pt-3 lg:pt-0">
          <div className="text-start lg:text-end">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Total</p>
            <p className="text-lg font-bold text-green-700">{booking.total}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">
              Booked {formatBookingDate(booking.bookedAt)}
            </p>
          </div>
          <button
            type="button"
            onClick={onManage}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-green-700 border border-green-200 hover:bg-green-50 px-4 py-2.5 rounded-xl transition-colors"
          >
            Manage
            <ChevronRight className="w-4 h-4 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
          </button>
        </div>
      </div>
    </article>
  );
}

function BookingDetailPanel({
  booking,
  onClose,
  onForceCancel,
  onForceRefund,
  onResolveDispute,
  onUpdateDispute,
  onMarkNoShow,
  onClearNoShow,
}: {
  booking: HostBookingRecord;
  onClose: () => void;
  onForceCancel: (reason: string) => void;
  onForceRefund: (amount: string, reason: string) => void;
  onResolveDispute: (resolution: string) => void;
  onUpdateDispute: (guestClaim: string, hostResponse: string) => void;
  onMarkNoShow: (note: string) => void;
  onClearNoShow: () => void;
}) {
  const { user } = useAuth();
  const [cancelReason, setCancelReason] = useState("");
  const [refundAmount, setRefundAmount] = useState(booking.total);
  const [refundReason, setRefundReason] = useState("");
  const [resolution, setResolution] = useState("");
  const [guestClaim, setGuestClaim] = useState(booking.disputeGuestClaim ?? "");
  const [hostResponse, setHostResponse] = useState(booking.disputeHostResponse ?? "");
  const [noShowNote, setNoShowNote] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
      <div className="bg-white w-full max-w-xl h-full overflow-y-auto shadow-xl flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b sticky top-0 bg-white z-10">
          <div>
            <h3 className="font-semibold text-gray-900">{booking.id}</h3>
            <p className="text-xs text-gray-500">{booking.guest} · {booking.property}</p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-6 flex-1">
          <section className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-[10px] font-semibold uppercase text-gray-400">Host</p>
              <p className="font-medium text-gray-800">{booking.hostName ?? "—"}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase text-gray-400">Status</p>
              <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full capitalize", STATUS_STYLES[booking.status])}>
                {booking.status}
              </span>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase text-gray-400">Check-in</p>
              <p className="text-gray-700">{formatBookingDate(booking.checkIn)}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase text-gray-400">Check-out</p>
              <p className="text-gray-700">{formatBookingDate(booking.checkOut)}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase text-gray-400">Total</p>
              <p className="font-semibold text-green-700">{booking.total}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase text-gray-400">Payment</p>
              <p className="text-gray-700">{booking.paymentStatus}</p>
            </div>
          </section>

          {booking.disputeStatus !== "none" && (
            <section className="border rounded-xl p-4 space-y-3 bg-orange-50/50 border-orange-100">
              <div className="flex items-center gap-2">
                <Scale className="w-4 h-4 text-orange-600" />
                <h4 className="font-semibold text-gray-900">
                  Dispute · {booking.disputeStatus}
                </h4>
              </div>
              {booking.disputeSummary && (
                <p className="text-sm text-gray-700">{booking.disputeSummary}</p>
              )}
              <label className="block">
                <span className="text-xs font-semibold text-gray-500">Guest claim</span>
                <textarea
                  value={guestClaim}
                  onChange={(e) => setGuestClaim(e.target.value)}
                  rows={2}
                  className={cn(inputClass, "mt-1 resize-y")}
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-gray-500">Host response</span>
                <textarea
                  value={hostResponse}
                  onChange={(e) => setHostResponse(e.target.value)}
                  rows={2}
                  className={cn(inputClass, "mt-1 resize-y")}
                />
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onUpdateDispute(guestClaim, hostResponse)}
                  className="text-xs border border-gray-200 px-3 py-1.5 rounded-lg hover:border-green-400"
                >
                  Save notes
                </button>
                {booking.disputeStatus === "open" && (
                  <>
                    <input
                      value={resolution}
                      onChange={(e) => setResolution(e.target.value)}
                      placeholder="Resolution summary…"
                      className={cn(inputClass, "flex-1 min-w-[160px]")}
                    />
                    <button
                      type="button"
                      disabled={!resolution.trim()}
                      onClick={() => onResolveDispute(resolution.trim())}
                      className="text-xs bg-green-700 hover:bg-green-800 text-white px-3 py-1.5 rounded-lg font-medium disabled:opacity-40"
                    >
                      Resolve dispute
                    </button>
                  </>
                )}
              </div>
              {booking.disputeResolution && (
                <p className="text-xs text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2">
                  Resolved: {booking.disputeResolution}
                </p>
              )}
            </section>
          )}

          <BookingMessageThread
            bookingId={booking.id}
            viewerRole="admin"
            viewerId={user?.id || "admin"}
            viewerName={user?.fullName || "Support"}
            title={
              booking.disputeStatus === "open"
                ? "Dispute thread (same as guest ↔ host)"
                : "Booking thread"
            }
            subtitle="Admin joins the same conversation — not a separate inbox."
            compact
          />

          <section className="border rounded-xl p-4 space-y-3">
            <h4 className="font-semibold text-gray-900 flex items-center gap-2">
              <Ban className="w-4 h-4 text-red-600" /> Force cancel
            </h4>
            <input
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Reason for admin cancellation…"
              className={inputClass}
            />
            <button
              type="button"
              disabled={!cancelReason.trim() || booking.status === "cancelled"}
              onClick={() => {
                if (!confirm("Force cancel this booking?")) return;
                onForceCancel(cancelReason.trim());
              }}
              className="text-xs border border-red-200 text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-50 disabled:opacity-40"
            >
              Force cancel booking
            </button>
          </section>

          <section className="border rounded-xl p-4 space-y-3">
            <h4 className="font-semibold text-gray-900 flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-amber-600" /> Force refund
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                placeholder="Amount e.g. AED 3,347"
                className={inputClass}
              />
              <input
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="Refund reason…"
                className={inputClass}
              />
            </div>
            <button
              type="button"
              disabled={!refundAmount.trim() || !refundReason.trim()}
              onClick={() => {
                if (!confirm(`Issue refund of ${refundAmount}?`)) return;
                onForceRefund(refundAmount.trim(), refundReason.trim());
              }}
              className="text-xs border border-amber-200 text-amber-700 px-3 py-1.5 rounded-lg hover:bg-amber-50 disabled:opacity-40"
            >
              Process force refund
            </button>
            {booking.refundAmount && (
              <p className="text-xs text-gray-500">
                Current refund: {booking.refundAmount} ({booking.refundStatus})
              </p>
            )}
          </section>

          <section className="border rounded-xl p-4 space-y-3">
            <h4 className="font-semibold text-gray-900 flex items-center gap-2">
              <UserX className="w-4 h-4 text-gray-600" /> No-show
            </h4>
            {booking.noShow ? (
              <div className="space-y-2">
                <p className="text-sm text-orange-700 font-medium">Marked as no-show</p>
                <button
                  type="button"
                  onClick={onClearNoShow}
                  className="text-xs border border-gray-200 px-3 py-1.5 rounded-lg"
                >
                  Clear no-show flag
                </button>
              </div>
            ) : (
              <>
                <input
                  value={noShowNote}
                  onChange={(e) => setNoShowNote(e.target.value)}
                  placeholder="Optional note…"
                  className={inputClass}
                />
                <button
                  type="button"
                  onClick={() => onMarkNoShow(noShowNote.trim())}
                  className="text-xs border border-gray-200 px-3 py-1.5 rounded-lg hover:border-orange-300"
                >
                  Mark as no-show
                </button>
              </>
            )}
          </section>

          <section className="border rounded-xl p-4 space-y-2">
            <h4 className="font-semibold text-gray-900 flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-green-700" /> Audit trail
            </h4>
            {(booking.auditLog ?? []).length === 0 ? (
              <p className="text-xs text-gray-400">No admin actions recorded yet.</p>
            ) : (
              <ul className="space-y-2">
                {[...(booking.auditLog ?? [])].reverse().map((entry) => (
                  <li key={entry.id} className="text-xs border border-gray-100 rounded-lg px-3 py-2 bg-gray-50">
                    <div className="flex justify-between gap-2">
                      <span className="font-semibold text-gray-800">{entry.action}</span>
                      <span className="text-gray-400 shrink-0">
                        {new Date(entry.at).toLocaleString("en-GB", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="text-gray-500 mt-0.5">{entry.actor}{entry.detail ? ` · ${entry.detail}` : ""}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

export function AdminBookingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab") as TabId | null;
  const activeTab: TabId = TABS.some((t) => t.id === tabParam) ? tabParam! : "bookings";

  const {
    ready,
    bookings,
    hostMetrics,
    openDisputeCount,
    noShowCount,
    forceCancel,
    forceRefund,
    resolveDispute,
    updateDisputeNotes,
    markNoShow,
    clearNoShow,
  } = useAdminBookings();

  useEffect(() => {
    if (searchParams.get("tab") === "disputes") {
      router.replace("/admin/support?tab=disputes");
    }
  }, [searchParams, router]);

  const [message, setMessage] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [hostFilter, setHostFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [disputeFilter, setDisputeFilter] = useState("");
  const [noShowOnly, setNoShowOnly] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(true);

  const setTab = useCallback(
    (tab: TabId) => router.replace(`/admin/bookings?tab=${tab}`),
    [router]
  );

  function flash(text: string) {
    setMessage(text);
    setTimeout(() => setMessage(""), 3000);
  }

  const hosts = useMemo(
    () =>
      Array.from(
        new Set(bookings.map((b) => b.hostName).filter(Boolean) as string[])
      ).sort(),
    [bookings]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return bookings.filter((b) => {
      if (hostFilter && b.hostName !== hostFilter) return false;
      if (statusFilter && b.status !== statusFilter) return false;
      if (disputeFilter && b.disputeStatus !== disputeFilter) return false;
      if (noShowOnly && !b.noShow) return false;
      if (!q) return true;
      const haystack = [
        b.id,
        b.guest,
        b.hostName,
        b.property,
        b.guestEmail,
        b.disputeSummary,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [bookings, query, hostFilter, statusFilter, disputeFilter, noShowOnly]);

  const selected = useMemo(
    () => (selectedId ? bookings.find((b) => b.id === selectedId) ?? null : null),
    [bookings, selectedId]
  );

  const bookingStats = useMemo(() => {
    const pending = bookings.filter((b) => b.status === "pending").length;
    const confirmed = bookings.filter((b) => b.status === "confirmed").length;
    const completed = bookings.filter((b) => b.status === "completed").length;
    return {
      total: bookings.length,
      pending,
      active: confirmed,
      completed,
      disputes: openDisputeCount,
      noShows: noShowCount,
    };
  }, [bookings, openDisputeCount, noShowCount]);

  const activeFilterCount =
    [hostFilter, statusFilter, disputeFilter].filter(Boolean).length +
    (query.trim() ? 1 : 0) +
    (noShowOnly ? 1 : 0);

  function clearFilters() {
    setQuery("");
    setHostFilter("");
    setStatusFilter("");
    setDisputeFilter("");
    setNoShowOnly(false);
  }

  function applyQuickFilter(
    preset: "all" | "pending" | "confirmed" | "disputes" | "noShows"
  ) {
    if (preset === "disputes") {
      router.push("/admin/support?tab=disputes");
      return;
    }
    clearFilters();
    if (preset === "pending") setStatusFilter("pending");
    if (preset === "confirmed") setStatusFilter("confirmed");
    if (preset === "noShows") setNoShowOnly(true);
  }

  if (!ready) {
    return (
      <AdminDashboardShell>
        <div className="flex items-center justify-center min-h-[320px]">
          <Loader2 className="w-8 h-8 animate-spin text-green-600" />
        </div>
      </AdminDashboardShell>
    );
  }

  return (
    <AdminDashboardShell>
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 font-display">Booking Oversight</h2>
          <p className="text-gray-500 text-sm mt-1">
            View all bookings, intervene on individual bookings, force cancel/refund, and monitor host reliability.
            {openDisputeCount > 0 && (
              <span className="text-orange-600 font-medium">
                {" "}
                {openDisputeCount} open dispute{openDisputeCount === 1 ? "" : "s"} — manage in{" "}
                <Link href="/admin/support?tab=disputes" className="underline font-semibold">
                  Support &amp; Disputes
                </Link>
                .
              </span>
            )}
          </p>
        </div>

        {message && (
          <div className="bg-green-50 border border-green-200 text-green-800 text-sm rounded-xl px-4 py-3">
            {message}
          </div>
        )}

        <div className="flex flex-wrap gap-2 border-b pb-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setTab(tab.id)}
              className={cn(
                "text-sm font-medium px-3 py-2 rounded-t-lg border-b-2 -mb-px transition-colors",
                activeTab === tab.id
                  ? "border-green-700 text-green-800 bg-green-50/80"
                  : "border-transparent text-gray-500 hover:text-gray-800"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "bookings" && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-3">
              <StatCard label="Total bookings" value={bookingStats.total} />
              <StatCard label="Pending" value={bookingStats.pending} tone="amber" hint="Awaiting host action" />
              <StatCard label="Confirmed" value={bookingStats.active} tone="green" hint="Upcoming & ongoing" />
              <StatCard label="Completed" value={bookingStats.completed} tone="gray" />
              <StatCard
                label="Open disputes"
                value={bookingStats.disputes}
                tone="orange"
                hint="Handled in Support & Disputes"
              />
              <StatCard label="No-shows" value={bookingStats.noShows} tone="gray" hint="Flagged guests" />
            </div>

            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["all", "All"],
                  ["pending", "Pending"],
                  ["confirmed", "Confirmed"],
                  ["disputes", "Open disputes"],
                  ["noShows", "No-shows"],
                ] as const
              ).map(([key, label]) => {
                const active =
                  (key === "all" && activeFilterCount === 0) ||
                  (key === "pending" && statusFilter === "pending") ||
                  (key === "confirmed" && statusFilter === "confirmed") ||
                  (key === "disputes" && disputeFilter === "open") ||
                  (key === "noShows" && noShowOnly);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => applyQuickFilter(key)}
                    className={cn(
                      "text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors",
                      active
                        ? "bg-green-700 border-green-700 text-white"
                        : "bg-white border-gray-200 text-gray-600 hover:border-green-300 hover:text-green-800"
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 border-b bg-gray-50/80">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-green-700" />
                  <h3 className="text-sm font-semibold text-gray-900">Search & filters</h3>
                  {activeFilterCount > 0 && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                      {activeFilterCount} active
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span>
                    <span className="font-semibold text-gray-800">{filtered.length}</span> of{" "}
                    {bookings.length} bookings
                  </span>
                  {activeFilterCount > 0 && (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="inline-flex items-center gap-1 text-green-700 font-semibold hover:underline"
                    >
                      <X className="w-3.5 h-3.5" /> Clear all
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setFiltersOpen((v) => !v)}
                    className="text-green-700 font-semibold hover:underline"
                  >
                    {filtersOpen ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              {filtersOpen && (
                <div className="p-4 space-y-4 border-b bg-white">
                  <div className="relative">
                    <Search className="w-4 h-4 text-gray-400 absolute start-3 top-1/2 -translate-y-1/2" />
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search booking ID, guest, host, property, email…"
                      className={cn(inputClass, "ps-9")}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <FilterField label="Host">
                      <select value={hostFilter} onChange={(e) => setHostFilter(e.target.value)} className={selectClass}>
                        <option value="">All hosts</option>
                        {hosts.map((h) => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </FilterField>
                    <FilterField label="Status">
                      <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={selectClass}>
                        <option value="">All statuses</option>
                        {["pending", "confirmed", "completed", "cancelled", "declined"].map((s) => (
                          <option key={s} value={s}>{statusLabel(s)}</option>
                        ))}
                      </select>
                    </FilterField>
                    <FilterField label="Dispute">
                      <select value={disputeFilter} onChange={(e) => setDisputeFilter(e.target.value)} className={selectClass}>
                        <option value="">Any dispute status</option>
                        <option value="open">Open</option>
                        <option value="resolved">Resolved</option>
                        <option value="none">None</option>
                      </select>
                    </FilterField>
                    <FilterField label="Flags">
                      <label className="flex items-center gap-2 h-[42px] px-3 rounded-lg border border-gray-200 bg-gray-50/50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={noShowOnly}
                          onChange={(e) => setNoShowOnly(e.target.checked)}
                          className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                        />
                        <span className="text-sm text-gray-700">No-shows only</span>
                      </label>
                    </FilterField>
                  </div>
                </div>
              )}
            </div>

            {filtered.length === 0 ? (
              <div className="bg-white rounded-2xl border shadow-sm p-10 text-center">
                <CalendarDays className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-700">No bookings match your filters</p>
                <p className="text-xs text-gray-400 mt-1 mb-4">
                  Try clearing filters or searching with a different guest, host, or booking ID.
                </p>
                {activeFilterCount > 0 && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="text-sm font-semibold text-green-700 hover:underline"
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map((b) => (
                  <BookingRowCard key={b.id} booking={b} onManage={() => setSelectedId(b.id)} />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "metrics" && (
          <div className="bg-white rounded-2xl border overflow-hidden">
            <div className="p-4 border-b bg-gray-50/80">
              <h3 className="text-sm font-semibold text-gray-900">Host reliability</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Cancellation and no-show rates per host, synced from live booking data.
              </p>
            </div>
            <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
              <tr>
                    {["Host", "Bookings", "Cancellations", "Cancel rate", "No-shows", "No-show rate", "Open disputes"].map((h) => (
                  <th key={h} className="px-4 py-3 text-start font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
                  {hostMetrics.map((row) => (
                    <tr key={row.hostId} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-800">{row.hostName}</td>
                      <td className="px-4 py-3 text-gray-600">{row.totalBookings}</td>
                      <td className="px-4 py-3 text-gray-600">{row.cancellations}</td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          "font-semibold",
                          row.cancellationRate >= 20 ? "text-red-600" : row.cancellationRate >= 10 ? "text-amber-600" : "text-gray-700"
                        )}>
                          {formatRate(row.cancellationRate)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{row.noShows}</td>
                  <td className="px-4 py-3">
                        <span className={cn(
                          "font-semibold",
                          row.noShowRate >= 10 ? "text-red-600" : row.noShowRate >= 5 ? "text-amber-600" : "text-gray-700"
                        )}>
                          {formatRate(row.noShowRate)}
                    </span>
                  </td>
                      <td className="px-4 py-3">
                        {row.openDisputes > 0 ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                            {row.openDisputes}
                          </span>
                        ) : (
                          <span className="text-gray-400">0</span>
                        )}
                      </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
            <p className="px-4 py-3 text-xs text-gray-400 flex items-start gap-1.5 border-t">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              Rates update automatically when bookings are cancelled or marked as no-show.
            </p>
          </div>
        )}
      </div>

      {selected && (
        <BookingDetailPanel
          booking={selected}
          onClose={() => setSelectedId(null)}
          onForceCancel={(reason) => {
            forceCancel(selected.id, reason);
            setSelectedId(null);
            flash("Booking force-cancelled. Audit entry recorded.");
          }}
          onForceRefund={(amount, reason) => {
            forceRefund(selected.id, amount, reason);
            flash("Refund processed. Audit entry recorded.");
          }}
          onResolveDispute={(resolution) => {
            resolveDispute(selected.id, resolution);
            flash("Dispute resolved.");
          }}
          onUpdateDispute={(guestClaim, hostResponse) => {
            updateDisputeNotes(selected.id, { guestClaim, hostResponse });
            flash("Dispute notes saved.");
          }}
          onMarkNoShow={(note) => {
            markNoShow(selected.id, note || undefined);
            flash("Marked as no-show.");
          }}
          onClearNoShow={() => {
            clearNoShow(selected.id);
            flash("No-show flag cleared.");
          }}
        />
      )}
    </AdminDashboardShell>
  );
}
