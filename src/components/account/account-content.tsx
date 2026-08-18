"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Link, useRouter } from "@/i18n/routing";
import { useSearchParams } from "next/navigation";
import {
  Calendar,
  Heart,
  LogOut,
  MapPin,
  Loader2,
  Clock,
  MessageSquare,
  Ban,
} from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { useAuth } from "@/components/providers/auth-provider";
import { getInitials } from "@/lib/auth/types";
import { GUEST_BOOKINGS, getFavoriteIds } from "@/lib/mock/guest-data";
import { STAYS } from "@/lib/mock/data";
import { formatAmount } from "@/lib/utils";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { GUEST_NAV } from "@/lib/guest/guest-nav";
import {
  loadGuestAccountSettings,
  saveGuestAccountSettings,
  type GuestAccountSettings,
} from "@/lib/guest/guest-account-settings";
import {
  GUEST_BOOKINGS_SYNC_EVENT,
  fetchGuestBookingsFromServer,
  loadGuestBookings,
  mergeServerGuestBookings,
  type GuestBookingSummary,
} from "@/lib/guest/guest-bookings-data";
import { BookingMessageThread } from "@/components/booking/booking-message-thread";
import { StayReviewForm } from "@/components/booking/stay-review-form";
import { appendBookingMessage, loadBookingMessages } from "@/lib/booking/booking-messages-data";
import { guestHasStayed, getReviewForBooking } from "@/lib/booking/stay-reviews-data";
import { getHostBookingRecord } from "@/lib/host/host-booking-data";
import {
  cancelGuestBooking,
  previewGuestCancelRefund,
} from "@/lib/guest/cancel-guest-booking";

type Tab = "profile" | "bookings" | "favorites" | "settings";

const STATUS_STYLES = {
  confirmed: "bg-green-100 text-green-700",
  pending: "bg-amber-100 text-amber-700",
  cancelled: "bg-red-100 text-red-700",
  completed: "bg-blue-100 text-blue-700",
  expired: "bg-gray-100 text-gray-600",
  declined: "bg-red-100 text-red-700",
};

function tabFromSearch(tab: string | null): Tab {
  if (tab === "bookings" || tab === "favorites" || tab === "settings") return tab;
  return "profile";
}

export function AccountContent() {
  const t = useTranslations("account");
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading, signOut, updateProfile, isDemo } = useAuth();

  const tab = tabFromSearch(searchParams.get("tab"));
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [language] = useState<"en">("en");
  const [settings, setSettings] = useState<GuestAccountSettings>({
    emailNotifications: true,
    smsNotifications: false,
  });
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [liveBookings, setLiveBookings] = useState<GuestBookingSummary[]>([]);
  const [openThreadId, setOpenThreadId] = useState<string | null>(
    () => searchParams.get("booking") || null
  );
  const [cancelBookingId, setCancelBookingId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelBusy, setCancelBusy] = useState(false);
  const [cancelError, setCancelError] = useState("");

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (user) {
      setFullName(user.fullName);
      setPhone(user.phone ?? "");
      setSettings(loadGuestAccountSettings(user.id));
    }
  }, [user]);

  useEffect(() => {
    setFavoriteIds(getFavoriteIds());
  }, [tab]);

  useEffect(() => {
    let cancelled = false;
    async function refreshBookings() {
      if (user?.id) {
        const server = await fetchGuestBookingsFromServer(user.id);
        if (!cancelled && server) {
          mergeServerGuestBookings(server);
        }
      }
      if (!cancelled) setLiveBookings(loadGuestBookings());
      // Seed demo thread for the disputed sample booking once
      if (loadBookingMessages("GF-A8K2X1").length === 0) {
        appendBookingMessage({
          bookingId: "GF-A8K2X1",
          senderRole: "guest",
          senderId: "guest-demo",
          senderName: "Priya Sharma",
          body: "Hi — the pool in the photos was closed when we arrived. Can we get help with a partial refund?",
        });
        appendBookingMessage({
          bookingId: "GF-A8K2X1",
          senderRole: "host",
          senderId: "host-demo",
          senderName: "Ahmed Al Farsi",
          body: "Sorry about that — pool maintenance was scheduled. Happy to discuss a partial refund.",
        });
      }
    }
    void refreshBookings();
    function onSync() {
      setLiveBookings(loadGuestBookings());
    }
    window.addEventListener(GUEST_BOOKINGS_SYNC_EVENT, onSync);
    return () => {
      cancelled = true;
      window.removeEventListener(GUEST_BOOKINGS_SYNC_EVENT, onSync);
    };
  }, [user?.id]);

  const bookings = useMemo(() => {
    const map = new Map<string, GuestBookingSummary>();
    // Seed sample trips only in demo mode when this guest has no real bookings yet
    const hasOwnLive = liveBookings.some(
      (b) => !b.guestId || b.guestId === user?.id
    );
    if (isDemo && !hasOwnLive) {
      for (const b of GUEST_BOOKINGS) {
        map.set(b.id, {
          id: b.id,
          listingId: (b as { listingId?: string }).listingId || "1",
          property: b.property,
          location: b.location,
          img: b.img,
          checkIn: b.checkIn,
          checkOut: b.checkOut,
          status: b.status,
          total: b.total,
          bookedAt: b.checkIn,
          guestId: user?.id,
        });
      }
    }
    for (const b of liveBookings) {
      // Prefer this guest’s trips; drop orphan local rows from other accounts
      if (b.guestId && user?.id && b.guestId !== user.id) continue;
      map.set(b.id, b);
    }
    // Prefer host-side completed status when guest mirror lags
    return Array.from(map.values()).map((b) => {
      const host = getHostBookingRecord(b.id);
      if (host?.status === "completed" && b.status !== "completed") {
        return { ...b, status: "completed", listingId: host.listingId || b.listingId };
      }
      return b;
    });
  }, [liveBookings, isDemo, user?.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  if (!user) return null;

  const userId = user.id;
  const favorites = STAYS.filter((s) => favoriteIds.includes(s.id));

  async function handleSignOut() {
    await signOut();
    router.push("/");
  }

  async function handleSaveProfile() {
    setSavingProfile(true);
    setProfileMessage("");
    try {
      const result = await updateProfile({ fullName, phone, language });
      if (result.error) throw new Error(result.error);
      setProfileMessage("Profile saved.");
      setTimeout(() => setProfileMessage(""), 2500);
    } catch (err) {
      setProfileMessage(err instanceof Error ? err.message : "Could not save profile.");
    } finally {
      setSavingProfile(false);
    }
  }

  function patchSettings(next: GuestAccountSettings) {
    setSettings(next);
    saveGuestAccountSettings(userId, next);
  }

  async function handleGuestCancel(booking: GuestBookingSummary) {
    if (!cancelReason.trim()) return;
    setCancelBusy(true);
    setCancelError("");
    const result = await cancelGuestBooking({
      booking,
      reason: cancelReason.trim(),
    });
    setCancelBusy(false);
    if (!result.ok) {
      setCancelError(result.error || "Could not cancel booking");
      return;
    }
    setCancelBookingId(null);
    setCancelReason("");
    if (user?.id) {
      const server = await fetchGuestBookingsFromServer(user.id);
      if (server) mergeServerGuestBookings(server);
    }
    setLiveBookings(loadGuestBookings());
  }

  return (
    <DashboardShell title="Guest" subtitle="Your account" navItems={GUEST_NAV}>
      <div className="space-y-6">
        <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="w-16 h-16 bg-green-700 rounded-full flex items-center justify-center text-white text-xl font-bold shrink-0">
            {getInitials(user.fullName)}
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900 font-display">{user.fullName}</h1>
            <p className="text-gray-500 text-sm">{user.email}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              {user.roles.map((role) => (
                <span
                  key={role}
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-50 text-green-700 capitalize"
                >
                  {role}
                </span>
              ))}
              {isDemo && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
                  Demo
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            className="flex items-center gap-1.5 text-sm text-red-600 hover:text-red-700 font-medium border border-red-200 hover:border-red-300 px-4 py-2 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" /> {t("signOut")}
          </button>
        </div>

        {tab === "profile" && (
          <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] p-6">
            <h2 className="font-bold text-gray-900 mb-4 font-display">{t("profileTitle")}</h2>
            <div className="space-y-4 max-w-md">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {t("fullName")}
                </label>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {t("email")}
                </label>
                <input
                  value={user.email}
                  disabled
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-gray-50 text-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {t("phone")}
                </label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="+971 50 123 4567"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {t("language")}
                </label>
                <p className="w-full border border-gray-100 bg-gray-50 rounded-lg px-3 py-2.5 text-sm text-gray-700">
                  English
                </p>
              </div>
              <button
                type="button"
                onClick={() => void handleSaveProfile()}
                disabled={savingProfile}
                className="bg-green-700 hover:bg-green-800 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors disabled:opacity-50"
              >
                {savingProfile ? "Saving…" : "Save profile"}
              </button>
              {profileMessage && (
                <p className="text-xs text-gray-500">{profileMessage}</p>
              )}
            </div>
          </div>
        )}

        {tab === "bookings" && (
          <div className="space-y-4">
            <h2 className="font-bold text-gray-900 font-display">{t("bookingsTitle")}</h2>
            {bookings.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] p-8 text-center text-gray-500 text-sm">
                {t("noBookings")}
              </div>
            ) : (
              bookings.map((b) => (
                <div key={b.id} className="space-y-3">
                  <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] p-4 flex gap-4">
                    <div className="relative w-24 h-20 rounded-xl overflow-hidden shrink-0 bg-gray-100">
                      {b.img ? (
                        <Image
                          src={b.img}
                          alt={b.property}
                          fill
                          className="object-cover"
                          sizes="96px"
                        />
                      ) : null}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-semibold text-gray-900 text-sm">{b.property}</h3>
                          <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                            <MapPin className="w-3 h-3" /> {b.location}
                          </div>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize shrink-0 ${
                            STATUS_STYLES[b.status as keyof typeof STATUS_STYLES] ||
                            "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {b.status}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {b.checkIn} → {b.checkOut}
                        </span>
                        <span className="font-semibold text-green-700">{b.total}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setOpenThreadId((id) => (id === b.id ? null : b.id))
                        }
                        className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-green-700 hover:underline"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        {openThreadId === b.id ? "Hide messages" : "Message host"}
                      </button>
                      {(b.status === "pending" || b.status === "confirmed") && (
                        <button
                          type="button"
                          onClick={() => {
                            setCancelBookingId((id) => (id === b.id ? null : b.id));
                            setCancelReason("");
                            setCancelError("");
                          }}
                          className="mt-3 ml-3 inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 hover:underline"
                        >
                          <Ban className="w-3.5 h-3.5" />
                          {cancelBookingId === b.id ? "Close" : "Cancel stay"}
                        </button>
                      )}
                    </div>
                  </div>
                  {cancelBookingId === b.id &&
                    (b.status === "pending" || b.status === "confirmed") && (
                      <div className="bg-white rounded-2xl border border-red-100 p-4 space-y-3">
                        <p className="text-sm text-gray-700">
                          {previewGuestCancelRefund(b).summary}
                        </p>
                        <textarea
                          value={cancelReason}
                          onChange={(e) => setCancelReason(e.target.value)}
                          rows={2}
                          placeholder="Reason for cancelling…"
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                        />
                        {cancelError && (
                          <p className="text-xs text-red-600">{cancelError}</p>
                        )}
                        <button
                          type="button"
                          disabled={!cancelReason.trim() || cancelBusy}
                          onClick={() => void handleGuestCancel(b)}
                          className="bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-50"
                        >
                          {cancelBusy ? "Cancelling…" : "Confirm cancel"}
                        </button>
                      </div>
                    )}
                  {(guestHasStayed(b) || getReviewForBooking(b.id)) && (
                    <StayReviewForm
                      bookingId={b.id}
                      listingId={b.listingId || "1"}
                      property={b.property}
                      authorId={user.id}
                      authorName={user.fullName}
                      hostId={getHostBookingRecord(b.id)?.hostId}
                      bookingHint={{
                        status: b.status,
                        listingId: b.listingId,
                        property: b.property,
                        checkOut: b.checkOut,
                      }}
                    />
                  )}
                  {openThreadId === b.id && (
                    <BookingMessageThread
                      bookingId={b.id}
                      viewerRole="guest"
                      viewerId={user.id}
                      viewerName={user.fullName}
                      title="Messages with host"
                      subtitle={`${b.property} · booking ${b.id}`}
                      compact
                    />
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {tab === "favorites" && (
          <div className="space-y-4">
            <h2 className="font-bold text-gray-900 font-display">{t("favoritesTitle")}</h2>
            {favorites.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] p-8 text-center">
                <Heart className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm mb-4">{t("noFavorites")}</p>
                <Link href="/search" className="text-green-700 font-semibold text-sm hover:underline">
                  {t("browseStays")}
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {favorites.map((stay) => (
                  <Link
                    key={stay.id}
                    href={`/listing/${stay.id}`}
                    className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] overflow-hidden hover:shadow-md transition-shadow group"
                  >
                    <div className="relative h-36">
                      <Image
                        src={stay.img}
                        alt={stay.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        sizes="50vw"
                      />
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-gray-800 text-sm">
                        {stay.name}
                      </h3>
                      <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                        <MapPin className="w-3 h-3" />
                        {stay.location}
                      </div>
                      <div className="text-green-700 font-bold text-sm mt-2">
                        AED {formatAmount(stay.price)} / night
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "settings" && (
          <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] p-6 space-y-4">
            <h2 className="font-bold text-gray-900 font-display">{t("settingsTitle")}</h2>
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div>
                <div className="text-sm font-medium text-gray-800">{t("emailNotifications")}</div>
                <div className="text-xs text-gray-500">{t("emailNotificationsDesc")}</div>
              </div>
              <input
                type="checkbox"
                checked={settings.emailNotifications}
                onChange={(e) =>
                  patchSettings({ ...settings, emailNotifications: e.target.checked })
                }
                className="rounded border-gray-300 text-green-600 focus:ring-green-500"
              />
            </div>
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div>
                <div className="text-sm font-medium text-gray-800">{t("smsNotifications")}</div>
                <div className="text-xs text-gray-500">{t("smsNotificationsDesc")}</div>
              </div>
              <input
                type="checkbox"
                checked={settings.smsNotifications}
                onChange={(e) =>
                  patchSettings({ ...settings, smsNotifications: e.target.checked })
                }
                className="rounded border-gray-300 text-green-600 focus:ring-green-500"
              />
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-400 pt-2">
              <Clock className="w-3.5 h-3.5" />
              {t("memberSince")} 2026
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
