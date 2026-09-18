"use client";

import { useEffect, useMemo, useState } from "react";
import {
  HelpCircle,
  LifeBuoy,
  Loader2,
  Ticket,
} from "lucide-react";
import { useRouter } from "@/i18n/routing";
import { useAuth } from "@/components/providers/auth-provider";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { GUEST_NAV } from "@/lib/guest/guest-nav";
import { useGuestSupport } from "@/lib/guest/use-guest-support";
import {
  fetchGuestBookingsFromServer,
  loadGuestBookings,
  type GuestBookingSummary,
} from "@/lib/guest/guest-bookings-data";
import { cn } from "@/lib/utils";

export function GuestSupportContent() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const guestId = user?.id;
  const { data, ready, submitTicket } = useGuestSupport(guestId, {
    guestName: user?.fullName,
    guestEmail: user?.email,
  });
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [bookingRef, setBookingRef] = useState("");
  const [flash, setFlash] = useState("");
  const [bookings, setBookings] = useState<GuestBookingSummary[]>([]);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [loading, user, router]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!user?.id) {
        setBookings(loadGuestBookings());
        return;
      }
      const server = await fetchGuestBookingsFromServer(user.id);
      if (!cancelled) setBookings(server?.length ? server : loadGuestBookings());
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const bookingOptions = useMemo(
    () =>
      bookings.filter((b) =>
        ["pending", "confirmed", "completed", "cancelled", "expired"].includes(b.status)
      ),
    [bookings]
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;
    const booking = bookingOptions.find((b) => b.id === bookingRef);
    submitTicket({
      subject,
      message,
      bookingRef: booking?.bookingReference || bookingRef || undefined,
      property: booking?.property,
    });
    setSubject("");
    setMessage("");
    setBookingRef("");
    setFlash("Ticket submitted. Our team will respond within 24 hours.");
    setTimeout(() => setFlash(""), 4000);
  }

  if (loading || !ready || !user || !data) {
    return (
      <DashboardShell title="Guest" subtitle="Support" tone="client" navItems={GUEST_NAV}>
        <div className="flex items-center justify-center min-h-[320px]">
          <Loader2 className="w-8 h-8 animate-spin text-green-600" />
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell title="Guest" subtitle="Support" tone="client" navItems={GUEST_NAV}>
      <div className="space-y-6 max-w-3xl">
        <div>
          <h2 className="text-xl font-bold text-gray-900 font-display">Support</h2>
          <p className="text-gray-500 text-sm mt-1">
            Raise a ticket about a booking or your account. Platform support sees the same
            thread in admin.
          </p>
        </div>

        {flash && (
          <div className="bg-green-50 border border-green-200 text-green-800 text-sm rounded-xl px-4 py-3">
            {flash}
          </div>
        )}

        <section className="bg-white rounded-2xl border p-5 space-y-3">
          <div className="flex items-center gap-2">
            <LifeBuoy className="w-4 h-4 text-green-700" />
            <h3 className="text-sm font-semibold text-gray-900">Need help with a stay?</h3>
          </div>
          <p className="text-sm text-gray-600">
            For a specific booking, message the host from My Bookings first. Use a support
            ticket for payment issues, refunds, or when you need the platform team.
          </p>
        </section>

        <section className="bg-white rounded-2xl border p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Ticket className="w-4 h-4 text-green-700" />
            <h3 className="text-sm font-semibold text-gray-900">Raise a ticket</h3>
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            <label className="block">
              <span className="text-xs font-medium text-gray-600 mb-1 block">
                Related booking (optional)
              </span>
              <select
                value={bookingRef}
                onChange={(e) => setBookingRef(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
              >
                <option value="">No booking</option>
                {bookingOptions.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.bookingReference || b.id} · {b.property} · {b.checkIn} → {b.checkOut} ({b.status})
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-medium text-gray-600 mb-1 block">Subject</span>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Refund for cancelled stay"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-gray-600 mb-1 block">Message</span>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                rows={4}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Describe your issue…"
              />
            </label>
            <button
              type="submit"
              className="bg-green-700 hover:bg-green-800 text-white font-semibold px-5 py-2.5 rounded-xl text-sm"
            >
              Submit ticket
            </button>
          </form>
        </section>

        {data.tickets.length > 0 && (
          <section className="bg-white rounded-2xl border p-5 space-y-4">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-green-700" />
              <h3 className="text-sm font-semibold text-gray-900">Your tickets</h3>
            </div>
            <ul className="space-y-2">
              {data.tickets.map((t) => (
                <li
                  key={t.id}
                  className="border border-gray-100 rounded-xl px-4 py-3 flex items-start justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{t.subject}</p>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{t.message}</p>
                    {(t.bookingRef || t.property) && (
                      <p className="text-[11px] text-gray-400 mt-1">
                        {[t.property, t.bookingRef].filter(Boolean).join(" · ")}
                      </p>
                    )}
                    <p className="text-[11px] text-gray-400 mt-1">
                      {new Date(t.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "text-[10px] font-bold px-2 py-0.5 rounded-full capitalize shrink-0",
                      t.status === "resolved"
                        ? "bg-green-50 text-green-700"
                        : t.status === "in_progress"
                          ? "bg-amber-50 text-amber-700"
                          : "bg-gray-100 text-gray-700"
                    )}
                  >
                    {t.status.replace("_", " ")}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </DashboardShell>
  );
}
