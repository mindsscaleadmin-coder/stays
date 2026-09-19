"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  Camera,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/components/providers/auth-provider";
import { getInitials } from "@/lib/auth/types";
import { FAVORITES_SYNC_EVENT, GUEST_BOOKINGS, getFavoriteIds } from "@/lib/mock/guest-data";
import { usePublicListings } from "@/lib/listings/use-public-listings";
import { formatPrice } from "@/lib/utils";
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
  invalidateGuestBookingsCache,
  loadGuestBookings,
  mergeServerGuestBookings,
  type GuestBookingSummary,
} from "@/lib/guest/guest-bookings-data";
import { BookingMessageThread } from "@/components/booking/booking-message-thread";
import { StayReviewForm } from "@/components/booking/stay-review-form";
import { getHostBookingRecord } from "@/lib/host/host-booking-data";
import {
  appendBookingMessage,
  BOOKING_MESSAGES_SYNC_EVENT,
  loadBookingMessages,
} from "@/lib/booking/booking-messages-data";
import { guestHasStayed, getReviewForBooking } from "@/lib/booking/stay-reviews-data";
import { loadHostBookings } from "@/lib/host/host-booking-data";
import {
  cancelGuestBooking,
  previewGuestCancelRefund,
} from "@/lib/guest/cancel-guest-booking";

type Tab = "profile" | "bookings" | "messages" | "favorites" | "settings";

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const AVATAR_MAX_EDGE = 512;

function readAvatarFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.onload = () => {
      const dataUrl = String(reader.result ?? "");
      const img = new window.Image();
      img.onload = () => {
        const scale = Math.min(1, AVATAR_MAX_EDGE / Math.max(img.naturalWidth, img.naturalHeight, 1));
        if (scale >= 1 && file.size < 400_000) {
          resolve(dataUrl);
          return;
        }
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(dataUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const mime = file.type === "image/png" ? "image/png" : "image/jpeg";
        resolve(canvas.toDataURL(mime, 0.86));
      };
      img.onerror = () => reject(new Error("Invalid image"));
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}

const STATUS_STYLES = {
  confirmed: "bg-green-100 text-green-700",
  pending: "bg-amber-100 text-amber-700",
  cancelled: "bg-red-100 text-red-700",
  completed: "bg-blue-100 text-blue-700",
  expired: "bg-gray-100 text-gray-600",
  declined: "bg-red-100 text-red-700",
};

function tabFromSearch(tab: string | null): Tab {
  if (
    tab === "bookings" ||
    tab === "messages" ||
    tab === "favorites" ||
    tab === "settings"
  ) {
    return tab;
  }
  return "profile";
}

function formatMessageWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AccountContent() {
  const t = useTranslations("account");
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading, signOut, updateProfile, isDemo } = useAuth();
  const tab = tabFromSearch(searchParams.get("tab"));
  const { listings: publicListings } = usePublicListings(undefined, {
    enabled: tab === "favorites",
  });
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

  useEffect(() => {
    const fromUrl = searchParams.get("booking");
    if (fromUrl) setOpenThreadId(fromUrl);
  }, [searchParams]);
  const [cancelBookingId, setCancelBookingId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelBusy, setCancelBusy] = useState(false);
  const [cancelError, setCancelError] = useState("");
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  const [messagesTick, setMessagesTick] = useState(0);
  const avatarInputRef = useRef<HTMLInputElement>(null);

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
    function refreshFavorites() {
      setFavoriteIds(getFavoriteIds());
    }
    refreshFavorites();
    window.addEventListener(FAVORITES_SYNC_EVENT, refreshFavorites);
    window.addEventListener("storage", refreshFavorites);
    return () => {
      window.removeEventListener(FAVORITES_SYNC_EVENT, refreshFavorites);
      window.removeEventListener("storage", refreshFavorites);
    };
  }, [tab]);

  useEffect(() => {
    if (tab !== "bookings" && tab !== "messages") return;

    let cancelled = false;
    // Paint cached/local bookings immediately; refresh from the server in the
    // background so changing guest tabs never waits on the network.
    setLiveBookings(loadGuestBookings());

    async function refreshBookings() {
      if (user?.id) {
        const server = await fetchGuestBookingsFromServer(user.id);
        if (!cancelled && server) {
          mergeServerGuestBookings(server);
          setLiveBookings(loadGuestBookings());
        }
      }
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
  }, [user?.id, tab]);

  useEffect(() => {
    function onMessagesSync() {
      setMessagesTick((tick) => tick + 1);
    }
    window.addEventListener(BOOKING_MESSAGES_SYNC_EVENT, onMessagesSync);
    window.addEventListener("storage", onMessagesSync);
    return () => {
      window.removeEventListener(BOOKING_MESSAGES_SYNC_EVENT, onMessagesSync);
      window.removeEventListener("storage", onMessagesSync);
    };
  }, []);

  const bookings = useMemo(() => {
    const hostById = new Map(loadHostBookings().map((h) => [h.id, h]));
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
      const host = hostById.get(b.id);
      if (host?.status === "completed" && b.status !== "completed") {
        return { ...b, status: "completed", listingId: host.listingId || b.listingId };
      }
      return b;
    });
  }, [liveBookings, isDemo, user?.id]);

  const messageThreads = useMemo(() => {
    void messagesTick;
    return bookings
      .map((b) => {
        const messages = loadBookingMessages(b.id);
        if (messages.length === 0) return null;
        const lastMessage = messages[messages.length - 1]!;
        return { booking: b, lastMessage };
      })
      .filter((row): row is { booking: GuestBookingSummary; lastMessage: ReturnType<typeof loadBookingMessages>[number] } => row !== null)
      .sort(
        (a, b) =>
          new Date(b.lastMessage.createdAt).getTime() -
          new Date(a.lastMessage.createdAt).getTime()
      );
  }, [bookings, messagesTick]);

  const bookingsWithoutMessages = useMemo(() => {
    const withMessages = new Set(messageThreads.map((thread) => thread.booking.id));
    return bookings.filter((b) => !withMessages.has(b.id));
  }, [bookings, messageThreads]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  if (!user) return null;

  const userId = user.id;
  const favorites = publicListings.filter((s) => favoriteIds.includes(s.id));
  const activeMessageBooking = openThreadId
    ? bookings.find((b) => b.id === openThreadId)
    : undefined;

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
      invalidateGuestBookingsCache(user.id);
      const server = await fetchGuestBookingsFromServer(user.id, true);
      if (server) mergeServerGuestBookings(server);
    }
    setLiveBookings(loadGuestBookings());
  }

  async function handleAvatarChange(file: File | null) {
    if (!file || !user) return;
    setAvatarError("");
    if (!file.type.startsWith("image/")) {
      setAvatarError("Please choose a PNG or JPG image.");
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setAvatarError("Image must be 2 MB or smaller.");
      return;
    }
    setAvatarBusy(true);
    try {
      const dataUrl = await readAvatarFile(file);
      const result = await updateProfile({ avatarUrl: dataUrl });
      if (result.error) setAvatarError(result.error);
    } catch {
      setAvatarError("Could not process that image.");
    } finally {
      setAvatarBusy(false);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    }
  }

  async function removeAvatar() {
    if (!user) return;
    setAvatarBusy(true);
    setAvatarError("");
    try {
      const result = await updateProfile({ avatarUrl: undefined });
      if (result.error) setAvatarError(result.error);
    } finally {
      setAvatarBusy(false);
    }
  }

  return (
    <DashboardShell
      title="Guest"
      subtitle="Your account"
      tone="client"
      navItems={GUEST_NAV}
      guestTab={searchParams.get("tab")}
    >
      <div className="space-y-6">
        <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex items-center gap-3 shrink-0">
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => void handleAvatarChange(e.target.files?.[0] ?? null)}
            />
            <button
              type="button"
              disabled={avatarBusy}
              onClick={() => avatarInputRef.current?.click()}
              className="relative w-16 h-16 rounded-full overflow-hidden bg-green-700 flex items-center justify-center text-white text-xl font-bold shrink-0 group focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-60"
              aria-label={user.avatarUrl ? "Change profile photo" : "Upload profile photo"}
            >
              {user.avatarUrl ? (
                <Image
                  src={user.avatarUrl}
                  alt=""
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                getInitials(user.fullName)
              )}
              <span className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                {avatarBusy ? (
                  <Loader2 className="w-5 h-5 animate-spin text-white" />
                ) : (
                  <Camera className="w-5 h-5 text-white" />
                )}
              </span>
            </button>
            <div className="min-w-0">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={avatarBusy}
                  onClick={() => avatarInputRef.current?.click()}
                  className="text-xs font-semibold text-green-700 hover:text-green-800 disabled:opacity-50"
                >
                  {user.avatarUrl ? "Change photo" : "Upload photo"}
                </button>
                {user.avatarUrl ? (
                  <button
                    type="button"
                    disabled={avatarBusy}
                    onClick={() => void removeAvatar()}
                    className="text-xs font-semibold text-red-600 hover:text-red-700 disabled:opacity-50"
                  >
                    Remove
                  </button>
                ) : null}
              </div>
              <p className="text-[11px] text-gray-500 mt-1">Square JPG/PNG · max 2 MB</p>
              {avatarError ? <p className="text-[11px] text-red-600 mt-1">{avatarError}</p> : null}
            </div>
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
                  {(b.status === "completed" ||
                    b.status === "confirmed" ||
                    guestHasStayed(b) ||
                    getReviewForBooking(b.id)) && (
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
                      subtitle={`${b.property} · booking ${b.bookingReference || b.id}`}
                      compact
                    />
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {tab === "messages" && (
          <div className="space-y-4">
            <div>
              <h2 className="font-bold text-gray-900 font-display">{t("messagesTitle")}</h2>
              <p className="text-sm text-gray-500 mt-1">{t("messagesSubtitle")}</p>
            </div>

            {messageThreads.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] p-8 text-center">
                <MessageSquare className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">
                  {bookings.length === 0 ? t("noMessagesNoBookings") : t("noMessages")}
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border divide-y divide-gray-50">
                {messageThreads.map(({ booking, lastMessage }) => {
                  const selected = openThreadId === booking.id;
                  return (
                    <button
                      key={booking.id}
                      type="button"
                      onClick={() =>
                        setOpenThreadId((id) => (id === booking.id ? null : booking.id))
                      }
                      className={`w-full text-start p-5 transition-colors ${
                        selected ? "bg-green-50/60" : "hover:bg-gray-50/80"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-gray-900">{booking.property}</p>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                                STATUS_STYLES[booking.status as keyof typeof STATUS_STYLES] ||
                                "bg-gray-100 text-gray-600"
                              }`}
                            >
                              {booking.status}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {booking.checkIn} → {booking.checkOut}
                            {booking.bookingReference
                              ? ` · ${booking.bookingReference}`
                              : ""}
                          </p>
                          <p className="text-sm text-gray-700 mt-2 line-clamp-2">
                            {lastMessage.body}
                          </p>
                        </div>
                        <div className="shrink-0 text-end">
                          <time className="text-[11px] text-gray-400">
                            {formatMessageWhen(lastMessage.createdAt)}
                          </time>
                          <p className="text-[10px] font-semibold mt-1 text-gray-500 capitalize">
                            {lastMessage.senderRole === "guest" ? "You" : lastMessage.senderRole}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {bookingsWithoutMessages.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-800">
                  {messageThreads.length > 0 ? "Other bookings" : "Your bookings"}
                </h3>
                {bookingsWithoutMessages.map((b) => (
                  <div
                    key={b.id}
                    className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] p-4 flex gap-4"
                  >
                    <div className="relative w-20 h-16 rounded-xl overflow-hidden shrink-0 bg-gray-100">
                      {b.img ? (
                        <Image
                          src={b.img}
                          alt={b.property}
                          fill
                          className="object-cover"
                          sizes="80px"
                        />
                      ) : null}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 text-sm">{b.property}</h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {b.checkIn} → {b.checkOut}
                      </p>
                      <button
                        type="button"
                        onClick={() =>
                          setOpenThreadId((id) => (id === b.id ? null : b.id))
                        }
                        className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-green-700 hover:underline"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        {openThreadId === b.id ? t("hideMessages") : t("messageHost")}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {openThreadId && (
              <BookingMessageThread
                bookingId={openThreadId}
                viewerRole="guest"
                viewerId={userId}
                viewerName={user.fullName}
                title="Messages with host"
                subtitle={
                  activeMessageBooking
                    ? `${activeMessageBooking.property} · booking ${
                        activeMessageBooking.bookingReference || openThreadId
                      }`
                    : undefined
                }
              />
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
                        {formatPrice(stay.price, stay.currency)} / night
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
