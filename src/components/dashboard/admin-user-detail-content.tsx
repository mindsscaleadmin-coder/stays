"use client";

import { useEffect, useMemo, useState } from "react";
import { Link } from "@/i18n/routing";
import {
  ArrowLeft,
  BadgeCheck,
  BedDouble,
  CalendarDays,
  Headphones,
  Home,
  Mail,
  Phone,
  Shield,
  User,
} from "lucide-react";
import { AdminDashboardShell } from "./admin-dashboard-shell";
import {
  buildHostListingStats,
  listingsForHost,
  statsForHost,
} from "@/lib/admin/host-helpers";
import {
  accountSettingsForGuest,
  bookingsForGuest,
  findGuestVerificationLocal,
  resolveGuestKeys,
  ticketsForGuest,
} from "@/lib/admin/guest-helpers";
import { formatJoinedAt } from "@/lib/admin/user-data";
import { useAdminUsers } from "@/lib/admin/use-admin-users";
import { useListingSubmissions } from "@/lib/listings/use-listing-submissions";
import {
  fetchGuestVerificationFromApi,
  reviewGuestVerificationToApi,
  shouldUseSharedGuestVerification,
} from "@/lib/guest/guest-verification-api";
import type { GuestVerificationRequest } from "@/lib/guest/guest-verification-types";
import { fetchGuestBookingsFromServer, mergeServerGuestBookings } from "@/lib/guest/guest-bookings-data";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  verified: "bg-blue-500 text-white",
  pending: "bg-amber-100 text-amber-700",
  suspended: "bg-orange-100 text-orange-700",
  banned: "bg-red-100 text-red-700",
};

const ROLE_STYLES: Record<string, string> = {
  admin: "bg-purple-100 text-purple-700",
  host: "bg-blue-100 text-blue-700",
  guest: "bg-gray-100 text-gray-600",
};

const VERIFY_STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  verified: "bg-blue-500 text-white",
  rejected: "bg-red-100 text-red-700",
};

const BOOKING_STATUS_STYLES: Record<string, string> = {
  confirmed: "bg-green-100 text-green-700",
  pending: "bg-amber-100 text-amber-700",
  cancelled: "bg-red-100 text-red-700",
  completed: "bg-blue-100 text-blue-700",
  expired: "bg-gray-100 text-gray-600",
  declined: "bg-red-100 text-red-700",
};

const TICKET_STATUS_STYLES: Record<string, string> = {
  open: "bg-amber-100 text-amber-800",
  in_progress: "bg-blue-100 text-blue-700",
  resolved: "bg-green-100 text-green-700",
};

function guestIdTypeLabel(idType: string): string {
  if (idType === "passport") return "Passport";
  if (idType === "trade_license") return "Trade license";
  return "Emirates ID";
}

export function AdminUserDetailContent({ userId }: { userId: string }) {
  const { users, suspend, verify, unsuspend } = useAdminUsers();
  const { all: listings } = useListingSubmissions({ load: true });
  const [message, setMessage] = useState("");
  const [reviewNote, setReviewNote] = useState("");
  const [verification, setVerification] = useState<GuestVerificationRequest | null>(null);
  const [bookingsTick, setBookingsTick] = useState(0);

  const user = useMemo(() => {
    const decoded = decodeURIComponent(userId);
    return users.find((u) => u.id === decoded || u.id === userId);
  }, [users, userId]);

  const listingStats = useMemo(() => buildHostListingStats(listings), [listings]);
  const hostListings = useMemo(
    () => (user?.roles.includes("host") ? listingsForHost(listings, user) : []),
    [listings, user]
  );
  const stats = user ? statsForHost(listingStats, user) : null;

  const isGuest = Boolean(user?.roles.includes("guest"));

  const guestBookings = useMemo(() => {
    if (!user || !isGuest) return [];
    void bookingsTick;
    return bookingsForGuest(user);
  }, [user, isGuest, bookingsTick]);

  const guestTickets = useMemo(() => {
    if (!user || !isGuest) return [];
    return ticketsForGuest(user);
  }, [user, isGuest]);

  const guestSettings = useMemo(() => {
    if (!user || !isGuest) return null;
    return accountSettingsForGuest(user);
  }, [user, isGuest]);

  useEffect(() => {
    if (!user || !isGuest) return;
    const guest = user;
    let cancelled = false;

    async function loadGuestProfile() {
      const keys = resolveGuestKeys(guest);
      for (const key of keys) {
        const server = await fetchGuestBookingsFromServer(key);
        if (server?.length) {
          mergeServerGuestBookings(server.map((b) => ({ ...b, guestId: b.guestId || key })));
        }
      }
      if (!cancelled) setBookingsTick((n) => n + 1);

      let found: GuestVerificationRequest | null = findGuestVerificationLocal(guest);
      if (shouldUseSharedGuestVerification()) {
        for (const key of keys) {
          try {
            const fromApi = await fetchGuestVerificationFromApi(key);
            if (fromApi) {
              found = fromApi;
              break;
            }
          } catch {
            // try next key
          }
        }
      }
      if (!cancelled) setVerification(found);
    }

    void loadGuestProfile();
    return () => {
      cancelled = true;
    };
  }, [user, isGuest]);

  function flash(text: string) {
    setMessage(text);
    setTimeout(() => setMessage(""), 3000);
  }

  async function handleApproveGuestDocs() {
    if (!verification || !user) return;
    try {
      if (shouldUseSharedGuestVerification()) {
        const saved = await reviewGuestVerificationToApi(
          verification.userId,
          "verified",
          reviewNote
        );
        setVerification(saved);
      } else {
        setVerification({
          ...verification,
          status: "verified",
          reviewedAt: new Date().toISOString(),
          reviewNote: reviewNote.trim() || undefined,
        });
      }
      verify(user.id);
      setReviewNote("");
      flash("Guest ID documents approved.");
    } catch {
      flash("Could not approve guest verification.");
    }
  }

  async function handleRejectGuestDocs() {
    if (!verification) return;
    try {
      if (shouldUseSharedGuestVerification()) {
        const saved = await reviewGuestVerificationToApi(
          verification.userId,
          "rejected",
          reviewNote || "Documents were not accepted."
        );
        setVerification(saved);
      } else {
        setVerification({
          ...verification,
          status: "rejected",
          reviewedAt: new Date().toISOString(),
          reviewNote: reviewNote.trim() || "Documents were not accepted.",
        });
      }
      setReviewNote("");
      flash("Guest verification rejected.");
    } catch {
      flash("Could not reject guest verification.");
    }
  }

  if (users.length > 0 && !user) {
    return (
      <AdminDashboardShell>
        <div className="bg-white rounded-2xl border p-8 text-center max-w-lg">
          <h2 className="text-lg font-bold text-gray-900 mb-2">User not found</h2>
          <p className="text-sm text-gray-500 mb-4">
            This user may have been removed or the link is invalid.
          </p>
          <Link href="/admin/users" className="text-green-700 font-semibold text-sm hover:underline">
            Back to Users
          </Link>
        </div>
      </AdminDashboardShell>
    );
  }

  if (!user) {
    return (
      <AdminDashboardShell>
        <div className="bg-white rounded-2xl border p-8 text-center text-sm text-gray-400">
          Loading user details…
        </div>
      </AdminDashboardShell>
    );
  }

  const isHost = user.roles.includes("host");
  const isAdmin = user.roles.includes("admin");
  const openTickets = guestTickets.filter(
    (t) => t.status === "open" || t.status === "in_progress"
  ).length;

  return (
    <AdminDashboardShell>
      <div className="space-y-6">
        <div>
          <Link
            href="/admin/users"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-700 hover:underline mb-3"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> User Management
          </Link>

          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-green-100 flex items-center justify-center shrink-0">
                <User className="w-6 h-6 text-green-700" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-bold text-gray-900 font-display">{user.name}</h2>
                  <span
                    className={cn(
                      "text-[10px] font-bold px-2 py-0.5 rounded-full capitalize",
                      STATUS_STYLES[user.status]
                    )}
                  >
                    {user.status}
                  </span>
                  {isGuest && verification && (
                    <span
                      className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-full capitalize",
                        VERIFY_STATUS_STYLES[verification.status]
                      )}
                    >
                      ID {verification.status}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 font-mono mt-1 truncate">{user.id}</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {user.roles.map((r) => (
                    <span
                      key={r}
                      className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-full capitalize",
                        ROLE_STYLES[r] ?? "bg-gray-100 text-gray-600"
                      )}
                    >
                      {r}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {user.status === "pending" && (
                <button
                  type="button"
                  onClick={() => {
                    verify(user.id);
                    flash(`${user.name} has been verified.`);
                  }}
                  className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg font-medium"
                >
                  Verify account
                </button>
              )}
              {user.status === "suspended" ? (
                <button
                  type="button"
                  onClick={() => {
                    unsuspend(user.id);
                    flash(`${user.name} has been reinstated.`);
                  }}
                  className="text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg font-medium"
                >
                  Reinstate
                </button>
              ) : (
                !isAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      if (!confirm(`Suspend ${user.name}? They will lose platform access.`)) {
                        return;
                      }
                      suspend(user.id);
                      flash(`${user.name} has been suspended.`);
                    }}
                    className="text-xs border border-red-200 hover:bg-red-50 text-red-600 px-3 py-1.5 rounded-lg font-medium"
                  >
                    Suspend
                  </button>
                )
              )}
              {isHost && (
                <Link
                  href={`/admin/hosts/${encodeURIComponent(user.id)}`}
                  className="inline-flex items-center gap-1 text-xs border border-gray-300 hover:border-green-400 text-gray-600 px-3 py-1.5 rounded-lg font-medium"
                >
                  <Home className="w-3.5 h-3.5" /> Host panel
                </Link>
              )}
            </div>
          </div>
        </div>

        {message && (
          <p className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2">
            {message}
          </p>
        )}

        {isGuest && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white rounded-2xl border p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                Bookings
              </p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{guestBookings.length}</p>
            </div>
            <div className="bg-white rounded-2xl border p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                Open tickets
              </p>
              <p className="text-2xl font-bold text-amber-600 mt-1">{openTickets}</p>
            </div>
            <div className="bg-white rounded-2xl border p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                ID status
              </p>
              <p className="text-sm font-bold text-gray-900 mt-2 capitalize">
                {verification?.status ?? "none"}
              </p>
            </div>
            <div className="bg-white rounded-2xl border p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                Notifications
              </p>
              <p className="text-sm font-medium text-gray-700 mt-2">
                {guestSettings?.emailNotifications ? "Email on" : "Email off"}
                {" · "}
                {guestSettings?.smsNotifications ? "SMS on" : "SMS off"}
              </p>
            </div>
          </div>
        )}

        <section className="bg-white rounded-2xl border p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-900">
            {isGuest ? "Guest profile" : "Account details"}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2 text-gray-700">
              <Mail className="w-4 h-4 text-gray-400 shrink-0" />
              {user.email}
            </div>
            {user.phone ? (
              <div className="flex items-center gap-2 text-gray-700">
                <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                {user.phone}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-gray-400">
                <Phone className="w-4 h-4 shrink-0" />
                No phone on file
              </div>
            )}
            <div className="flex items-center gap-2 text-gray-700">
              <Shield className="w-4 h-4 text-gray-400 shrink-0" />
              Joined {formatJoinedAt(user.joinedAt)}
            </div>
            {isHost && stats && (
              <div className="flex items-center gap-2 text-gray-700">
                <BedDouble className="w-4 h-4 text-gray-400 shrink-0" />
                {stats.total} listings · {stats.active} live · {stats.pending} pending
              </div>
            )}
            {user.adminNote && (
              <p className="sm:col-span-2 text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
                <span className="font-semibold text-gray-700">Admin note: </span>
                {user.adminNote}
              </p>
            )}
          </div>
        </section>

        {isGuest && (
          <>
            <section className="bg-white rounded-2xl border p-5 space-y-4">
              <div className="flex items-center gap-2">
                <BadgeCheck className="w-4 h-4 text-blue-500" />
                <h3 className="text-sm font-semibold text-gray-900">ID verification</h3>
              </div>
              {!verification ? (
                <p className="text-sm text-gray-500">
                  This guest has not submitted ID documents yet.
                </p>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-full capitalize",
                        VERIFY_STATUS_STYLES[verification.status]
                      )}
                    >
                      {verification.status}
                    </span>
                    <span className="text-xs text-gray-500">
                      {guestIdTypeLabel(verification.idType)} · submitted{" "}
                      {new Date(verification.submittedAt).toLocaleString()}
                    </span>
                  </div>
                  {verification.notes && (
                    <p className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
                      {verification.notes}
                    </p>
                  )}
                  {verification.reviewNote && (
                    <p className="text-xs text-gray-500">
                      Review note: {verification.reviewNote}
                    </p>
                  )}
                  {verification.status === "pending" && (
                    <div className="space-y-3 pt-1">
                      <textarea
                        value={reviewNote}
                        onChange={(e) => setReviewNote(e.target.value)}
                        rows={2}
                        placeholder="Optional review note…"
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => void handleApproveGuestDocs()}
                          className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg font-medium"
                        >
                          Approve ID
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleRejectGuestDocs()}
                          className="text-xs border border-red-200 hover:bg-red-50 text-red-600 px-3 py-1.5 rounded-lg font-medium"
                        >
                          Reject ID
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </section>

            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-gray-500" />
                <h3 className="text-sm font-semibold text-gray-900">
                  Bookings ({guestBookings.length})
                </h3>
              </div>
              {guestBookings.length === 0 ? (
                <div className="bg-white rounded-2xl border p-6 text-center text-sm text-gray-400">
                  No bookings for this guest yet.
                </div>
              ) : (
                <div className="bg-white rounded-2xl border divide-y">
                  {guestBookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="px-4 py-3 flex items-center justify-between gap-3 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">{booking.property}</p>
                        <p className="text-xs text-gray-400 truncate">
                          {booking.id} · {booking.checkIn} → {booking.checkOut} · {booking.total}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full capitalize",
                          BOOKING_STATUS_STYLES[booking.status] ?? "bg-gray-100 text-gray-600"
                        )}
                      >
                        {booking.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <Headphones className="w-4 h-4 text-gray-500" />
                <h3 className="text-sm font-semibold text-gray-900">
                  Support tickets ({guestTickets.length})
                </h3>
              </div>
              {guestTickets.length === 0 ? (
                <div className="bg-white rounded-2xl border p-6 text-center text-sm text-gray-400">
                  No support tickets from this guest.
                </div>
              ) : (
                <div className="bg-white rounded-2xl border divide-y">
                  {guestTickets.map((ticket) => (
                    <Link
                      key={ticket.id}
                      href={`/admin/support?ticket=${encodeURIComponent(ticket.id)}`}
                      className="px-4 py-3 flex items-center justify-between gap-3 text-sm hover:bg-gray-50 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">{ticket.subject}</p>
                        <p className="text-xs text-gray-400 truncate">
                          {ticket.id}
                          {ticket.bookingRef ? ` · ${ticket.bookingRef}` : ""}
                          {ticket.property ? ` · ${ticket.property}` : ""}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full capitalize",
                          TICKET_STATUS_STYLES[ticket.status] ?? "bg-gray-100 text-gray-600"
                        )}
                      >
                        {ticket.status.replace("_", " ")}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        {isHost && (
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-gray-900">
                Host listings ({hostListings.length})
              </h3>
              <Link
                href={`/admin/hosts/${encodeURIComponent(user.id)}`}
                className="text-xs font-semibold text-green-700 hover:underline"
              >
                Open host details
              </Link>
            </div>

            {hostListings.length === 0 ? (
              <div className="bg-white rounded-2xl border p-6 text-center text-sm text-gray-400">
                No listings for this host yet.
              </div>
            ) : (
              <div className="bg-white rounded-2xl border divide-y">
                {hostListings.map((listing) => (
                  <div
                    key={listing.id}
                    className="px-4 py-3 flex items-center justify-between gap-3 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 truncate">{listing.title}</p>
                      <p className="text-xs text-gray-400 truncate">
                        {listing.district}, {listing.state}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full capitalize",
                        listing.status === "approved"
                          ? "bg-green-100 text-green-700"
                          : listing.status === "pending"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-red-100 text-red-700"
                      )}
                    >
                      {listing.status === "approved" ? "live" : listing.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </AdminDashboardShell>
  );
}
